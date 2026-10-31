"""Unit tests for PriorityEngine."""

from app.services.priority_engine import PriorityEngine


def test_cardiac_arrest_critical_priority():
    priority, score, explanation = PriorityEngine.calculate_priority(
        emergency_type="Cardiac",
        reported_severity="Critical",
        symptoms="Patient in sudden cardiac arrest, unconscious, not breathing",
        patient_count=1,
        required_capabilities=["ALS", "Cardiac"]
    )
    assert priority == "CRITICAL"
    assert score >= 80.0
    assert "critical" in explanation.lower() or "cardiac" in explanation.lower()


def test_moderate_respiratory_priority():
    priority, score, explanation = PriorityEngine.calculate_priority(
        emergency_type="Respiratory",
        reported_severity="Moderate",
        symptoms="Mild asthma wheezing, oxygen saturation 93%",
        patient_count=1,
        required_capabilities=["BLS"]
    )
    assert priority in ["MODERATE", "LOW"]
    assert score < 80.0
