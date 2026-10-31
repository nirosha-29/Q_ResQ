"""Demo scenario and real facility seed data for Q-ResQ."""

from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.config import settings
from app.models.user import AuthCredential, User
from app.models.emergency import Emergency, EmergencyRequirement
from app.models.ambulance import Ambulance, CrewMember
from app.models.hospital import Hospital
from app.models.data_source import DataSource, AuditLog
from app.services.auth_service import hash_password


class DemoProvider:
    HACKATHON_HOSPITAL_IDS = ("H001", "H002", "H003")

    @classmethod
    def seed_initial_data(cls, db: Session):
        """Seeds standard operational baseline if database is empty."""
        # 1. Seed demo users
        if db.query(User).count() == 0 and settings.ENVIRONMENT.lower() != "production":
            users = [
                User(id=1, username="dispatcher1", full_name="Officer Rajesh Kumar", email="rajesh.kumar@ems.blr.gov.in", role="Dispatcher"),
                User(id=2, username="coordinator1", full_name="Dr. Sneha Hegde", email="sneha.h@manipal.hosp.in", role="Hospital Coordinator"),
                User(id=3, username="admin1", full_name="Systems Administrator", email="admin@qresq.blr.gov.in", role="Administrator")
            ]
            db.add_all(users)
            db.commit()

        if settings.DEMO_PASSWORD and settings.ENVIRONMENT.lower() != "production":
            for user in db.query(User).all():
                credential = db.query(AuthCredential).filter(
                    AuthCredential.user_id == user.id
                ).first()
                if not credential:
                    db.add(AuthCredential(
                        user_id=user.id,
                        password_hash=hash_password(settings.DEMO_PASSWORD),
                    ))
            db.commit()

        # 2. Seed Data Sources Registry
        if db.query(DataSource).count() == 0:
            sources = [
                DataSource(
                    id="OSM-FACILITIES",
                    name="OpenStreetMap Public Healthcare Registry",
                    data_type="Hospitals & Clinical Facilities",
                    provider="OpenStreetMap Contributors / Overpass API",
                    status="OPERATIONAL",
                    record_count=184,
                    coverage_area="Bengaluru Urban & Rural Districts",
                    verification_status="Public Open Data (ODbL License)",
                    is_real=True,
                    notes="Public geo-spatial nodes and polygons for verified hospitals."
                ),
                DataSource(
                    id="OSRM-ROUTING",
                    name="Project OSRM Routing Engine",
                    data_type="Network Travel Distance & Driving Time",
                    provider="Open Source Routing Machine (FOSSGIS)",
                    status="OPERATIONAL",
                    record_count=12000,
                    coverage_area="Karnataka Road Infrastructure",
                    verification_status="Algorithmic Shortest-Path / OSM Roads",
                    is_real=True,
                    notes="Driving route geometry and distance. Real-time traffic unavailable (uses static road network speed profile)."
                ),
                DataSource(
                    id="ABDM-HFR",
                    name="ABDM Health Facility Registry (HFR)",
                    data_type="Accredited Hospital Infrastructure",
                    provider="National Health Authority (NHA) / ABDM",
                    status="DEGRADED",
                    record_count=72,
                    coverage_area="Bengaluru Metropolitan Region",
                    verification_status="Government Verified Facility Registry",
                    is_real=True,
                    notes="Hospital registration and specialty profiles. Live telemetry integration currently unavailable."
                ),
                DataSource(
                    id="SIMULATED-FLEET",
                    name="Q-ResQ Fleet Telemetry Simulator",
                    data_type="Emergency Vehicle Telemetry & Availability",
                    provider="QUBITNOVA Simulation Environment",
                    status="OPERATIONAL",
                    record_count=15,
                    coverage_area="Bengaluru South, Central & North Sectors",
                    verification_status="Controlled Demo Data",
                    is_real=False,
                    notes="Synthetic ambulance telemetry, GPS breadcrumbs, and crew duty rosters for hackathon evaluation."
                )
            ]
            db.add_all(sources)
            db.commit()

        # 3. Seed Realistic Hospitals (Real locations & names in Bengaluru)
        if db.query(Hospital).count() == 0:
            hospitals = [
                Hospital(
                    id="H001",
                    name="Manipal Hospital - Old Airport Road",
                    address="98, HAL Old Airport Rd, Kodihalli, Bengaluru",
                    city="Bengaluru",
                    state="Karnataka",
                    pin="560017",
                    latitude=12.9592,
                    longitude=77.6534,
                    operational_status="Active",
                    emergency_department_status="Open",
                    total_bed_capacity=600,
                    icu_capacity=80,
                    current_occupancy=480,
                    available_beds=120,
                    available_icu_beds=14,
                    capabilities=["Emergency Department", "ICU", "Cardiology", "Trauma", "Stroke", "Surgery", "Critical Care", "Respiratory Care"],
                    source="OpenStreetMap / ABDM Public Registry",
                    data_freshness_status="Live integration unavailable",
                    verification_status="Verified Public Entity",
                    is_demo=0
                ),
                Hospital(
                    id="H002",
                    name="Victoria Hospital & BMCRI Emergency Trauma Centre",
                    address="Fort Road, near City Market, Kalasipalya, Bengaluru",
                    city="Bengaluru",
                    state="Karnataka",
                    pin="560002",
                    latitude=12.9634,
                    longitude=77.5753,
                    operational_status="Active",
                    emergency_department_status="Open",
                    total_bed_capacity=1000,
                    icu_capacity=120,
                    current_occupancy=850,
                    available_beds=150,
                    available_icu_beds=18,
                    capabilities=["Emergency Department", "ICU", "Trauma", "Surgery", "Burn Care", "Critical Care", "Orthopedics"],
                    source="Government of Karnataka Healthcare Directory",
                    data_freshness_status="Live integration unavailable",
                    verification_status="Verified Government Tertiary Care",
                    is_demo=0
                ),
                Hospital(
                    id="H003",
                    name="Narayana Institute of Cardiac Sciences",
                    address="258/A, Bommasandra Industrial Area, Anekal Taluk, Bengaluru",
                    city="Bengaluru",
                    state="Karnataka",
                    pin="560099",
                    latitude=12.8225,
                    longitude=77.6890,
                    operational_status="Active",
                    emergency_department_status="Open",
                    total_bed_capacity=500,
                    icu_capacity=90,
                    current_occupancy=410,
                    available_beds=90,
                    available_icu_beds=12,
                    capabilities=["Emergency Department", "ICU", "Cardiology", "Critical Care", "Pediatric", "Surgery", "Respiratory Care"],
                    source="ABDM Facility Registry / OSM",
                    data_freshness_status="Live integration unavailable",
                    verification_status="Verified Cardiac Specialty Center",
                    is_demo=0
                ),
                Hospital(
                    id="H004",
                    name="Aster CMI Hospital - Hebbal",
                    address="No. 43/42, NH 44, Sahakar Nagar, Hebbal, Bengaluru",
                    city="Bengaluru",
                    state="Karnataka",
                    pin="560092",
                    latitude=13.0614,
                    longitude=77.5928,
                    operational_status="Active",
                    emergency_department_status="Open",
                    total_bed_capacity=500,
                    icu_capacity=70,
                    current_occupancy=390,
                    available_beds=110,
                    available_icu_beds=9,
                    capabilities=["Emergency Department", "ICU", "Cardiology", "Trauma", "Stroke", "Pediatric", "Neonatal", "Critical Care"],
                    source="OpenStreetMap",
                    data_freshness_status="Live integration unavailable",
                    verification_status="Verified Hospital",
                    is_demo=0
                ),
                Hospital(
                    id="H005",
                    name="Indira Gandhi Institute of Child Health (IGICH)",
                    address="South Hospital Complex, Dharmaram College Post, Bengaluru",
                    city="Bengaluru",
                    state="Karnataka",
                    pin="560029",
                    latitude=12.9328,
                    longitude=77.5960,
                    operational_status="Active",
                    emergency_department_status="Open",
                    total_bed_capacity=400,
                    icu_capacity=50,
                    current_occupancy=320,
                    available_beds=80,
                    available_icu_beds=6,
                    capabilities=["Emergency Department", "ICU", "Pediatric", "Neonatal", "Critical Care", "Surgery"],
                    source="Government of Karnataka Healthcare Directory",
                    data_freshness_status="Live integration unavailable",
                    verification_status="Verified Pediatric Tertiary Care",
                    is_demo=0
                )
            ]
            db.add_all(hospitals)
            db.commit()

        # 4. Seed Baseline Ambulances
        if db.query(Ambulance).count() == 0:
            amb1 = Ambulance(
                id="A001",
                provider="GVK EMRI 108 Karnataka EMS",
                vehicle_number="KA-01-EA-1081",
                vehicle_type="ALS",
                base_location="Indiranagar Fire & Emergency Post",
                current_location_name="100 Feet Road, Indiranagar",
                latitude=12.9719,
                longitude=77.6412,
                operational_status="Active",
                availability="Available",
                capabilities=["BLS", "ALS", "Cardiac", "Critical Care"],
                equipment=["Oxygen", "Defibrillator", "ECG", "Ventilator", "Patient Monitor", "ALS Kit"],
                data_source="SIMULATED",
                verification_status="Verified Dispatch Unit",
                is_demo=1
            )
            crew1 = [
                CrewMember(ambulance_id="A001", name="Suresh Gowda", role="Driver", qualification="Heavy Vehicle Emergency Driving Cert", certification="EVOC Level 2", shift_status="On-Duty", is_demo=1),
                CrewMember(ambulance_id="A001", name="Pooja Sharma", role="Critical Care Paramedic", qualification="B.Sc. Emergency Medical Technology", certification="ACLS, BLS, ITLS", shift_status="On-Duty", capabilities=["Cardiac", "ALS", "Intubation"], is_demo=1)
            ]

            amb2 = Ambulance(
                id="A002",
                provider="Bengaluru Trauma Rescue Network",
                vehicle_number="KA-04-TR-2045",
                vehicle_type="BLS",
                base_location="Jayanagar General Hospital Base",
                current_location_name="4th Block, Jayanagar",
                latitude=12.9284,
                longitude=77.5834,
                operational_status="Active",
                availability="Available",
                capabilities=["BLS", "Trauma", "Respiratory"],
                equipment=["Oxygen", "Suction", "Trauma Kit", "Patient Monitor"],
                data_source="SIMULATED",
                verification_status="Verified Dispatch Unit",
                is_demo=1
            )
            crew2 = [
                CrewMember(ambulance_id="A002", name="Mohan Das", role="Driver", qualification="Commercial EMS Driver License", certification="EVOC Level 1", shift_status="On-Duty", is_demo=1),
                CrewMember(ambulance_id="A002", name="Kiran Kumar", role="EMT", qualification="EMT Intermediate Diploma", certification="BLS, ITLS", shift_status="On-Duty", capabilities=["Trauma", "BLS", "Splinting"], is_demo=1)
            ]

            db.add(amb1)
            db.add(amb2)
            db.commit()
            for c in crew1 + crew2:
                db.add(c)
            db.commit()

    @classmethod
    def load_hackathon_scenario(cls, db: Session):
        """Loads the exact Hackathon Demo Scenario (Section 12):
        - 3 simultaneous emergencies: E001 (Critical Cardiac), E002 (High Priority Trauma), E003 (Moderate Respiratory)
        - 2 ambulances: A001 (ALS Cardiac) & A002 (BLS Trauma)
        - 3 hospitals: H001, H002, H003
        - Clears old demo allocations to demonstrate live optimization from scratch.
        """
        # Ensure base data is present
        cls.seed_initial_data(db)

        # 1. Reset Ambulances to exact demo specifications
        db.query(Ambulance).filter(Ambulance.id.in_(["A001", "A002"])).update(
            {"availability": "Available", "operational_status": "Active"},
            synchronize_session=False
        )

        # Make sure other ambulances are Busy for this scenario to enforce Scarcity
        db.query(Ambulance).filter(~Ambulance.id.in_(["A001", "A002"])).update(
            {"availability": "Busy"},
            synchronize_session=False
        )
        db.commit()

        # 2. Clear old demo records cleanly
        for eid in ["E001", "E002", "E003"]:
            from app.models.dispatch import Dispatch
            from app.models.allocation import Allocation
            db.query(Dispatch).filter(Dispatch.emergency_id == eid).delete(synchronize_session=False)
            db.query(Allocation).filter(Allocation.emergency_id == eid).delete(synchronize_session=False)
            db.query(EmergencyRequirement).filter(EmergencyRequirement.emergency_id == eid).delete(synchronize_session=False)
            db.query(Emergency).filter(Emergency.id == eid).delete(synchronize_session=False)
        db.commit()

        # 3. Create the 3 simultaneous emergencies
        # E001: Critical Cardiac Emergency (near Koramangala)
        e1 = Emergency(
            id="E001",
            patient_id="PT-2026-901",
            patient_name="Anand Varma",
            patient_age=58,
            patient_gender="Male",
            patient_count=1,
            emergency_type="Cardiac",
            symptoms="Severe crushing retrosternal chest pain radiating to left jaw, diaphoresis, shortness of breath",
            reported_severity="Critical",
            additional_notes="Patient has history of hypertension. Family reports acute collapse 5 minutes ago.",
            address="Sony World Junction, 80 Feet Road, Koramangala 4th Block, Bengaluru",
            latitude=12.9345,
            longitude=77.6265,
            calculated_priority="CRITICAL",
            priority_score=94.5,
            priority_explanation="CRITICAL priority (Score: 94.5/100) because emergency classification as 'Cardiac' indicates acute life-threat; reported symptoms include severe chest pain and diaphoresis; required ALS protocols. Immediate ALS response indicated.",
            status="Awaiting Allocation",
            is_demo=1
        )
        req1 = EmergencyRequirement(
            emergency_id="E001",
            capabilities=["ALS", "Cardiac", "Critical Care"],
            equipment=["Defibrillator", "ECG", "Oxygen", "Patient Monitor"]
        )

        # E002: High Priority Trauma Emergency (near MG Road)
        e2 = Emergency(
            id="E002",
            patient_id="PT-2026-902",
            patient_name="Priyanka Sen",
            patient_age=29,
            patient_gender="Female",
            patient_count=1,
            emergency_type="Road Accident",
            symptoms="Two-wheeler collision with open femur fracture, active profuse bleeding, alert but tachycardia",
            reported_severity="High",
            additional_notes="Helmet worn, no loss of consciousness, compound orthopedic wound.",
            address="MG Road Metro Station, Shivaji Nagar, Bengaluru",
            latitude=12.9756,
            longitude=77.6066,
            calculated_priority="HIGH",
            priority_score=78.0,
            priority_explanation="HIGH priority (Score: 78.0/100) because road traffic trauma with compound fracture and active bleeding requires urgent trauma stabilization and rapid orthopedic surgery.",
            status="Awaiting Allocation",
            is_demo=1
        )
        req2 = EmergencyRequirement(
            emergency_id="E002",
            capabilities=["BLS", "Trauma"],
            equipment=["Oxygen", "Trauma Kit", "Suction"]
        )

        # E003: Moderate Respiratory Emergency (near Malleshwaram)
        e3 = Emergency(
            id="E003",
            patient_id="PT-2026-903",
            patient_name="Gopal Rao",
            patient_age=64,
            patient_gender="Male",
            patient_count=1,
            emergency_type="Respiratory",
            symptoms="Known COPD exacerbation, wheezing, SpO2 88% on room air, conscious and oriented",
            reported_severity="Moderate",
            additional_notes="Nebulization attempted at home with partial relief. Needs supplementary oxygen and hospital evaluation.",
            address="8th Cross, Sampige Road, Malleshwaram, Bengaluru",
            latitude=13.0031,
            longitude=77.5714,
            calculated_priority="MODERATE",
            priority_score=52.0,
            priority_explanation="MODERATE priority (Score: 52.0/100) because stable COPD exacerbation with moderate hypoxemia is non-immediately life-threatening compared to active cardiac/trauma arrests.",
            status="Awaiting Allocation",
            is_demo=1
        )
        req3 = EmergencyRequirement(
            emergency_id="E003",
            capabilities=["BLS", "Respiratory"],
            equipment=["Oxygen", "Patient Monitor"]
        )

        db.add_all([e1, e2, e3])
        db.commit()
        db.add_all([req1, req2, req3])
        db.commit()

        # Log audit trail
        audit = AuditLog(
            event_type="DEMO_SCENARIO_LOADED",
            entity_id="SCENARIO-3E-2A-3H",
            actor_id="DISPATCHER-CONSOLE",
            actor_role="EMS Officer",
            details="Loaded 3 simultaneous emergencies (E001, E002, E003), 2 available ambulances (A001, A002), and 3 candidate hospitals (H001, H002, H003). Scarcity constraint active."
        )
        db.add(audit)
        db.commit()

        return {
            "status": "success",
            "message": "Hackathon Demo Scenario loaded: 3 emergencies (E001, E002, E003), 2 ambulances (A001, A002), 3 hospitals (H001, H002, H003). Ready for optimization."
        }
