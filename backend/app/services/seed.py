from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.models import Incident

NOW = datetime.now(timezone.utc)

SEED_INCIDENTS: list[dict] = [
    {
        "incident_code": "INC-001",
        "title": "Payment API latency spike after checkout release",
        "service": "payments-api",
        "severity": "SEV-1",
        "status": "resolved",
        "description": (
            "p99 latency for POST /v1/payments climbed from 180 ms to 4.2 s and the 5xx "
            "rate reached 11%. Pods reported database connection acquisition timeouts. "
            "Active connections were pinned at the configured maximum."
        ),
        "symptoms": [
            "p99 latency 4.2s",
            "5xx rate 11%",
            "connection acquisition timeout",
            "active DB connections at maximum",
        ],
        "root_cause": (
            "The checkout release shipped with DB_POOL_MAX_SIZE=5 instead of the expected 50. "
            "Traffic was 8x normal, so every request waited for a pooled connection until the "
            "acquisition timeout fired."
        ),
        "resolution_summary": (
            "Raised the pool size to 50, added a 3 second acquisition timeout, restarted the "
            "payment pods and added a pool saturation alert at 80%."
        ),
        "resolution_steps": [
            "Confirm pool saturation on the payments-api Grafana dashboard.",
            "Set DB_POOL_MAX_SIZE=50 and DB_POOL_TIMEOUT=3s.",
            "Rolling restart payments-api and watch p99 for 15 minutes.",
            "Add alert on pool utilization > 80% for 5 minutes.",
        ],
        "started_at": NOW - timedelta(days=42, hours=3),
        "resolved_at": NOW - timedelta(days=42, hours=1),
    },
    {
        "incident_code": "INC-002",
        "title": "Checkout 5xx burst after discount service deploy",
        "service": "checkout-api",
        "severity": "SEV-2",
        "status": "resolved",
        "description": (
            "Checkout began returning HTTP 500 for roughly 23% of requests immediately after "
            "the discount service deployment. Logs showed a NullPointerException while "
            "computing coupon totals for carts with no coupons."
        ),
        "symptoms": ["HTTP 500 burst", "NullPointerException in discount totals", "deploy correlation"],
        "root_cause": (
            "The discount service assumed a non-empty coupon list and dereferenced the first "
            "element without a guard."
        ),
        "resolution_summary": "Rolled back the discount service to the previous build and shipped a null-safe calculation with a regression test.",
        "resolution_steps": [
            "Roll back discount-service to the previous build.",
            "Verify checkout 5xx rate returns below 0.5%.",
            "Add null-safe coupon aggregation and a regression test.",
        ],
        "started_at": NOW - timedelta(days=31, hours=5),
        "resolved_at": NOW - timedelta(days=31, hours=4),
    },
    {
        "incident_code": "INC-003",
        "title": "Authentication token validation timeouts",
        "service": "auth-service",
        "severity": "SEV-2",
        "status": "resolved",
        "description": (
            "Token validation latency exceeded 2 seconds and login success rate dropped to "
            "71%. Redis memory usage was at 100% and session keys were being evicted."
        ),
        "symptoms": ["token validation p95 > 2s", "login success 71%", "Redis evictions"],
        "root_cause": (
            "Redis maxmemory was reached after session payloads grew. The eviction policy was "
            "set to noeviction, so writes failed and token reads backed up."
        ),
        "resolution_summary": "Increased Redis maxmemory, switched to allkeys-lru, and added memory pressure alerts.",
        "resolution_steps": [
            "Scale Redis memory to 16 GB.",
            "Set maxmemory-policy allkeys-lru.",
            "Add alert on Redis memory > 80%.",
        ],
        "started_at": NOW - timedelta(days=24, hours=2),
        "resolved_at": NOW - timedelta(days=24, hours=1),
    },
    {
        "incident_code": "INC-004",
        "title": "Order events consumer lag and crash loop",
        "service": "order-events",
        "severity": "SEV-2",
        "status": "resolved",
        "description": (
            "Kafka consumer lag grew past 1.2 million messages. One consumer group entered a "
            "crash loop after repeatedly failing to deserialize a malformed event."
        ),
        "symptoms": ["consumer lag 1.2M", "crash loop", "deserialization error"],
        "root_cause": "A malformed producer event triggered an unhandled deserialization exception in the consumer.",
        "resolution_summary": "Moved the poison message to a dead-letter queue, added deserialization guards and redeployed the consumer.",
        "resolution_steps": [
            "Pause the consumer group.",
            "Move the poison message to the DLQ.",
            "Ship guarded deserialization and replay the backlog.",
        ],
        "started_at": NOW - timedelta(days=17, hours=6),
        "resolved_at": NOW - timedelta(days=17, hours=4),
    },
    {
        "incident_code": "INC-005",
        "title": "Payment webhook duplicate charges",
        "service": "payments-webhooks",
        "severity": "SEV-1",
        "status": "resolved",
        "description": (
            "A gateway retry storm produced duplicate capture calls. 38 customers were charged "
            "twice because the webhook handler did not enforce an idempotency key."
        ),
        "symptoms": ["duplicate captures", "retry storm", "customer escalations"],
        "root_cause": "Webhook handler retried non-idempotent capture requests without a deduplication store.",
        "resolution_summary": "Added an idempotency table with a unique key, refunded affected customers and made the handler retry-safe.",
        "resolution_steps": [
            "Disable automatic webhook retries.",
            "Refund duplicate captures.",
            "Add idempotency_keys table and unique constraint.",
            "Replay events with deduplication enabled.",
        ],
        "started_at": NOW - timedelta(days=10, hours=8),
        "resolved_at": NOW - timedelta(days=10, hours=2),
    },
    {
        "incident_code": "INC-006",
        "title": "Search p95 latency regression",
        "service": "search-api",
        "severity": "SEV-3",
        "status": "resolved",
        "description": (
            "Search p95 latency rose from 240 ms to 1.9 s after the orders table passed 80 "
            "million rows. Query plans showed a sequential scan on merchant_id plus created_at."
        ),
        "symptoms": ["search p95 1.9s", "sequential scan", "orders table growth"],
        "root_cause": "Missing composite index on orders(merchant_id, created_at).",
        "resolution_summary": "Added the composite index concurrently and verified the query plan used it.",
        "resolution_steps": [
            "Create index concurrently on orders(merchant_id, created_at).",
            "Run EXPLAIN ANALYZE and confirm index usage.",
            "Watch search p95 for 30 minutes.",
        ],
        "started_at": NOW - timedelta(days=6, hours=4),
        "resolved_at": NOW - timedelta(days=6, hours=3),
    },
    {
        "incident_code": "INC-007",
        "title": "Payment API latency spike during peak traffic",
        "service": "payments-api",
        "severity": "SEV-1",
        "status": "open",
        "description": (
            "p99 latency for POST /v1/payments is currently 3.8 s and the 5xx rate is 9%. "
            "Pods report database connection acquisition timeouts and active connections are "
            "pinned at the configured maximum during peak traffic. No deployment occurred in "
            "the last 24 hours."
        ),
        "symptoms": [
            "p99 latency 3.8s",
            "5xx rate 9%",
            "connection acquisition timeout",
            "active DB connections at maximum",
        ],
        "root_cause": None,
        "resolution_summary": None,
        "resolution_steps": [],
        "started_at": NOW - timedelta(minutes=38),
        "resolved_at": None,
    },
    {
        "incident_code": "INC-008",
        "title": "Notification queue delivery delay",
        "service": "notifications",
        "severity": "SEV-3",
        "status": "open",
        "description": (
            "Email and push notifications are delayed by 20 to 35 minutes. Queue depth is "
            "growing while worker CPU remains low, suggesting a downstream provider throttle."
        ),
        "symptoms": ["notification delay 20-35 min", "queue depth growing", "low worker CPU"],
        "root_cause": None,
        "resolution_summary": None,
        "resolution_steps": [],
        "started_at": NOW - timedelta(hours=2),
        "resolved_at": None,
    },
]


def seed_database(db: Session) -> dict[str, int]:
    created = 0
    existing = 0
    for item in SEED_INCIDENTS:
        found = db.scalar(select(Incident).where(Incident.incident_code == item["incident_code"]))
        if found:
            existing += 1
            continue
        db.add(Incident(is_synthetic=True, **item))
        created += 1
    db.commit()
    return {"created": created, "existing": existing, "total": len(SEED_INCIDENTS)}


def next_incident_code(db: Session) -> str:
    codes = db.scalars(select(Incident.incident_code)).all()
    numbers = []
    for code in codes:
        if code.startswith("INC-") and code[4:].isdigit():
            numbers.append(int(code[4:]))
    return f"INC-{max(numbers, default=0) + 1:03d}"
