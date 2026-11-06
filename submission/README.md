# RecallOps AI — Submission Bundle

**Incident response that remembers.**

## Contents

| File | Description |
|---|---|
| `RecallOps_AI_Pitch.pptx` | 10-slide pitch deck with live product screenshots |
| `RecallOps_AI_Submission.zip` | Clean source bundle (no `.env`, secrets, DB, virtualenv or `node_modules`) |

## Source bundle

The ZIP contains:

- `README.md` — product overview, quick start, verified results
- `backend/` — FastAPI application and services
- `frontend/` — React/TypeScript/Vite source
- `tests/` — seven backend API tests
- `docs/` — architecture, Hindsight integration, demo script, test report, checklist, article and LinkedIn drafts
- `screenshots/` — product screens and deck crops
- `docker-compose.hindsight.yml` — local Hindsight deployment
- `.env.example` — placeholder configuration only

## Verified summary

- 8 synthetic incidents across 7 services
- 6 of 6 resolved incidents retained in Hindsight
- Memory ON: 23 memories, 92% confidence (2 successful runs)
- Memory OFF: 0 memories, 64% confidence (1 run)
- Measured delta: +28 percentage points
- One earlier failed memory-ON run is preserved in history but excluded from the successful average
- 7 backend tests passed; frontend production build passed; 8/8 routes rendered in headless Chrome
- Independent Hindsight audit: separate bank, retain + recall verified
- ZIP integrity and secret scan passed

## Honest limitations

- Band credentials were not available; Tom/Jerry ran as clearly labelled local fallbacks.
- The app-level Groq key was not configured; investigations used the deterministic fallback.
- Hindsight reflect was quota-limited; retain and recall were verified independently.
- All seeded incidents are synthetic and labelled.
