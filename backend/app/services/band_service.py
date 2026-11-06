from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from backend.app.config import Settings

logger = logging.getLogger(__name__)


@dataclass
class BandStatus:
    configured: bool
    tom_verified: bool
    jerry_verified: bool
    detail: str
    tom_identity: dict[str, Any] = field(default_factory=dict)
    jerry_identity: dict[str, Any] = field(default_factory=dict)


class BandService:
    """Integration with pre-existing Band agents.

    Existing agent registrations are never created or mutated here. The service
    verifies the configured Tom and Jerry identities with the Band REST client.
    When credentials are absent it reports that explicitly and the caller must
    label agent output as a local fallback, never as Band output.
    """

    def __init__(self, settings: Settings):
        self.settings = settings
        self._status: BandStatus | None = None

    def _client(self, api_key: str | None):
        if not api_key:
            return None
        try:
            from band.client.rest import RestClient

            kwargs: dict[str, Any] = {"api_key": api_key, "timeout": 20.0}
            if self.settings.band_api_url:
                kwargs["base_url"] = self.settings.band_api_url
            return RestClient(**kwargs)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Band client could not be created: %s", type(exc).__name__)
            return None

    def _identity(self, api_key: str | None) -> tuple[bool, dict[str, Any], str]:
        client = self._client(api_key)
        if client is None:
            return False, {}, "no API key configured"
        try:
            me = client.agent_api_identity.get_agent_me()
            data = me.model_dump(mode="json") if hasattr(me, "model_dump") else dict(me)
            return True, data, "verified"
        except Exception as exc:  # noqa: BLE001
            return False, {}, f"{type(exc).__name__}: {str(exc)[:240]}"

    def status(self, refresh: bool = False) -> BandStatus:
        if self._status is not None and not refresh:
            return self._status
        if not self.settings.band_configured:
            self._status = BandStatus(
                configured=False,
                tom_verified=False,
                jerry_verified=False,
                detail=(
                    "Band credentials are not present. Set BAND_TOM_API_KEY, "
                    "BAND_JERRY_API_KEY, BAND_TOM_AGENT_ID and BAND_JERRY_AGENT_ID "
                    "to verify the existing agents. No agents were created."
                ),
            )
            return self._status
        tom_ok, tom_identity, tom_detail = self._identity(self.settings.band_tom_key)
        jerry_ok, jerry_identity, jerry_detail = self._identity(self.settings.band_jerry_key)
        detail = f"Tom: {tom_detail}; Jerry: {jerry_detail}"
        self._status = BandStatus(
            configured=True,
            tom_verified=tom_ok,
            jerry_verified=jerry_ok,
            detail=detail,
            tom_identity=tom_identity,
            jerry_identity=jerry_identity,
        )
        return self._status

    def provider_label(self) -> str:
        status = self.status()
        if status.configured and status.tom_verified and status.jerry_verified:
            return "band"
        return "local-fallback"
