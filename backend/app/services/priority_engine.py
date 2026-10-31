"""Explainable Priority Engine for Q-ResQ.

Calculates estimated emergency priority (CRITICAL, HIGH, MODERATE, LOW)
based on clinical symptoms, reported severity, patient vital cues,
count, and capability requirements.

Includes an explicit safety disclaimer: Decision support, not medical diagnosis.
"""

from typing import Dict, Any, Tuple, List


class PriorityEngine:
    """Deterministic, explainable clinical priority evaluator."""

    @staticmethod
    def calculate_priority(
        emergency_type: str,
        reported_severity: str,
        symptoms: str,
        patient_count: int = 1,
        required_capabilities: List[str] = None
    ) -> Tuple[str, float, str]:
        """Calculates (priority_level, score, explanation)."""
        required_capabilities = required_capabilities or []
        symptoms_lower = symptoms.lower()
        reasons: List[str] = []
        score = 15.0  # Base score

        # 1. Evaluate emergency type
        type_weights = {
            "cardiac": 35.0,
            "stroke": 34.0,
            "trauma": 30.0,
            "road accident": 30.0,
            "severe bleeding": 32.0,
            "unconscious": 35.0,
            "respiratory": 22.0,
            "seizure": 22.0,
            "burns": 20.0,
            "pediatric": 22.0,
            "pregnancy": 22.0,
            "other": 10.0
        }
        type_key = emergency_type.lower().strip()
        matched_weight = 15.0
        for key, w in type_weights.items():
            if key in type_key:
                matched_weight = max(matched_weight, w)
                reasons.append(f"Emergency classification as '{emergency_type}' indicates acute risk")
                break
        score += matched_weight

        # 2. Symptoms keyword triggers
        critical_keywords = [
            ("cardiac arrest", 35.0, "suspected cardiac arrest"),
            ("unconscious", 30.0, "unresponsiveness / loss of consciousness"),
            ("not breathing", 35.0, "apnea or cessation of breathing"),
            ("severe chest pain", 25.0, "acute substernal chest pressure"),
            ("profuse bleeding", 25.0, "massive hemorrhage / profuse bleeding"),
            ("severe bleeding", 25.0, "severe arterial or uncontrolled bleeding"),
            ("choking", 25.0, "airway compromise"),
            ("anaphylaxis", 30.0, "severe anaphylactic reaction"),
            ("cyanosis", 20.0, "bluish skin / hypoxemia indication")
        ]

        high_keywords = [
            ("shortness of breath", 15.0, "acute respiratory distress"),
            ("difficulty breathing", 15.0, "labored breathing"),
            ("head injury", 18.0, "significant head trauma"),
            ("compound fracture", 18.0, "open orthopedic trauma"),
            ("seizure", 15.0, "active neurological event"),
            ("altered mental state", 15.0, "altered cognitive status"),
            ("deep burn", 15.0, "extensive second/third degree thermal injury")
        ]

        for phrase, pts, reason in critical_keywords:
            if phrase in symptoms_lower:
                score += pts
                reasons.append(f"Reported symptom reflects {reason}")

        for phrase, pts, reason in high_keywords:
            if phrase in symptoms_lower:
                score += pts
                reasons.append(f"Reported symptom reflects {reason}")

        # 3. Reported severity boost
        sev = reported_severity.lower().strip()
        if sev == "critical":
            score += 25.0
            reasons.append("Dispatch caller/triage identified severity as Critical")
        elif sev == "high":
            score += 15.0
            reasons.append("Dispatch caller/triage identified severity as High")
        elif sev == "moderate":
            score += 5.0
        elif sev == "low":
            score -= 5.0

        # 4. Capabilities requirement impact
        if any(c in required_capabilities for c in ["ALS", "Cardiac", "Critical Care"]):
            score += 10.0
            reasons.append("Required advanced life support (ALS/Critical Care/Cardiac) protocols")

        # 5. Multi-casualty incident
        if patient_count > 1:
            score += min(15.0, patient_count * 5.0)
            reasons.append(f"Multiple casualties involved ({patient_count} patients)")

        # Normalize score between 10.0 and 100.0
        final_score = max(10.0, min(100.0, score))

        # Classify into tier
        if final_score >= 80.0:
            priority = "CRITICAL"
        elif final_score >= 60.0:
            priority = "HIGH"
        elif final_score >= 35.0:
            priority = "MODERATE"
        else:
            priority = "LOW"

        # Generate clear, professional explanation sentence
        reasons_summary = "; ".join(reasons[:3]) if reasons else "Based on clinical presentation and reported severity."
        explanation = (
            f"{priority} priority (Estimated score: {final_score:.1f}/100) because {reasons_summary.lower()}. "
            f"Decision support, not medical diagnosis."
        )

        return priority, round(final_score, 1), explanation
