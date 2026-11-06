# Hindsight Integration

## Summary

RecallOps uses Hindsight as the operational memory system, not as a generic vector store. Resolved
incidents are converted into structured memory records, recalled for new incidents, and surfaced as
evidence with source and score. The integration is implemented with the official
`hindsight-client` 1.2.0 SDK and a local Hindsight server.

| Operation | SDK call | Verified |
|---|---|---|
| Retain | `Hindsight.retain(...)` | Yes — 6 resolved incidents |
| Recall | `Hindsight.recall(...)` | Yes — 23 memories returned for `INC-007` |
| Reflect | `Hindsight.reflect(...)` | Wired; free-tier quota failure recorded |
| Bank creation | `Hindsight.create_bank(...)` | Yes — `recallops-incidents` exists |

## Deployment

`docker-compose.hindsight.yml` runs the official image with a named volume:

```yaml
name: recallops

services:
  hindsight:
    image: ghcr.io/vectorize-io/hindsight:latest
    container_name: recallops-hindsight
    restart: unless-stopped
    ports:
      - "8888:8888"
      - "9999:9999"
    environment:
      HINDSIGHT_API_LLM_PROVIDER: groq
      HINDSIGHT_API_LLM_API_KEY: ${HINDSIGHT_API_LLM_API_KEY:?Set HINDSIGHT_API_LLM_API_KEY in the shell environment}
      HINDSIGHT_API_LLM_MODEL: ${HINDSIGHT_API_LLM_MODEL:-openai/gpt-oss-20b}
      HINDSIGHT_API_LLM_GROQ_SERVICE_TIER: on_demand
      HINDSIGHT_API_RETAIN_CHUNK_SIZE: "800"
      HINDSIGHT_API_RETAIN_MAX_COMPLETION_TOKENS: "4000"
      HINDSIGHT_API_SKIP_LLM_VERIFICATION: "true"
      HINDSIGHT_API_WORKER_ID: recallops-worker
    volumes:
      - recallops-hindsight-data:/home/hindsight/.pg0

volumes:
  recallops-hindsight-data:
    external: true
```

### Why `on_demand`

Groq free organizations rejected the default service tier:

```text
service_tier `auto` is not available for this org
```

Setting `HINDSIGHT_API_LLM_GROQ_SERVICE_TIER=on_demand` fixed the retain path.

### Why `gpt-oss-20b`

`openai/gpt-oss-120b` hit the free-tier daily token limit during extraction. The 20b model completed
retain and recall successfully and is the compose default. The 120b model can be selected with
`HINDSIGHT_API_LLM_MODEL` when quota allows.

### Volume preservation

The volume is external and named `recallops-hindsight-data`. Recreating the container preserves it:

```bash
docker volume inspect recallops-hindsight-data
```

Do not use `docker compose down -v` for this service unless you intend to erase memory.

## Bank configuration

On startup the backend checks Hindsight health and ensures the bank exists:

```python
client.create_bank(
    bank_id="recallops-incidents",
    name="RecallOps Incident Memory",
    mission=(
        "Remember production incidents, root causes, resolutions and verified "
        "runbooks so SRE agents can recommend proven fixes for new incidents."
    ),
    disposition_skepticism=3,
    disposition_literalism=3,
    disposition_empathy=2,
    enable_observations=True,
)
```

An existing bank is treated as success. The app does not recreate or wipe it.

## What gets retained

`build_incident_memory()` converts a resolved incident into a compact, retrieval-friendly record:

```text
Production incident INC-001 (SEV-1) in service payments-api.
Title: Payment API latency spike after checkout release
Status: resolved
Symptoms: p99 latency 4.2s, 5xx rate 11%, connection acquisition timeout
Description: ...
Root cause: The checkout release shipped with DB_POOL_MAX_SIZE=5 ...
Resolution summary: Raised the pool size to 50 ...
Resolution steps:
- Confirm pool saturation ...
- Set DB_POOL_MAX_SIZE=50 ...
Data provenance: synthetic demo data.
```

The retain call also sends metadata and tags:

```python
client.retain(
    bank_id=bank_id,
    content=content,
    context=f"{incident.incident_code} {incident.service} {incident.severity}",
    metadata={
        "incident_code": incident.incident_code,
        "service": incident.service,
        "severity": incident.severity,
        "synthetic": str(incident.is_synthetic).lower(),
    },
    tags=["incident", incident.service.lower().replace(" ", "-")],
)
```

## Recall and evidence

The investigation query is built from the new incident's title, service, symptoms and description:

```python
response = client.recall(
    bank_id=bank_id,
    query=query,
    max_tokens=2048,
    budget="low",
)
```

The response is normalised into UI-friendly memories:

```python
{
    "id": "...",
    "text": "...",
    "type": "...",
    "context": "...",
    "metadata": {...},
    "tags": [...],
    "score": 0.91,
    "scores": {...},
}
```

The investigation stores the retrieved memories in `recalled_memories` and adds the top five as
`evidence` entries with `source="hindsight"`. The UI displays the count and the actual text, so a
reviewer can verify the recall instead of trusting a summary.

## Reflect

Reflect is wired to the real SDK:

```python
response = client.reflect(bank_id=bank_id, query=query, budget="low")
```

It is intentionally exposed in the Memory Intelligence page with a quota warning. A live attempt
during verification returned:

```text
ServiceException: (500)
Provider quota exhausted (groq/openai/gpt-oss-20b, ...)
```

The failure is stored in `memory_operations` and displayed in the ledger. The project does **not**
claim a successful reflect run.

## Operation ledger

Every Hindsight call is recorded:

```text
memory_operations
  operation        retain | recall | reflect
  status           success | failed | unavailable
  bank_id
  request_payload
  response_payload
  latency_ms
  error
  incident_id
  investigation_id
```

This powers the Overview feed, the Memory Intelligence ledger and the "verified retains / recalls"
counts. It also prevents a common demo failure mode: hiding provider errors and pretending the
memory layer worked.

## Cross-thread client fix

The SDK client owns an `aiohttp` session bound to the event loop of the creating thread. Reusing a
single client across FastAPI worker threads produced:

```text
RuntimeError: Timeout context manager should be used inside a task
```

`HindsightService` now creates a fresh client per operation and closes it:

```python
def _new_client(self) -> Hindsight | None:
    if not self.settings.hindsight_configured:
        return None
    return Hindsight(
        base_url=self.settings.hindsight_api_url,
        api_key=self.settings.hindsight_api_key,
        timeout=self.settings.hindsight_timeout,
        max_attempts=1,
    )

@staticmethod
def _close(client: Hindsight | None) -> None:
    if client is None:
        return
    try:
        client.close()
    except Exception:
        pass
```

This resolved recall failures immediately. The fix is visible in
`backend/app/services/hindsight_service.py`.

## Backfill

`memory_sync.py` retains resolved incidents in the background:

- only unresolved-memory incidents are selected unless `force=true`
- 32-second throttle between successful calls
- one retry after a detected rate-limit error
- state exposed at `GET /api/memory/sync/status`

Manual backfill:

```bash
curl -X POST http://127.0.0.1:8000/api/memory/sync
curl http://127.0.0.1:8000/api/memory/sync/status
```

## Verification commands and observed output

Health:

```bash
curl -s http://localhost:8888/health
```

Observed: HTTP 200, `{"status":"healthy", ...}`.

Smoke retain/recall (separate `recallops-smoke` bank):

```text
retain: success, 2.4 s, input 3065 / output 195 / total 3260 tokens
recall: returned INC-SMOKE-2026, verified true
```

Main bank recall:

```text
bank: recallops-incidents
results: 18–23 memories depending on query
example evidence: "Production incident INC-001 ... resolved ..."
```

End-to-end incident:

```bash
curl -X POST http://127.0.0.1:8000/api/incidents/7/investigate \
  -H 'Content-Type: application/json' \
  -d '{"memory_enabled": true}'
```

Observed:

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

Comparison:

```json
{
  "memory_on": {"runs": 2, "avg_confidence": 0.92, "avg_memories": 23.0},
  "memory_off": {"runs": 1, "avg_confidence": 0.64, "avg_memories": 0},
  "delta_confidence": 0.28
}
```

The comparison endpoint counts only memory-ON investigations with `memory_status="used"`. An earlier
memory-ON run whose recall failed during the cross-thread SDK bug is preserved in the investigation
history and ledger, but excluded from this successful-memory average; it used 0 memories and scored
64%. The failed run is not hidden and is visible in `INC-007` investigation history.

## Free-tier operations notes

- Retain performs LLM fact extraction, so it consumes tokens.
- Recall is retrieval-only and remained reliable when extraction quota was exhausted.
- Reflect is the most quota-sensitive operation.
- Backfill is throttled to avoid bursty extraction.
- If quota is exhausted, wait for the provider reset window and retry; the ledger preserves the
  exact error and retry timestamp.
