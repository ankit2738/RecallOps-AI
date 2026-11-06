# Submission Checklist

**Project:** RecallOps AI — incident response that remembers
**Event:** Hack With Bangalore 4.0
**Challenge:** AI Agents That Learn Using Hindsight
**Selected problem:** Engineering & DevOps — Incident Response Agent
**Status date:** 2026-11-06
**Final audit:** 2026-11-06 ~09:40 UTC

> Requirements discrepancy: the supplied problem-statement document is titled
> **HackwithHyderabad 3.0**, while the registered event is **Hack With Bangalore 4.0**. Confirm
> event-specific rules with the organizer before submitting.

## Final audit results

| Check | Result |
|---|---|
| Frontend running | Pass — `127.0.0.1:5173`, HTTP 200 |
| Backend running | Pass — `127.0.0.1:8000`, `/api/health` HTTP 200 |
| Hindsight running | Pass — container up, `/health` HTTP 200 |
| Eight frontend routes | Pass — 8/8 rendered with live data |
| Backend tests | Pass — 7 passed |
| Independent Hindsight retain | Pass — separate audit bank, 2,748 ms |
| Independent Hindsight recall | Pass — marker `AUDIT-MARKER-9F3A2` returned |
| 92% vs 64% evidence | Pass — stored investigations, 23 vs 0 memories, +28 points |
| Band fallback label | Pass — `configured=false`, runs `local-deterministic` |
| Groq application fallback label | Pass — `llm.source="missing"`, UI banner |
| PowerPoint | Pass — 10 slides, 3 embedded screenshots |
| Screenshots | Pass — 10 valid PNG assets |
| ZIP integrity | Pass — `unzip -t` clean |
| ZIP secret scan | Pass — no `.env`, DB, keys or credentials |

## Required deliverables

| Item | Status | Location / notes |
|---|---|---|
| Clean, documented GitHub repository | Ready to publish | Local repo; replace `<your-org>` in `docs/LINKEDIN_DRAFT.md`; see `README.md` |
| Live project demonstration | Ready | Local Hindsight + FastAPI + Vite |
| Demo video | **Manual action** | Follow `docs/DEMO_SCRIPT.md`; 2–5 min, 1080p, public YouTube |
| Explanation of Hindsight integration | Complete | `docs/HINDSIGHT_INTEGRATION.md` |
| Individual article from every team member | Draft ready | `docs/ARTICLE_DRAFT.md` — 1,497 words; needs byline and publish URL |
| Individual social post from every team member | Draft ready | `docs/LINKEDIN_DRAFT.md` — 557 characters; needs GitHub and article URLs |
| One team video | **Manual action** | Same as demo video; show real retain and recall |
| Pitch deck | Complete | `submission/RecallOps_AI_Pitch.pptx` — 10 slides |
| Screenshots | Complete | `screenshots/` — 8 full screens + 2 deck crops |
| Submission ZIP | Complete | `submission/RecallOps_AI_Submission.zip` — integrity verified |

## Mandatory technology

| Requirement | Status | Evidence |
|---|---|---|
| Build using Hindsight | Done | Real retain/recall via `hindsight-client` 1.2.0 |
| Use Band AI Desktop / Band agents | Partially verified | Integration verifies existing agents; credentials absent, so runs are labelled `local-fallback` |
| Any LLM | Done | Hindsight uses Groq `openai/gpt-oss-20b`; app LLM is optional with deterministic fallback |
| Groq recommended | Done for Hindsight | `HINDSIGHT_API_LLM_PROVIDER=groq` |

## Judging criteria coverage

| Criterion | Weight | Evidence |
|---|---:|---|
| Innovation | 30% | Memory-native incident workflow, measured ON/OFF comparison, separate Tom/Jerry roles |
| Hindsight Memory | 25% | Real retain/recall, evidence with scores, operation ledger, reflect wired |
| Technical Implementation | 20% | FastAPI, SQLAlchemy, React/TS, typed API, tests, error handling, cross-thread SDK fix |
| User Experience | 15% | Eight polished pages, dark SRE command center, honest provider badges |
| Real-world Impact | 10% | Recurring payments-api pattern, preventive fix, compounding operational knowledge |

## Content contest rules

### Article

- [ ] Public and linkable
- [ ] English
- [ ] 1,200–1,500 words (draft is 1,497)
- [ ] No mention of the hackathon in title or body
- [ ] Includes actual code
- [ ] Includes screenshots
- [ ] Explains Hindsight integration
- [ ] Includes honest lessons and limitations

### LinkedIn

- [ ] Under 800 characters (draft is 557)
- [ ] No mention of the hackathon
- [ ] GitHub repository link in the post
- [ ] Article URL in the first comment
- [ ] Hindsight GitHub link in a separate comment
- [ ] 3–5 relevant hashtags at the end (draft has 4)
- [ ] First two lines contain no links or hashtags

### Team video

- [ ] 2–5 minutes
- [ ] Minimum 1080p
- [ ] Public YouTube upload
- [ ] Real interaction, not slides only
- [ ] Demonstrates Hindsight retain and recall
- [ ] Labels Band/Groq fallbacks honestly

## Manual actions before publishing

1. Replace `<your-org>` in `docs/LINKEDIN_DRAFT.md` with the public GitHub repository URL.
2. Publish the repository; confirm `.env`, `backend/data/*.db`, `node_modules`, `.venv` and `dist` are
   not tracked.
3. Record the 2–5 minute demo video at 1080p and upload it publicly to YouTube.
4. Publish the article (target 1,200–1,500 words) and record its public URL.
5. Publish the LinkedIn post with the GitHub link in the post, the article URL in the first comment
   and the Hindsight link in a separate comment.
6. To verify real Band agents, provide `BAND_TOM_API_KEY`, `BAND_JERRY_API_KEY`,
   `BAND_TOM_AGENT_ID` and `BAND_JERRY_AGENT_ID`, then re-check `/api/agents/status`. Until then,
   Tom/Jerry must remain labelled local fallbacks.
7. To enable Groq-backed investigations, provide a valid application `GROQ_API_KEY` and rerun an
   investigation. Until then, investigations must remain labelled deterministic fallback.
8. Retry Hindsight reflect when the free-tier quota resets. If it succeeds, update the ledger note
   and `TEST_REPORT.md`; if it fails, keep the failure visible.
9. Confirm the event-name/rules discrepancy with the organizer.
10. Add a `LICENSE` file if the event or repository policy requires one.

## Honest limitations to disclose

- Band credentials were not available; Tom/Jerry ran as local fallbacks.
- The app-level Groq key was not configured; investigations used the deterministic fallback.
- Hindsight reflect was quota-limited during verification; retain and recall were verified.
- The comparison counts successful memory-ON runs; one earlier failed memory-ON run is preserved in
  history but excluded from the 92% average.
- All eight incidents are synthetic and labelled.
- No production authentication, multi-tenancy or load testing.

## Final verification commands

```bash
.venv/bin/python -m pytest -q
cd frontend && npm run build
curl -s http://127.0.0.1:8000/api/health
curl -s http://localhost:8888/health
curl -s http://127.0.0.1:8000/api/analytics/comparison
unzip -t submission/RecallOps_AI_Submission.zip
```
