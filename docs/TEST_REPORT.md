# RecallOps AI — Test Report

**Date:** 2026-11-06
**Environment:** macOS (darwin), Python 3.13.18, Node 24.22.0, npm 11.19.1, Docker 29.8.0
**Hindsight:** `ghcr.io/vectorize-io/hindsight:latest`, container `recallops-hindsight`, port 8888
**Hindsight model:** `openai/gpt-oss-20b`, Groq service tier `on_demand`

## Automated backend tests

Command:

```bash
.venv/bin/python -m pytest -q
```

Result:

```text
.......                                                                  [100%]
7 passed
```

| Test | What it verifies |
|---|---|
| `test_health_reports_explicit_unconfigured_state` | API/database health; LLM and Band are explicitly reported as not configured |
| `test_seeded_incidents_are_synthetic_and_complete` | Eight synthetic incidents, complete codes and services |
| `test_patterns_and_dashboard` | Aggregates, recurring services and dashboard summary |
| `test_memory_on_investigation_uses_recalled_evidence` | Memory-ON path, recalled evidence, 0.92 confidence, two agent runs |
| `test_memory_off_never_calls_recall` | Memory-OFF path does not call recall; 0.64 confidence |
| `test_comparison_reports_measured_delta` | ON/OFF comparison returns a 0.28 measured delta |
| `test_created_incident_can_be_resolved_and_retained` | Create → resolve → retain path updates `memory_retained` |

The tests use a temporary SQLite database at `/tmp/recallops_test.db`, disable background sync and
do not call Hindsight or Groq. Memory boundaries are faked for deterministic assertions.

## Frontend build

Command:

```bash
cd frontend
npm run build
```

Result:

```text
✓ 2450 modules transformed.
dist/index.html                   0.80 kB
dist/assets/index-*.css          40.19 kB
dist/assets/index-*.js          721.74 kB
✓ built in 185ms
```

TypeScript 7 and Vite 8 compile without errors. The only build note is the standard chunk-size
warning from Recharts and the application bundle.

## Headless render checks

All routes were rendered in headless Chrome with `--virtual-time-budget=6000` against the live
backend and frontend. The React root mounted and page-specific API content was present:

| Route | Root content | Expected content found |
|---|---:|---|
| `/` | 29 KB | Overview, Hindsight engine, incidents |
| `/incidents` | 23 KB | `INC-001`, `INC-007`, `payments-api` |
| `/incidents/7` | 28 KB | `INC-007`, investigate controls, payments context |
| `/investigate` | 17 KB | New investigation form |
| `/memory` | 44 KB | Hindsight status, memory ledger |
| `/patterns` | 32 KB | Recurring failure patterns, memory impact |
| `/agents` | 31 KB | Tom, Jerry, Band fallback banner |
| `/settings` | 26 KB | Runtime status, Hindsight deployment, `on_demand` |

Recharts bars were verified after disabling entry animation for screenshot stability.

## Live Hindsight verification

### Health

```bash
curl -s http://localhost:8888/health
```

Observed HTTP 200 `{"status":"healthy", ...}`.

### Retain and recall

- Smoke bank `recallops-smoke`: retain succeeded in 2.4 s; recall returned `INC-SMOKE-2026` with
  `verified=true`.
- Main bank `recallops-incidents`: recall returned existing `INC-TEST` memories and, later, 18–23
  incident memories depending on the query.

### Resolved-incident backfill

Observed sync state after the quota reset:

```json
{
  "running": false,
  "total": 1,
  "processed": 1,
  "succeeded": 1,
  "failed": 0,
  "last_error": null
}
```

Final retained count: **6 of 6 resolved incidents**. The first backfill attempt retained 4, then a
provider quota error deferred 2; after the reset window the remaining incident retained
successfully.

### Memory-ON vs memory-OFF

`INC-007` memory ON:

```text
status: completed
memory_status: used
memories: 23
confidence: 0.92
provider: local-deterministic
root cause: Recurrence of database connection pool exhaustion...
```

Memory OFF:

```text
status: completed
memory_status: disabled
memories: 0
confidence: 0.64
```

Comparison endpoint:

```json
{
  "memory_on": {"runs": 2, "avg_confidence": 0.92, "avg_memories": 23.0},
  "memory_off": {"runs": 1, "avg_confidence": 0.64, "avg_memories": 0},
  "delta_confidence": 0.28
}
```

### Reflect

Attempted against the live server:

```text
status: failed
error: ServiceException: (500)
Provider quota exhausted (groq/openai/gpt-oss-20b, ...)
```

This is an honest free-tier limitation, recorded in `memory_operations`. Reflect was not counted as
a successful operation.

## Memory ledger evidence

The ledger contains both successes and failures:

- retain success: 2.2–4.2 s
- recall success: 1.0–1.1 s
- retain failures: provider quota, 174–221 ms
- one early recall failure: `RuntimeError: Timeout context manager should be used inside a task`
  before the per-operation client fix
- reflect failure: provider quota, 1.9 s

The early recall failure is the regression that led to the cross-thread client fix. After the fix,
recall succeeded against the same bank.

## Security checks

- `.env` is gitignored and excluded from the submission archive.
- API health returns only booleans, model names and non-secret URLs.
- No credential values appear in screenshots, logs or docs.
- No runtime read of editor/CLI auth stores.
- Band status is `configured=false`; no agent was created.

## Known gaps

- No automated test exercises the live Hindsight SDK inside CI. Live verification is manual and
  documented above.
- No browser automation suite; route rendering was checked with headless Chrome and DOM assertions.
- Band verification path is unit-testable but not exercised against real credentials.
- Reflect success is not verified due to free-tier quota.
- No load, security or accessibility audit.

---

# Final Independent Audit — 2026-11-06

**Audit time:** 2026-11-06 ~09:40 UTC (15:10 local)
**Scope:** running services, eight routes, tests, live Hindsight retain/recall, 92% vs 64% evidence,
labels, presentation, screenshots, ZIP integrity and secret scan.

## 1. Running services

| Service | Evidence | Result |
|---|---|---|
| Frontend | `npm run dev` PID 25349, node PID 25363 listening on `127.0.0.1:5173`; HTTP 200 | Running |
| Backend | uvicorn PID 25476 listening on `127.0.0.1:8000`; `/api/health` HTTP 200 | Running |
| Hindsight | `recallops-hindsight` container up; `/health` HTTP 200; API version 1.2.0 | Running |

Port 8888 is forwarded by Colima's SSH mux to the local Docker container. It is not a remote tunnel.

Backend health at audit time:

```json
{
  "status": "ok",
  "database": {"ok": true, "detail": "connected"},
  "hindsight": {"configured": true, "reachable": true, "bank_id": "recallops-incidents"},
  "llm": {"configured": false, "source": "missing", "model": "openai/gpt-oss-120b"},
  "band": {"configured": false, "tom_verified": false, "jerry_verified": false}
}
```

## 2. Eight frontend routes

Each route was rendered in headless Chrome against the live backend and checked for a non-empty
React root plus page-specific content.

| Route | Root size | Required content | Result |
|---|---:|---|---|
| `/` | 32,794 | “Incident response that” | Pass |
| `/incidents` | 23,412 | `INC-001` | Pass |
| `/incidents/7` | 40,289 | `INC-007` | Pass |
| `/investigate` | 16,825 | “Investigate a new incident” | Pass |
| `/memory` | 48,456 | “Memory intelligence” | Pass |
| `/patterns` | 32,343 | “Recurring failure patterns” | Pass |
| `/agents` | 34,776 | “Band credentials not configured” | Pass |
| `/settings` | 25,826 | “Runtime status” | Pass |

Route failures: **0**.

## 3. Backend tests

```bash
.venv/bin/python -m pytest -q
```

```text
.......                                                                  [100%]
7 passed in 0.06s
```

## 4. Independent Hindsight retain and recall

This audit used a separate bank, not the application bank, so it did not alter application
statistics. The script used the official `hindsight-client` directly.

```text
bank: recallops-audit-5734d6f9
create_bank: success
retain: success, 2,748 ms
usage: input 3,045 / output 195 / total 3,240 / thoughts 1,681
recall: success, 109 ms, results=1
marker_found: True
```

Recalled text contained the unique marker `AUDIT-MARKER-9F3A2`. The audit bank is separate from
`recallops-incidents` and is not counted in the app’s retain/recall ledger.

## 5. Evidence for the 92% vs 64% comparison

`INC-007` has four investigations:

| Investigation | Memory enabled | Memory status | Confidence | Recalled | Hindsight evidence | Provider |
|---|---|---:|---:|---:|---:|---|
| id=1 | true | failed | 0.64 | 0 | 0 | local-deterministic |
| id=2 | true | used | 0.92 | 23 | 5 | local-deterministic |
| id=3 | false | disabled | 0.64 | 0 | 0 | local-deterministic |
| id=4 | true | used | 0.92 | 23 | 5 | local-deterministic |

Investigation id=1 is the pre-fix recall failure (`Timeout context manager should be used inside a
task`). It is preserved in history and in the memory ledger. It is excluded from the successful
memory-on comparison because no memory was used.

The comparison endpoint counts `memory_enabled and memory_status == "used"` versus
`not memory_enabled`:

```json
{
  "memory_on": {"runs": 2, "avg_confidence": 0.92, "avg_memories": 23.0},
  "memory_off": {"runs": 1, "avg_confidence": 0.64, "avg_memories": 0},
  "delta_confidence": 0.28
}
```

This supports the documented claim: **92% with successful memory recall vs 64% without memory,
+28 points**. The failed memory-on run is disclosed rather than hidden.

## 6. Statistic reconciliation

| Statistic | Verified value | Source |
|---|---:|---|
| Synthetic incidents | 8 | `/api/incidents`, `/api/analytics/patterns` |
| Services observed | 7 | `/api/analytics/patterns` |
| Recurring services | 1 | `/api/analytics/patterns` |
| Resolved incidents retained | 6 / 6 | `/api/incidents` |
| Successful retains (app ledger) | 6 | `/api/memory/operations?operation=retain` |
| Successful recalls (app ledger) | 2 | `/api/memory/operations?operation=recall` |
| INC-007 memory-ON runs | 2 successful (0.92, 23 memories) | `/api/incidents/7/investigations` |
| INC-007 memory-OFF runs | 1 (0.64, 0 memories) | `/api/incidents/7/investigations` |
| Average confidence, all 4 runs | 0.78 | Computed from stored investigations |
| Backend tests | 7 passed | pytest |
| Frontend routes | 8 / 8 | Headless Chrome |
| Pitch deck slides | 10 | `python-pptx` |
| Screenshot assets | 10 (8 full screens + 2 deck crops) | `screenshots/` |

## 7. Band and Groq labels

- `/api/health`: `band.configured=false`, `llm.configured=false`, `llm.source="missing"`.
- `/api/agents/status`: `provider_note` explicitly says Tom/Jerry run as labelled local fallbacks;
  recent agent runs use `provider="local-deterministic"`.
- Agent Collaboration page now shows a dedicated banner:
  **“Groq application LLM not configured — deterministic fallback”** and
  **“Band credentials not configured — local fallback”**.
- Settings page labels Groq LLM as `missing` and explains deterministic fallback.
- Hindsight’s own memory-extraction model is Groq `openai/gpt-oss-20b`; this is separate from the
  application LLM and is not presented as an app-level Groq success.

## 8. Presentation and screenshots

- `submission/RecallOps_AI_Pitch.pptx`: 10 slides, 3 embedded screenshots, no shapes outside the
  slide bounds, key figures present (`6/6`, `92%`, `64%`, `+28`, `7 passed`, fallback labels).
- All 10 PNG assets open correctly with Pillow; dimensions and non-blank variance checked. Full
  pages are 1440×1000; deck crops are 1000×760 and 1440×760.

## 9. ZIP integrity and secret scan

Final command:

```bash
unzip -t submission/RecallOps_AI_Submission.zip
```

Result: **No errors detected** after the final rebuild.

The archive was checked for:

- `.env` (only `.env.example` is present)
- `*.db`, `*.sqlite`, `backend/data/*`
- `node_modules`, `.venv`, `__pycache__`, `.pytest_cache`
- `auth.json`, `credentials`, `*.pem`, `*.key`
- Groq/OpenAI-style API-key prefixes and non-placeholder values for documented key variables

No secrets, databases or private credentials were found. The ZIP is source-only plus docs,
screenshots and the pitch deck.

## Remaining gaps

- Band credentials are still absent; Tom/Jerry remain labelled local fallbacks.
- No valid application `GROQ_API_KEY`; investigations remain deterministic fallback.
- Hindsight reflect remains quota-limited; the failed operation is recorded.
- Demo video, public article and LinkedIn post are still manual actions.
- Event-name discrepancy remains flagged for organizer confirmation.
