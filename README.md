# Q-ResQ

**Every Second Matters. Every Resource Counts.**

Q-ResQ is a QUBITNOVA hackathon prototype for emergency medical resource coordination. It combines a FastAPI backend, a React dashboard, classical MILP allocation, QUBO/QAOA experimentation, route estimates, and dispatcher approval and dispatch workflows.

> **Prototype notice:** Q-ResQ is decision-support software using simulated fleet data and public facility records. It is not for real emergency response, diagnosis, or autonomous dispatch. Demo coordinates, availability, hospital capacity, and ETAs must not be treated as live operational data.

## Requirements

- Python 3.10 or newer
- Node.js 18 or newer and npm
- Windows PowerShell (commands below use Windows paths)

## Install

Run these commands from the repository root:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
npm --prefix frontend install
```

## Run locally

Open two terminals at the repository root.

Backend:

```powershell
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
npm --prefix frontend run dev -- --host 127.0.0.1
```

Open <http://127.0.0.1:5173>. For a local development instance, sign in with `dispatcher1` and the demo password `demo123` (or configure `Q_RESQ_DEMO_PASSWORD` before first startup). The other seeded demo usernames are `admin1` and `coordinator1`, with the same local-only password. Change the password for any shared or deployed environment; production mode does not seed demo users and requires provisioned user credentials. Successful sign-in uses an HttpOnly session cookie; the browser does not store a bearer token in local storage.

After signing in, use **LOAD HACKATHON SCENARIO** to load three simultaneous demo emergencies, two simulated ambulances, and three scenario hospitals. The API is documented at <http://127.0.0.1:8000/docs>.

By default, the backend uses `sqlite:///./q_resq.db`, resolved relative to the repository root when started with the command above. Back up any database before changing or resetting data. To use a separate local database, set `DATABASE_URL` before starting the backend, for example:

```powershell
$env:DATABASE_URL = "sqlite:///./q_resq_demo.db"
```

OSRM routing is disabled by default; the application reports when it is using its static geodesic/circuity fallback. The three-hospital demo produces 18 assignment variables, above the configured 16-qubit simulator limit, so the hybrid workflow reports a quantum fallback and uses the classical allocation for the operational recommendation. Smaller QUBOs can execute the Qiskit statevector QAOA path; this prototype does not claim quantum advantage.

## Checks

Run backend tests without touching the default project database:

```powershell
$env:DATABASE_URL = "sqlite://"
python -m pytest -q
```

Build and type-check the frontend:

```powershell
npm --prefix frontend run build
```