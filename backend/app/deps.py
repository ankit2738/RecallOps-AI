from __future__ import annotations

from functools import lru_cache

from backend.app.config import get_settings
from backend.app.services.band_service import BandService
from backend.app.services.hindsight_service import HindsightService
from backend.app.services.investigation_service import InvestigationService
from backend.app.services.llm_service import LLMService


@lru_cache
def get_memory_service() -> HindsightService:
    return HindsightService(get_settings())


@lru_cache
def get_llm_service() -> LLMService:
    return LLMService(get_settings())


@lru_cache
def get_band_service() -> BandService:
    return BandService(get_settings())


@lru_cache
def get_investigation_service() -> InvestigationService:
    return InvestigationService(
        get_settings(), get_memory_service(), get_band_service(), get_llm_service()
    )
