"""Candidate matching and scoring engine for ambulances and hospitals.

Calculates suitability scores, capability compatibility matrices,
and human-readable selection reasons based on actual resource attributes.
"""

from typing import List, Dict, Any, Tuple
from app.models.ambulance import Ambulance
from app.models.hospital import Hospital
from app.models.emergency import Emergency, EmergencyRequirement


class MatchingEngine:
    @staticmethod
    def has_dispatchable_crew(ambulance: Ambulance) -> bool:
        on_duty_roles = {
            member.role for member in ambulance.crew_members or []
            if member.shift_status == "On-Duty"
        }
        has_driver = "Driver" in on_duty_roles
        has_medical_staff = bool(
            on_duty_roles.intersection({
                "EMT", "Paramedic", "Critical Care Paramedic", "Doctor", "Nurse",
            })
        )
        return has_driver and has_medical_staff

    @staticmethod
    def evaluate_ambulance(
        ambulance: Ambulance,
        emergency: Emergency,
        distance_km: float,
        eta_minutes: float
    ) -> Tuple[float, List[str]]:
        """Evaluates ambulance fitness for a specific emergency.
        
        Returns (suitability_score [0..100], list_of_reasons).
        """
        score = 100.0
        reasons: List[str] = []

        # 1. Availability check
        if ambulance.availability != "Available":
            score -= 60.0
            reasons.append(f"Status is '{ambulance.availability}' (not immediately idle)")
        else:
            reasons.append("Currently available for immediate dispatch")

        # 2. ETA & Distance penalty
        if eta_minutes <= 8.0:
            reasons.append(f"Rapid response ETA ({eta_minutes:.1f} mins, {distance_km:.1f} km)")
        elif eta_minutes <= 15.0:
            score -= 10.0
            reasons.append(f"Acceptable urban response ETA ({eta_minutes:.1f} mins)")
        else:
            score -= min(40.0, (eta_minutes - 15.0) * 2.0)
            reasons.append(f"Extended response ETA ({eta_minutes:.1f} mins)")

        # 3. Required capabilities match
        req = emergency.requirements
        req_caps = req.capabilities if req else []
        amb_caps = ambulance.capabilities or []
        
        missing_caps = [c for c in req_caps if c not in amb_caps]
        if not missing_caps:
            if req_caps:
                score += 10.0
                reasons.append(f"Matches required capabilities: {', '.join(req_caps)}")
        else:
            score -= len(missing_caps) * 20.0
            reasons.append(f"Lacks specific capabilities: {', '.join(missing_caps)}")

        # 4. Equipment match
        req_equip = req.equipment if req else []
        amb_equip = ambulance.equipment or []
        matched_equip = [e for e in req_equip if e in amb_equip]
        missing_equip = [e for e in req_equip if e not in amb_equip]

        if matched_equip:
            reasons.append(f"Equipped with: {', '.join(matched_equip)}")
        if missing_equip:
            score -= len(missing_equip) * 15.0
            reasons.append(f"Missing recommended equipment: {', '.join(missing_equip)}")

        # 5. Vehicle type alignment
        if emergency.calculated_priority == "CRITICAL" and ambulance.vehicle_type in ["ALS", "Critical Care", "Cardiac"]:
            score += 15.0
            reasons.append(f"High-tier vehicle type ({ambulance.vehicle_type}) aligned with Critical priority")

        # 6. Crew evaluation
        crew = ambulance.crew_members or []
        crew_roles = [cm.role for cm in crew if cm.shift_status == "On-Duty"]
        if not MatchingEngine.has_dispatchable_crew(ambulance):
            score = 0.0
            reasons.append("No on-duty driver and qualified medical crew are available")
        if any(r in ["Doctor", "Paramedic", "Critical Care Paramedic"] for r in crew_roles):
            score += 10.0
            reasons.append(f"Advanced medical crew on board ({', '.join(set(crew_roles))})")

        final_score = max(5.0, min(100.0, score))
        return round(final_score, 1), reasons

    @staticmethod
    def evaluate_hospital(
        hospital: Hospital,
        emergency: Emergency,
        distance_km: float,
        eta_minutes: float
    ) -> Tuple[float, List[str]]:
        """Evaluates hospital suitability for a specific emergency.
        
        Returns (suitability_score [0..100], list_of_reasons).
        """
        score = 100.0
        reasons: List[str] = []

        # 1. Emergency Department status
        if hospital.emergency_department_status == "Open":
            reasons.append("Emergency Department is fully open and receiving patients")
        elif hospital.emergency_department_status == "Full":
            score -= 30.0
            reasons.append("Emergency Department reports high load / near capacity")
        else:
            score -= 60.0
            reasons.append(f"Emergency Department is {hospital.emergency_department_status}")

        # 2. Distance and transit time
        if eta_minutes <= 12.0:
            reasons.append(f"Close proximity ({eta_minutes:.1f} mins transport, {distance_km:.1f} km)")
        elif eta_minutes <= 25.0:
            score -= 10.0
            reasons.append(f"Moderate transit distance ({eta_minutes:.1f} mins transport)")
        else:
            score -= min(35.0, (eta_minutes - 25.0) * 1.5)
            reasons.append(f"Long transit duration ({eta_minutes:.1f} mins transport)")

        # 3. Clinical specialty matching
        hosp_caps = hospital.capabilities or []
        e_type = emergency.emergency_type.lower()
        
        specialty_needed = None
        if "cardiac" in e_type:
            specialty_needed = "Cardiology"
        elif "trauma" in e_type or "accident" in e_type:
            specialty_needed = "Trauma"
        elif "stroke" in e_type:
            specialty_needed = "Stroke"
        elif "respiratory" in e_type:
            specialty_needed = "Respiratory Care"
        elif "pediatric" in e_type:
            specialty_needed = "Pediatric"
        elif "burn" in e_type:
            specialty_needed = "Burn Care"

        if specialty_needed:
            if specialty_needed in hosp_caps:
                score += 15.0
                reasons.append(f"Specialized {specialty_needed} department available")
            else:
                score -= 25.0
                reasons.append(f"Lacks specialized {specialty_needed} facility")

        # 4. ICU bed capacity for Critical emergencies
        if emergency.calculated_priority == "CRITICAL":
            if "ICU" in hosp_caps and hospital.available_icu_beds > 0:
                score += 15.0
                reasons.append(f"ICU capacity verified ({hospital.available_icu_beds} ICU beds currently vacant)")
            elif "ICU" in hosp_caps:
                reasons.append("ICU facility present (real-time bed availability unverified or tight)")
            else:
                score -= 30.0
                reasons.append("No designated Intensive Care Unit (ICU)")

        # 5. Data confidence
        if hospital.data_freshness_status == "Live integration unavailable":
            reasons.append("Public registry verified; live occupancy telemetry unavailable")

        final_score = max(10.0, min(100.0, score))
        return round(final_score, 1), reasons
