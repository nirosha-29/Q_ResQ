"""Tests for ClassicalAllocationSolver and scarcity logic."""

from app.optimization.classical_solver import ClassicalAllocationSolver


def test_classical_allocation_with_scarcity():
    # 3 emergencies, 2 ambulances (scarcity bound)
    emergencies = [
        {"id": "E1", "calculated_priority": "CRITICAL", "priority_score": 95.0},
        {"id": "E2", "calculated_priority": "HIGH", "priority_score": 75.0},
        {"id": "E3", "calculated_priority": "MODERATE", "priority_score": 45.0}
    ]
    ambulances = [{"id": "A1"}, {"id": "A2"}]
    hospitals = [{"id": "H1"}]

    cost_matrix = {
        ("E1", "A1", "H1"): 10.0,
        ("E1", "A2", "H1"): 20.0,
        ("E2", "A1", "H1"): 25.0,
        ("E2", "A2", "H1"): 15.0,
        ("E3", "A1", "H1"): 40.0,
        ("E3", "A2", "H1"): 35.0
    }
    eta_matrix = {
        ("E1", "A1", "H1"): {"amb_eta": 5.0, "hosp_eta": 10.0, "total_eta": 15.0, "distance": 6.0},
        ("E1", "A2", "H1"): {"amb_eta": 12.0, "hosp_eta": 10.0, "total_eta": 22.0, "distance": 9.0},
        ("E2", "A1", "H1"): {"amb_eta": 14.0, "hosp_eta": 10.0, "total_eta": 24.0, "distance": 10.0},
        ("E2", "A2", "H1"): {"amb_eta": 6.0, "hosp_eta": 10.0, "total_eta": 16.0, "distance": 7.0},
        ("E3", "A1", "H1"): {"amb_eta": 18.0, "hosp_eta": 10.0, "total_eta": 28.0, "distance": 12.0},
        ("E3", "A2", "H1"): {"amb_eta": 15.0, "hosp_eta": 10.0, "total_eta": 25.0, "distance": 11.0}
    }

    result = ClassicalAllocationSolver.solve(
        emergencies=emergencies,
        ambulances=ambulances,
        hospitals=hospitals,
        cost_matrix=cost_matrix,
        eta_matrix=eta_matrix
    )

    # Scarcity checks:
    assert result["scarcity"] is True
    assert result["served_count"] == 2
    assert result["unserved_count"] == 1
    assert "E3" in result["unserved_emergencies"]  # E3 has lowest priority
    assert result["violations_count"] == 0


def test_classical_solver_respects_hospital_bed_and_icu_capacity():
    emergencies = [
        {
            "id": "EC",
            "calculated_priority": "CRITICAL",
            "priority_score": 95.0,
            "patient_count": 1,
            "requires_icu": True,
        },
        {
            "id": "EH",
            "calculated_priority": "HIGH",
            "priority_score": 75.0,
            "patient_count": 1,
            "requires_icu": False,
        },
    ]
    ambulances = [{"id": "A1"}, {"id": "A2"}]
    hospitals = [{"id": "H1", "available_beds": 1, "available_icu_beds": 1}]
    costs = {
        (emergency["id"], ambulance["id"], "H1"): 10.0
        for emergency in emergencies
        for ambulance in ambulances
    }

    result = ClassicalAllocationSolver.solve(
        emergencies=emergencies,
        ambulances=ambulances,
        hospitals=hospitals,
        cost_matrix=costs,
        eta_matrix={},
    )

    assert result["served_count"] == 1
    assert result["assignments"][0]["emergency_id"] == "EC"

    hospitals[0]["available_icu_beds"] = 0
    result_without_icu = ClassicalAllocationSolver.solve(
        emergencies=[emergencies[0]],
        ambulances=ambulances,
        hospitals=hospitals,
        cost_matrix=costs,
        eta_matrix={},
    )
    assert result_without_icu["served_count"] == 0
    assert result_without_icu["unserved_emergencies"] == ["EC"]
