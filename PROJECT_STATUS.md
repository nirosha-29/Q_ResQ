# Q-ResQ Project Status

**Team:** QUBITNOVA  
**Project:** AI-Powered Emergency Medical Services Resource Allocation and Hospital Coordination Platform  
**Tagline:** Every Second Matters. Every Resource Counts.

## Existing implementation

- The repository contains a FastAPI backend, a React/Vite/TypeScript frontend, SQLAlchemy models, an existing SQLite database (`q_resq.db`), and backend tests.
- `README.md` is effectively empty, and the requested `Pasted text.txt` specification is not present in the workspace.
- The backend has emergency intake and priority scoring, candidate matching, routing with an explicitly disclosed offline estimate (optional OSRM), a SciPy MILP solver, QUBO/QAOA code, allocation recommendations, approval, dispatch, dashboard, benchmarking, and demo-data endpoints.
- The seeded hackathon scenario defines three emergencies, two simulated ambulances, and three scenario hospitals (H001–H003). The wider public hospital registry contains five records. The ambulances are marked simulated; hospital records carry public-registry provenance. These are demo inputs, not verified live operational data.
- Existing backend integration tests cover the demo workflow, resource scarcity, dispatcher approval/dispatch, dashboard statistics, and benchmark execution.

## Baseline issues found and fixed

- Backend tests: **9 passed** using `DATABASE_URL=sqlite://` so tests did not modify the existing `q_resq.db`.
- The initial frontend production build failed because named-export components were imported as defaults, dispatch rendering expected nonexistent API fields, emergency-detail props/types were inconsistent, and an icon import was missing. These integration errors are fixed.
- The initial frontend build command ran from the repository root and did not find `package.json`; documented commands now target `frontend`.
- Demo hospital matching and optimization now use only H001–H003 for demo emergencies without deactivating or removing the other registry hospitals.
- The QUBO now rewards serving emergencies and penalizes multiple assignments to one emergency. QUBO energy is identified as distinct from the MILP objective.
- Optimization now excludes active but busy/dispatched ambulances. Dispatch requires explicit allocation approval, and unserved plans cannot be approved.
- README now documents setup, run commands, demo provenance, limits, and safe isolated-database tests.

## Remaining work / known limitations

- Several frontend pages still log fetch failures to the console rather than showing a user-facing error state.
- Ambulance/hospital capability and equipment mismatches are scored and explained, but are not all hard feasibility constraints; operational use would need clinically reviewed policy.
- The demo's 18 assignment variables (3 emergencies × 2 ambulances × 3 hospitals) exceed the configured 16-qubit simulator limit. The current pipeline should report its honest classical fallback for that scenario; smaller problems can execute QAOA.
- The QAOA simulator uses a statevector with a small optimization iteration budget; it is a research/demo path, not a production EMS solver or a claim of quantum advantage.
- OSRM is disabled by default; route estimates then use a disclosed geodesic/circuity fallback and do not include live traffic.
- Authentication is demo-level; deployment hardening, authorization, security controls, clinical validation, and live fleet/hospital integrations remain out of scope for this prototype.

## Verification results

- Backend: **11 tests passed** with `DATABASE_URL=sqlite://`.
- Frontend: `npm --prefix frontend run build` passed TypeScript and Vite production build.
- Live API workflow against a separate demo database: health, scenario load, exactly three demo hospital candidates, 2 served / 1 unserved with zero classical constraint violations, rejection before approval, approval, dispatch, and dashboard dispatch count all passed.
- Browser: logged in as demo dispatcher; loaded the scenario; viewed allocation; approved and confirmed dispatch; verified the dispatch appeared on the tracking page. Registered a separate test emergency in the UI and verified its allocation page executed Qiskit Statevector QAOA successfully on a 5-qubit QUBO.
- The repository's `q_resq.db` was not used for tests or browser verification.

## Changed files

- `README.md`, `PROJECT_STATUS.md`
- `backend/app/api/allocations.py`, `backend/app/api/emergencies.py`
- `backend/app/integrations/demo_provider.py`
- `backend/app/quantum/hybrid_pipeline.py`, `backend/app/quantum/qubo_formulation.py`
- `backend/app/services/validation_service.py`
- `backend/tests/test_api_endpoints.py`, `backend/tests/test_quantum_qubo_qaoa.py`
- `frontend/src/App.tsx`, `frontend/src/layouts/MainLayout.tsx`
- `frontend/src/pages/AllocationPage.tsx`, `frontend/src/pages/DispatchesPage.tsx`, `frontend/src/pages/EmergencyDetailPage.tsx`
- `frontend/src/services/api.ts`

## Next development task

Add focused UI tests and visible request-error states, then review and formalize which crew, equipment, and clinical capabilities are mandatory feasibility constraints with appropriate operational stakeholders. Do not promote this prototype to real dispatch use without clinical, security, and regulatory validation.
