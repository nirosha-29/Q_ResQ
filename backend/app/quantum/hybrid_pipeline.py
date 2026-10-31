"""Hybrid Quantum-Classical Optimization Pipeline.

Executes classical MILP and quantum QUBO/QAOA algorithms side-by-side,
validates solution feasibility, detects resource scarcity, and formats
explainable comparative metrics.
"""

from typing import List, Dict, Any, Tuple
import numpy as np
from app.optimization.classical_solver import ClassicalAllocationSolver
from app.quantum.qubo_formulation import QUBOMapping
from app.quantum.qaoa_solver import QAOASolver


class HybridOptimizationPipeline:
    @classmethod
    def run_optimization(
        cls,
        emergencies: List[Dict[str, Any]],
        ambulances: List[Dict[str, Any]],
        hospitals: List[Dict[str, Any]],
        cost_matrix: Dict[Tuple[str, str, str], float],
        eta_matrix: Dict[Tuple[str, str, str], Dict[str, float]],
        execute_quantum: bool = True
    ) -> Dict[str, Any]:
        """Runs both classical and quantum solvers, validates solutions, and compares results."""
        # 1. Classical Optimization
        classical_result = ClassicalAllocationSolver.solve(
            emergencies=emergencies,
            ambulances=ambulances,
            hospitals=hospitals,
            cost_matrix=cost_matrix,
            eta_matrix=eta_matrix
        )

        # 2. Quantum Formulation (QUBO)
        qubo_mapping = QUBOMapping(
            emergencies=emergencies,
            ambulances=ambulances,
            hospitals=hospitals,
            cost_matrix=cost_matrix
        )
        Q_matrix, qubo_info = qubo_mapping.build_qubo_matrix()

        # 3. Quantum Execution (QAOA)
        quantum_result: Dict[str, Any] = {}
        quantum_fallback = False

        if execute_quantum and qubo_mapping.num_variables > 0 and qubo_mapping.num_variables <= 16:
            raw_quantum = QAOASolver.solve_qubo(Q=Q_matrix, p_layers=2)
            if raw_quantum.get("success"):
                bitstring = raw_quantum.get("bitstring", "")
                
                # Feasibility check on quantum bitstring
                quantum_assignments: List[Dict[str, Any]] = []
                assigned_ambs = set()
                assigned_emergencies = set()
                violations = 0
                emergency_by_id = {emergency["id"]: emergency for emergency in emergencies}
                hospital_by_id = {hospital["id"]: hospital for hospital in hospitals}
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
                remaining_beds = {
                    hospital_id: max(
                        0,
                        int(hospital_by_id[hospital_id].get("available_beds", total_bed_demand)),
                    )
                    for hospital_id in hospital_by_id
                }
                remaining_icu = {
                    hospital_id: max(
                        0,
                        int(hospital_by_id[hospital_id].get("available_icu_beds", total_icu_demand)),
                    )
                    for hospital_id in hospital_by_id
                }
                
                for idx, bit in enumerate(bitstring):
                    if bit == "1" and idx < len(qubo_mapping.var_keys):
                        e_id, a_id, h_id = qubo_mapping.var_keys[idx]
                        emergency = emergency_by_id.get(e_id)
                        patient_count = max(1, emergency.get("patient_count", 1)) if emergency else 1
                        requires_icu = bool(emergency and emergency.get(
                            "requires_icu",
                            emergency.get("calculated_priority") == "CRITICAL",
                        ))
                        if (
                            not emergency
                            or h_id not in hospital_by_id
                            or (e_id, a_id, h_id) not in cost_matrix
                            or a_id in assigned_ambs
                            or e_id in assigned_emergencies
                            or remaining_beds.get(h_id, 0) < patient_count
                            or (requires_icu and remaining_icu.get(h_id, 0) < patient_count)
                        ):
                            violations += 1
                            continue
                        assigned_ambs.add(a_id)
                        assigned_emergencies.add(e_id)
                        remaining_beds[h_id] -= patient_count
                        if requires_icu:
                            remaining_icu[h_id] -= patient_count
                        eta_info = eta_matrix.get((e_id, a_id, h_id), {})
                        quantum_assignments.append({
                            "emergency_id": e_id,
                            "ambulance_id": a_id,
                            "hospital_id": h_id,
                            "amb_eta": eta_info.get("amb_eta", 10.0),
                            "hosp_eta": eta_info.get("hosp_eta", 12.0),
                            "total_eta": eta_info.get("total_eta", 22.0),
                            "distance": eta_info.get("distance", 8.0),
                            "cost": cost_matrix[(e_id, a_id, h_id)]
                        })

                candidate_rejected = violations > 0
                if candidate_rejected:
                    quantum_assignments = []
                served_e_ids = {a["emergency_id"] for a in quantum_assignments}
                unserved = [e["id"] for e in emergencies if e["id"] not in served_e_ids]

                quantum_result = {
                    "executed": True,
                    "candidate_rejected": candidate_rejected,
                    "fallback": candidate_rejected,
                    "reason": (
                        "QAOA candidate violated assignment or hospital-capacity constraints; "
                        "the validated classical allocation remains the recommendation."
                        if candidate_rejected else None
                    ),
                    "objective_value": raw_quantum.get("best_energy", 0.0),
                    "runtime_ms": raw_quantum.get("runtime_ms", 0.0),
                    "served_count": len(quantum_assignments),
                    "unserved_count": len(unserved),
                    "violations_count": violations,
                    "assignments": quantum_assignments,
                    "unserved_emergencies": unserved,
                    "num_qubits": raw_quantum.get("qubit_count", len(bitstring)),
                    "circuit_depth": raw_quantum.get("circuit_depth", 0),
                    "circuit_gates_count": raw_quantum.get("circuit_gates_count", 0),
                    "optimal_gamma": raw_quantum.get("optimal_gamma"),
                    "optimal_beta": raw_quantum.get("optimal_beta"),
                    "details": raw_quantum
                }
                if candidate_rejected:
                    quantum_fallback = True
            else:
                quantum_fallback = True
                quantum_result = {
                    "executed": False,
                    "fallback": True,
                    "reason": raw_quantum.get("error", "Quantum circuit limits exceeded or simulation timeout"),
                    "num_qubits": qubo_mapping.num_variables
                }
        else:
            quantum_fallback = True
            quantum_result = {
                "executed": False,
                "fallback": True,
                "reason": (
                    "Quantum optimization unavailable or problem scale exceeds qubit budget (max 16). "
                    "Classical optimization used as primary fallback."
                ),
                "num_qubits": qubo_mapping.num_variables
            }

        # 4. Generate Honest Comparison Summary
        if not quantum_fallback and quantum_result.get("executed"):
            comparison_text = (
                f"Classical MILP converged in {classical_result['runtime_ms']:.1f}ms with objective {classical_result['objective_value']:.1f}. "
                f"QAOA 2-layer circuit on {quantum_result['num_qubits']} qubits completed in {quantum_result['runtime_ms']:.1f}ms "
                f"with QUBO energy {quantum_result['objective_value']:.1f} ({quantum_result['violations_count']} constraint violation(s)). "
                "QUBO energy includes assignment rewards and constraint penalties and is not directly comparable to the MILP objective."
            )
        else:
            comparison_text = (
                f"Classical MILP successfully computed allocation in {classical_result['runtime_ms']:.1f}ms. "
                "Quantum fallback was activated to guarantee deterministic, zero-violation operational safety."
            )

        return {
            "classical": classical_result,
            "quantum": quantum_result,
            "quantum_fallback_activated": quantum_fallback,
            "qubo_details": qubo_info,
            "comparison_summary": comparison_text,
            "scarcity_detected": classical_result.get("scarcity", False)
        }
