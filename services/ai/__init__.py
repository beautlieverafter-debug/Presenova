"""
AI Provider Package — Provider Abstraction Layer

Provides a provider-agnostic interface for LLM interactions.
Current providers: Gemini
Future-ready: OpenAI, Claude, DeepSeek, Llama, Mistral

Usage:
    from services.ai import AIProviderRegistry, get_provider
    
    provider = get_provider()
    response = provider.generate("Your prompt here")
"""

import logging
from typing import Optional
from services.ai.base_provider import AIProvider
from services.ai.gemini_provider import GeminiProvider

logger = logging.getLogger(__name__)

# ── Provider Registry ────────────────────────────────────────────────────────
_registry: dict[str, type[AIProvider]] = {}

def register_provider(name: str, provider_class: type[AIProvider]) -> None:
    """Register an AI provider class by name."""
    _registry[name] = provider_class
    logger.info("[ai] Registered provider: %s -> %s", name, provider_class.__name__)

def list_providers() -> list[str]:
    """Return list of registered provider names."""
    return list(_registry.keys())

def get_provider(name: Optional[str] = None, **kwargs) -> AIProvider:
    """Factory: get a provider instance by name, or the default.

    Falls back to Gemini if the requested provider is not registered.
    """
    if name and name in _registry:
        cls = _registry[name]
        logger.info("[ai] Instantiating provider: %s", name)
        return cls(**kwargs)
    
    # Default: return first registered or Gemini
    if _registry:
        first_name = next(iter(_registry))
        if not name or name not in _registry:
            first_name = next(iter(_registry))
        cls = _registry[first_name]
        logger.info("[ai] Defaulting to provider: %s", first_name)
        return cls(**kwargs)
    
    logger.warning("[ai] No providers registered; creating GeminiProvider directly.")
    return GeminiProvider(**kwargs)


# ── Auto-register built-in providers ─────────────────────────────────────────
try:
    register_provider("gemini", GeminiProvider)
except Exception as exc:
    logger.warning("[ai] Failed to register Gemini provider: %s", exc)


__all__ = [
    "AIProvider", "GeminiProvider", "register_provider", "list_providers", "get_provider",
]

