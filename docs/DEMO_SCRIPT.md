# RecallOps AI — Demo Script

## Pre-demo checklist

- [ ] Hindsight container healthy: `curl http://localhost:8888/health`
- [ ] Backend healthy: `curl http://127.0.0.1:8000/api/health`
- [ ] Frontend open at `http://127.0.0.1:5173`
- [ ] Six resolved incidents retained (Overview says **6 of 6**)
- [ ] `INC-007` has a memory-ON run at 92% and a memory-OFF run at 64%
- [ ] Do not click Reflect unless quota is known to be available
- [ ] Say "local fallback" for Tom/Jerry if Band is not configured
- [ ] Say "deterministic fallback" if the app Groq key is not configured

## 60-second flow

### 0:00–0:08 — Hook

> "Every incident team solves the same problem twice. RecallOps is an incident-response agent that
> actually remembers the fix — and proves it with a memory-ON versus memory-OFF comparison."

Show **Overview**.

Point at:
- **6 of 6 resolved incidents retained**
- Hindsight health
- recent memory operations

### 0:08–0:18 — The new incident

Open **Incidents → INC-007 Payment API latency spike**.

> "Payments-api is down again: p99 3.8 seconds, 5xx at 9%, connection acquisition timeouts. The
> on-call has no context."

Show the incident context and symptoms.

### 0:18–0:32 — Memory-backed investigation

Click **Investigate with memory** (or open the existing latest run).

> "Tom recalls 23 memories from Hindsight. The top evidence is INC-001: the same pool exhaustion,
> caused by `DB_POOL_MAX_SIZE=5` instead of 50. The proven fix was raising it to 50 and adding a
> saturation alert."

Show:
- **MEMORY ON**
- **USED**
- **23 historical memories used**
- **92% confidence**
- Tom's hypothesis and recommended actions

> "Jerry independently reviews Tom's proposal, approves it, and adds validation and rollback
> concerns. Both agent runs are stored separately."

Point at the Tom and Jerry cards and their provider labels.

### 0:32–0:42 — Prove the memory advantage

Open **Patterns & Insights**.

> "The same incident without memory scored 64%. With memory it scored 92%. That's a measured
> 28-point lift, not a claim. The chart is computed from real runs."

Show:
- memory OFF 64%
- memory ON 92%
- recurring `payments-api` pattern
- root cause card

### 0:42–0:52 — Close the learning loop

Return to **INC-007 → Resolve & learn**.

> "When the fix is confirmed, RecallOps writes the root cause and runbook back to Hindsight. The
> next payments-api incident starts with this knowledge already available."

If resolving live, fill a short root cause and resolution. If not, point at the retain path and the
Memory Intelligence ledger.

### 0:52–1:00 — Close

> "Hindsight is the system of record, not a chat sidebar. Retain, recall and reflect are all real
> SDK calls, every operation is auditable, and failures are visible. RecallOps turns incident
> response from tribal knowledge into compounding operational memory."

## 2–5 minute video outline

| Time | Segment | What to show |
|---|---|---|
| 0:00–0:20 | Problem | Repeated incidents, lost runbooks, on-call context switching |
| 0:20–0:50 | Product tour | Overview, incidents, incident room |
| 0:50–1:40 | Memory ON | Recall evidence, 23 memories, 92% confidence |
| 1:40–2:20 | Memory OFF | Same incident, 0 memories, 64% confidence |
| 2:20–3:00 | Comparison | Patterns page, +28 point delta |
| 3:00–3:40 | Resolve + retain | Write-back to Hindsight, ledger |
| 3:40–4:20 | Agent collaboration | Tom/Jerry separation, Band status (label fallback) |
| 4:20–4:45 | Architecture | FastAPI, SQLite, Hindsight, named volume |
| 4:45–5:00 | Honest limits | Free-tier quota, no Band credentials, synthetic data |

## Lines to avoid

- Do not say "Band agents are live" unless `BAND_*` credentials are configured and verified.
- Do not say "Groq is powering the investigation" unless `GROQ_API_KEY` is configured.
- Do not say "reflect works" if the latest reflect operation is failed.
- Do not say "100% retained" before checking the Overview count.
- Do not quote benchmark lift numbers that are not in the comparison endpoint.

## Reset demo state

If a live run changes the story:

```bash
# Re-run both modes for INC-007
curl -X POST http://127.0.0.1:8000/api/incidents/7/compare

# Or run only memory ON
curl -X POST http://127.0.0.1:8000/api/incidents/7/investigate \
  -H 'Content-Type: application/json' -d '{"memory_enabled": true}'

# Backfill resolved incidents
curl -X POST http://127.0.0.1:8000/api/memory/sync
```

The demo database is local SQLite at `backend/data/recallops.db`. Deleting it re-seeds the eight
synthetic incidents on the next backend start.
