"""Classical Optimization Engine for Q-ResQ Emergency Resource Allocation.

Implements exact Mixed-Integer Linear Programming (MILP) formulation with
support for capacity constraints, resource scarcity, and priority-weighted penalties.
"""

import time
from typing import List, Dict, Any, Tuple
import numpy as np
from scipy.optimize import milp, LinearConstraint, Bounds
from app.config import settings


class ClassicalAllocationSolver:
    @classmethod
    def solve(
        cls,
        emergencies: List[Dict[str, Any]],
        ambulances: List[Dict[str, Any]],
        hospitals: List[Dict[str, Any]],
        cost_matrix: Dict[Tuple[str, str, str], float],
        eta_matrix: Dict[Tuple[str, str, str], Dict[str, float]],
        unserved_penalty_base: float = 1000.0
    ) -> Dict[str, Any]:
        """Solves the emergency allocation problem with scarcity handling.
        
        Args:
            emergencies: list of emergency dicts
            ambulances: list of candidate ambulances
            hospitals: list of candidate hospitals
            cost_matrix: (e_id, a_id, h_id) -> cost
            eta_matrix: (e_id, a_id, h_id) -> {amb_eta, hosp_eta, total_eta, distance}
        """
        start_time = time.perf_counter()

        emergency_ids = [e["id"] for e in emergencies]
        ambulance_ids = [a["id"] for a in ambulances]
        hospital_ids = [h["id"] for h in hospitals]

        num_emergencies = len(emergency_ids)
        num_ambulances = len(ambulance_ids)
        num_hospitals = len(hospital_ids)

        # Handle edge cases
        if num_emergencies == 0:
            return {
                "objective_value": 0.0,
                "runtime_ms": 0.1,
                "served_count": 0,
                "unserved_count": 0,
                "assignments": [],
                "unserved_emergencies": [],
                "scarcity": False
            }

        # If zero ambulances are available, all emergencies are mathematically unserved
        if num_ambulances == 0:
            runtime_ms = (time.perf_counter() - start_time) * 1000.0
            return {
                "objective_value": sum(unserved_penalty_base for _ in emergencies),
                "runtime_ms": round(runtime_ms, 2),
                "served_count": 0,
                "unserved_count": num_emergencies,
                "assignments": [],
                "unserved_emergencies": emergency_ids,
                "scarcity": True,
                "scarcity_note": "No ambulances available in fleet"
            }

        # Indexing for decision variables
        # x(e, a, h): index in [0 .. num_e * num_a * num_h - 1]
        # u(e): index in [num_triplets .. num_triplets + num_e - 1]
        variable_map: Dict[Tuple[str, str, str], int] = {}
        reverse_map: Dict[int, Tuple[str, str, str]] = {}
        idx = 0

        for e_id in emergency_ids:
            for a_id in ambulance_ids:
                for h_id in hospital_ids:
                    variable_map[(e_id, a_id, h_id)] = idx
                    reverse_map[idx] = (e_id, a_id, h_id)
                    idx += 1

        num_assignment_vars = idx
        unserved_map: Dict[str, int] = {}
        for e_id in emergency_ids:
            unserved_map[e_id] = idx
            idx += 1

        total_vars = idx

        emergency_by_id = {emergency["id"]: emergency for emergency in emergencies}
        total_bed_demand = sum(
            max(1, emergency.get("patient_count", 1)) for emergency in emergencies
        )
        total_icu_demand = sum(
            max(1, emergency.get("patient_count", 1))
            for emergency in emergencies
            if emergency.get(
                "requires_icu",
                emergency.get("calculated_priority") == "CRITICAL",
            )
        )
        hospital_by_id = {hospital["id"]: hospital for hospital in hospitals}
        bed_capacities = {
            hospital_id: max(
                0,
                int(hospital_by_id[hospital_id].get("available_beds", total_bed_demand)),
            )
            for hospital_id in hospital_ids
        }
        icu_capacities = {
            hospital_id: max(
                0,
                int(hospital_by_id[hospital_id].get("available_icu_beds", total_icu_demand)),
            )
            for hospital_id in hospital_ids
        }

        # Cost vector c
        c = np.zeros(total_vars)
        lower_bounds = np.zeros(total_vars)
        upper_bounds = np.ones(total_vars)

        # 1. Assignment costs
        for (e_id, a_id, h_id), var_idx in variable_map.items():
            if (e_id, a_id, h_id) not in cost_matrix:
                upper_bounds[var_idx] = 0.0
            base_cost = cost_matrix.get((e_id, a_id, h_id), 100.0)
            c[var_idx] = base_cost

        # 2. Unserved penalties (higher penalty for CRITICAL and HIGH emergencies)
        for e in emergencies:
            e_id = e["id"]
            p_score = e.get("priority_score", 50.0)
            p_level = e.get("calculated_priority", "MODERATE")
            
            p_multiplier = 3.0 if p_level == "CRITICAL" else (2.0 if p_level == "HIGH" else 1.0)
            c[unserved_map[e_id]] = unserved_penalty_base * p_multiplier + (p_score * 5.0)

        # Constraints
        # A_eq * x = b_eq
        # Constraint 1: For each emergency e: sum_{a, h} x(e, a, h) + u(e) = 1
        num_constraints = num_emergencies + num_ambulances + (num_hospitals * 2)
        A = np.zeros((num_constraints, total_vars))
        b_l = np.zeros(num_constraints)
        b_u = np.zeros(num_constraints)

        # Rows 0 .. num_emergencies - 1
        for row, e_id in enumerate(emergency_ids):
            for a_id in ambulance_ids:
                for h_id in hospital_ids:
                    var_idx = variable_map[(e_id, a_id, h_id)]
                    A[row, var_idx] = 1.0
            A[row, unserved_map[e_id]] = 1.0
            b_l[row] = 1.0
            b_u[row] = 1.0

        # Constraint 2: For each ambulance a: sum_{e, h} x(e, a, h) <= 1
        for a_idx, a_id in enumerate(ambulance_ids):
            row = num_emergencies + a_idx
            for e_id in emergency_ids:
                for h_id in hospital_ids:
                    var_idx = variable_map[(e_id, a_id, h_id)]
                    A[row, var_idx] = 1.0
            b_l[row] = 0.0
            b_u[row] = 1.0  # At most 1 emergency per ambulance

        # Constraint 3: Hospital bed and ICU capacity.
        hospital_row_offset = num_emergencies + num_ambulances
        for hospital_idx, hospital_id in enumerate(hospital_ids):
            bed_row = hospital_row_offset + hospital_idx
            icu_row = hospital_row_offset + num_hospitals + hospital_idx
            for e_id in emergency_ids:
                emergency = emergency_by_id[e_id]
                patient_count = max(1, emergency.get("patient_count", 1))
                requires_icu = emergency.get(
                    "requires_icu",
                    emergency.get("calculated_priority") == "CRITICAL",
                )
                for a_id in ambulance_ids:
                    var_idx = variable_map[(e_id, a_id, hospital_id)]
                    A[bed_row, var_idx] = patient_count
                    if requires_icu:
                        A[icu_row, var_idx] = patient_count
            b_u[bed_row] = bed_capacities[hospital_id]
            b_u[icu_row] = icu_capacities[hospital_id]

        constraints = LinearConstraint(A, b_l, b_u)
        integrality = np.ones(total_vars)  # All variables are binary integers
        bounds = Bounds(lower_bounds, upper_bounds)

        # Solve using SciPy MILP HiGHS solver
        res = milp(c=c, integrality=integrality, constraints=constraints, bounds=bounds)

        runtime_ms = (time.perf_counter() - start_time) * 1000.0

        assignments: List[Dict[str, Any]] = []
        unserved_list: List[str] = []
        served_count = 0
        unserved_count = 0
        violations_count = 0

        if res.success:
            solution = res.x
            # Extract assigned triplets
            for var_idx in range(num_assignment_vars):
                if solution[var_idx] > 0.5:
                    e_id, a_id, h_id = reverse_map[var_idx]
                    eta_info = eta_matrix.get((e_id, a_id, h_id), {
                        "amb_eta": 10.0,
                        "hosp_eta": 12.0,
                        "total_eta": 22.0,
                        "distance": 8.0
                    })
                    assignments.append({
                        "emergency_id": e_id,
                        "ambulance_id": a_id,
                        "hospital_id": h_id,
                        "amb_eta": eta_info.get("amb_eta", 10.0),
                        "hosp_eta": eta_info.get("hosp_eta", 12.0),
                        "total_eta": eta_info.get("total_eta", 22.0),
                        "distance": eta_info.get("distance", 8.0),
                        "cost": float(c[var_idx])
                    })
                    served_count += 1

            # Extract unserved emergencies
            for e_id, var_idx in unserved_map.items():
                if solution[var_idx] > 0.5:
                    unserved_list.append(e_id)
                    unserved_count += 1
            
            objective_val = float(res.fun)
        else:
            # Fallback greedy heuristic if MILP fails
            violations_count += 1
            sorted_e = sorted(emergencies, key=lambda x: x.get("priority_score", 0), reverse=True)
            assigned_ambs = set()
            remaining_beds = dict(bed_capacities)
            remaining_icu = dict(icu_capacities)
            for e in sorted_e:
                e_id = e["id"]
                patient_count = max(1, e.get("patient_count", 1))
                requires_icu = e.get(
                    "requires_icu",
                    e.get("calculated_priority") == "CRITICAL",
                )
                best_amb = None
                best_hosp = hospital_ids[0] if hospital_ids else None
                best_cost = float("inf")
                
                for a_id in ambulance_ids:
                    if a_id in assigned_ambs:
                        continue
                    for h_id in hospital_ids:
                        if (
                            (e_id, a_id, h_id) not in cost_matrix
                            or remaining_beds[h_id] < patient_count
                            or (requires_icu and remaining_icu[h_id] < patient_count)
                        ):
                            continue
                        cost = cost_matrix[(e_id, a_id, h_id)]
                        if cost < best_cost:
                            best_cost = cost
                            best_amb = a_id
                            best_hosp = h_id
                
                if best_amb:
                    assigned_ambs.add(best_amb)
                    remaining_beds[best_hosp] -= patient_count
                    if requires_icu:
                        remaining_icu[best_hosp] -= patient_count
                    eta_info = eta_matrix.get((e_id, best_amb, best_hosp), {})
                    assignments.append({
                        "emergency_id": e_id,
                        "ambulance_id": best_amb,
                        "hospital_id": best_hosp,
                        "amb_eta": eta_info.get("amb_eta", 10.0),
                        "hosp_eta": eta_info.get("hosp_eta", 12.0),
                        "total_eta": eta_info.get("total_eta", 22.0),
                        "distance": eta_info.get("distance", 8.0),
                        "cost": best_cost
                    })
                    served_count += 1
                else:
                    unserved_list.append(e_id)
                    unserved_count += 1
            objective_val = sum(a["cost"] for a in assignments) + (unserved_count * unserved_penalty_base)

        scarcity_active = (num_emergencies > num_ambulances) or (unserved_count > 0)

        return {
            "objective_value": round(objective_val, 3),
            "runtime_ms": round(runtime_ms, 2),
            "served_count": served_count,
            "unserved_count": unserved_count,
            "violations_count": violations_count,
            "assignments": assignments,
            "unserved_emergencies": unserved_list,
            "scarcity": scarcity_active,
            "solver": "HiGHS Exact Mixed-Integer Linear Programming"
        }
