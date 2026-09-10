import logging
import os
from functools import lru_cache

from app.services.llm.base import BaseLLMProvider
from app.services.llm.ollama_provider import OllamaProvider
from app.services.llm.openrouter_provider import OpenRouterProvider

logger = logging.getLogger(__name__)

PROVIDERS: dict[str, type[BaseLLMProvider]] = {
    "openrouter": OpenRouterProvider,
    "ollama": OllamaProvider,
}


@lru_cache(maxsize=1)
def get_llm_provider() -> BaseLLMProvider:
    """Return the configured LLM provider.

    Read at call time rather than import time, so the value reflects the
    environment after dotenv has loaded it. (This used to log the freshly
    read setting but select the provider from a stale module-level copy,
    so the log and the behaviour could disagree.)
    """
    provider = os.getenv("LLM_PROVIDER", "openrouter").lower().strip()

    provider_class = PROVIDERS.get(provider)

    if provider_class is None:
        raise ValueError(
            f"Unsupported LLM provider: {provider!r}. "
            f"Set LLM_PROVIDER to one of: {', '.join(sorted(PROVIDERS))}."
        )

    logger.info("Using LLM provider: %s", provider)

    return provider_class()
