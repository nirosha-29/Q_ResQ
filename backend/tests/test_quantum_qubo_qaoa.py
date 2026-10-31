"""Tests for QUBO Formulation and QAOA Simulator."""

import numpy as np
from app.quantum.qubo_formulation import QUBOMapping
from app.quantum.qaoa_solver import QAOASolver


def test_qubo_mapping_dimensions():
    emergencies = [{"id": "E1"}, {"id": "E2"}]
    ambulances = [{"id": "A1"}, {"id": "A2"}]
    hospitals = [{"id": "H1"}]

    cost_matrix = {
        ("E1", "A1", "H1"): 10.0,
        ("E1", "A2", "H1"): 20.0,
        ("E2", "A1", "H1"): 15.0,
        ("E2", "A2", "H1"): 12.0
    }

    mapping = QUBOMapping(emergencies, ambulances, hospitals, cost_matrix)
    assert mapping.num_variables == 4

    Q, details = mapping.build_qubo_matrix()
    assert Q.shape == (4, 4)
    assert details["num_qubits"] == 4


def test_qubo_rewards_service_and_penalizes_conflicting_assignments():
    emergencies = [{"id": "E1"}]
    ambulances = [{"id": "A1"}, {"id": "A2"}]
    hospitals = [{"id": "H1"}]
    cost_matrix = {
        ("E1", "A1", "H1"): 10.0,
        ("E1", "A2", "H1"): 20.0
    }

    mapping = QUBOMapping(emergencies, ambulances, hospitals, cost_matrix)
    Q, details = mapping.build_qubo_matrix()

    assert Q[0, 0] == -240.0
    assert Q[1, 1] == -230.0
    assert Q[0, 1] + Q[1, 0] == 1000.0
    assert details["reward_per_served_emergency"] == 250.0


def test_qaoa_execution():
    # 2x2 small QUBO test problem
    Q = np.array([
        [-5.0, 10.0],
        [10.0, -8.0]
    ])
    result = QAOASolver.solve_qubo(Q=Q, p_layers=1, max_qubits=8)
    assert result["success"] is True
    assert len(result["bitstring"]) == 2
    assert result["runtime_ms"] > 0.0
