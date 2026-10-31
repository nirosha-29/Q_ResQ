"""QUBO (Quadratic Unconstrained Binary Optimization) formulation for Q-ResQ.

Converts the constrained emergency ambulance-hospital assignment problem
into an Ising/QUBO Hamiltonian matrix for quantum processing.
"""

from typing import List, Dict, Any, Tuple
import numpy as np


class QUBOMapping:
    def __init__(
        self,
        emergencies: List[Dict[str, Any]],
        ambulances: List[Dict[str, Any]],
        hospitals: List[Dict[str, Any]],
        cost_matrix: Dict[Tuple[str, str, str], float]
    ):
        self.emergencies = emergencies
        self.ambulances = ambulances
        self.hospitals = hospitals
        self.cost_matrix = cost_matrix

        # Generate variable indices x(e, a, h)
        self.var_keys: List[Tuple[str, str, str]] = []
        self.var_to_index: Dict[Tuple[str, str, str], int] = {}
        
        idx = 0
        for e in emergencies:
            for a in ambulances:
                for h in hospitals:
                    key = (e["id"], a["id"], h["id"])
                    self.var_keys.append(key)
                    self.var_to_index[key] = idx
                    idx += 1
                    
        self.num_variables = idx

    def build_qubo_matrix(
        self,
        penalty_ambulance_conflict: float = 350.0,
        penalty_emergency_unserved: float = 250.0
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        """Constructs the square symmetric QUBO matrix Q such that Objective = x^T Q x.
        
        Variables x_i in {0, 1}.
        For x_i^2 = x_i, linear objective and quadratic penalties combine into Q.
        """
        n = self.num_variables
        if n == 0:
            return np.zeros((0, 0)), {}

        Q = np.zeros((n, n), dtype=float)

        # 1. Reward serving each emergency, offset by its assignment cost.
        for key, i in self.var_to_index.items():
            cost = self.cost_matrix.get(key, 50.0)
            Q[i, i] += cost - penalty_emergency_unserved

        # 2. Penalty: Ambulance conflict (Ambulance 'a' cannot serve multiple emergencies)
        # For each ambulance a: (sum_{e, h} x(e, a, h))^2
        # = sum x(e, a, h)^2 + 2 sum_{i < j} x_i x_j
        for a in self.ambulances:
            a_id = a["id"]
            a_indices = [
                self.var_to_index[(e["id"], a_id, h["id"])]
                for e in self.emergencies
                for h in self.hospitals
                if (e["id"], a_id, h["id"]) in self.var_to_index
            ]
            for i in range(len(a_indices)):
                idx_i = a_indices[i]
                for j in range(i + 1, len(a_indices)):
                    idx_j = a_indices[j]
                    # Quadratic cross term penalty for assigning same ambulance to multiple emergencies
                    Q[idx_i, idx_j] += penalty_ambulance_conflict
                    Q[idx_j, idx_i] += penalty_ambulance_conflict

        # 3. Penalty: Emergency multiple service (Emergency 'e' receives at most 1 ambulance)
        for e in self.emergencies:
            e_id = e["id"]
            e_indices = [
                self.var_to_index[(e_id, a["id"], h["id"])]
                for a in self.ambulances
                for h in self.hospitals
                if (e_id, a["id"], h["id"]) in self.var_to_index
            ]
            for i in range(len(e_indices)):
                idx_i = e_indices[i]
                for j in range(i + 1, len(e_indices)):
                    idx_j = e_indices[j]
                    conflict_penalty = 2.0 * penalty_emergency_unserved
                    Q[idx_i, idx_j] += conflict_penalty
                    Q[idx_j, idx_i] += conflict_penalty

        qubo_details = {
            "num_qubits": n,
            "variable_mapping": [
                {"qubit": i, "variable": f"x({k[0]}, {k[1]}, {k[2]})"}
                for i, k in enumerate(self.var_keys)
            ],
            "penalty_ambulance_conflict": penalty_ambulance_conflict,
            "penalty_emergency_conflict": 2.0 * penalty_emergency_unserved,
            "reward_per_served_emergency": penalty_emergency_unserved,
            "density": float(np.count_nonzero(Q)) / float(n * n) if n > 0 else 0.0
        }

        return Q, qubo_details
