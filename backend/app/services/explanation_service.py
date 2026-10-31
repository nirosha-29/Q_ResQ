"""Natural language explanation generator for dispatch allocations and alternatives."""

from typing import List, Dict, Any


class ExplanationService:
    @staticmethod
    def generate_plan_explanation(
        ambulance_id: str,
        ambulance_reasons: List[str],
        hospital_name: str,
        hospital_reasons: List[str],
        emergency_priority: str,
        is_scarcity: bool = False,
        unserved_count: int = 0
    ) -> str:
        """Constructs an explainable summary of the mathematical optimization choice."""
        amb_summary = ambulance_reasons[0] if ambulance_reasons else f"Ambulance {ambulance_id} dispatched."
        hosp_summary = hospital_reasons[0] if hospital_reasons else f"Transporting to {hospital_name}."

        scarcity_note = ""
        if is_scarcity and unserved_count > 0:
            scarcity_note = (
                f" RESOURCE SCARCITY ACTIVE: Resource capacity constrained. "
                f"Ambulance allocated to this higher priority ({emergency_priority}) emergency over {unserved_count} unserved/delayed lower priority request(s)."
            )

        explanation = (
            f"Recommended allocation assigns Ambulance {ambulance_id} and {hospital_name}. "
            f"{amb_summary}. {hosp_summary}."
            f"{scarcity_note}"
        )
        return explanation
