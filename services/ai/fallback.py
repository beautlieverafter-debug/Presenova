"""
Fallback Chain Manager

Implements a configurable fallback chain: Primary → Retry → Fallback 1 → Fallback 2 → Local

Key features:
- Per-slide error recovery (never fail the full presentation)
- Automatic fallback model switching
- Performance logging of which model was used
- Abort only if >50% of slides fail
"""

import logging
import time
from typing import Optional, Callable

from services.ai.base_provider import AIProvider
from services.ai.gemini_provider import GeminiProvider

logger = logging.getLogger(__name__)


class FallbackManager:
    """Manages a fallback chain of AI providers and local fallbacks.

    The chain is:
    1. Primary provider (e.g. Gemini)
    2. Retry with same provider (up to max_retries)
    3. Fallback provider 1
    4. Fallback provider 2
    5. Local deterministic fallback
    """

    def __init__(
        self,
        primary_provider: Optional[AIProvider] = None,
        fallback_providers: Optional[list[AIProvider]] = None,
        local_fallback_fn: Optional[Callable] = None,
        max_retries: int = 2,
        failure_threshold: float = 0.5,
    ):
        """Initialize fallback manager.

        Args:
            primary_provider: The primary AI provider.
            fallback_providers: Ordered list of fallback providers.
            local_fallback_fn: Function to call when all AI providers fail.
            max_retries: Number of retries per provider.
            failure_threshold: Max fraction of items that can fail (default 0.5 = 50%).
        """
        self.primary = primary_provider or GeminiProvider()
        self.fallbacks = fallback_providers or []
        self.local_fallback = local_fallback_fn
        self.max_retries = max_retries
        self.failure_threshold = failure_threshold
        self.usage_log: list[dict] = []

    def execute_with_fallback(
        self,
        items: list,
        process_fn: Callable,
        item_name_fn: Optional[Callable] = None,
        fallback_fn: Optional[Callable] = None,
    ) -> list:
        """Process a list of items with per-item fallback recovery.

        Each item is processed independently. If processing fails for an item,
        fallback providers and local fallback are tried. If >50% of items fail,
        the entire operation is aborted.

        Args:
            items: List of items to process.
            process_fn: Function that processes a single item using a provider.
            item_name_fn: Optional function to get a display name for an item.
            fallback_fn: Optional per-item local fallback function.

        Returns:
            List of results (may contain fallback results for failed items).
        """
        results: list = []
        failures = 0
        total = len(items)

        for idx, item in enumerate(items):
            item_name = item_name_fn(item) if item_name_fn else f"item_{idx}"
            result = self._process_single(item, idx, item_name, process_fn, fallback_fn)

            if result is None:
                failures += 1
                results.append(None)
            else:
                results.append(result)

            # Check abort condition
            if total > 0 and failures / total > self.failure_threshold:
                logger.error(
                    "[fallback] Aborting: failure rate %.0f%% exceeds threshold of %.0f%%",
                    (failures / total) * 100, self.failure_threshold * 100,
                )
                raise RuntimeError(
                    f"Processing aborted: {failures}/{total} items failed, "
                    f"exceeding {self.failure_threshold * 100:.0f}% threshold."
                )

        logger.info(
            "[fallback] Completed: %d/%d succeeded, %d failures",
            total - failures, total, failures,
        )
        return results

    def _process_single(
        self,
        item,
        idx: int,
        item_name: str,
        process_fn: Callable,
        fallback_fn: Optional[Callable] = None,
    ):
        """Process a single item through the fallback chain."""
        # Chain 1: Primary provider
        for attempt in range(self.max_retries + 1):
            try:
                result = process_fn(self.primary, item, idx)
                self._log_usage("primary", self.primary.get_model_info(), attempt, True)
                return result
            except Exception as exc:
                logger.warning(
                    "[fallback] %s — primary attempt %d failed: %s",
                    item_name, attempt + 1, exc,
                )
                if attempt < self.max_retries:
                    time.sleep(1.0)

        # Chain 2: Fallback providers
        for fb_idx, fb_provider in enumerate(self.fallbacks):
            try:
                result = process_fn(fb_provider, item, idx)
                self._log_usage(f"fallback_{fb_idx}", fb_provider.get_model_info(), 0, True)
                return result
            except Exception as exc:
                logger.warning(
                    "[fallback] %s — fallback %d failed: %s",
                    item_name, fb_idx, exc,
                )

        # Chain 3: Local fallback function
        if fallback_fn:
            try:
                result = fallback_fn(item, idx)
                self._log_usage("local_fallback", {"provider": "local"}, 0, True)
                return result
            except Exception as exc:
                logger.error("[fallback] %s — local fallback also failed: %s", item_name, exc)

        # Chain 4: Generic local fallback
        if self.local_fallback:
            try:
                result = self.local_fallback(item, idx)
                self._log_usage("local_fallback_fn", {"provider": "local"}, 0, True)
                return result
            except Exception as exc:
                logger.error("[fallback] %s — generic fallback failed: %s", item_name, exc)

        self._log_usage("all_failed", {}, 0, False)
        return None

    def _log_usage(
        self,
        source: str,
        model_info: dict,
        attempt: int,
        success: bool,
    ) -> None:
        """Log a usage record for performance tracking."""
        record = {
            "source": source,
            "model_info": model_info,
            "attempt": attempt,
            "success": success,
            "timestamp": time.time(),
        }
        self.usage_log.append(record)
        if len(self.usage_log) > 1000:
            self.usage_log = self.usage_log[-500:]

    def get_usage_summary(self) -> dict:
        """Return a summary of provider usage and failures."""
        total = len(self.usage_log)
        successes = sum(1 for r in self.usage_log if r["success"])
        failures = total - successes
        sources = {}
        for r in self.usage_log:
            src = r["source"]
            sources.setdefault(src, {"calls": 0, "successes": 0, "failures": 0})
            sources[src]["calls"] += 1
            if r["success"]:
                sources[src]["successes"] += 1
            else:
                sources[src]["failures"] += 1

        return {
            "total_calls": total,
            "successful": successes,
            "failed": failures,
            "success_rate": round((successes / total * 100), 1) if total else 0,
            "by_source": sources,
        }

    def reset_usage_log(self) -> None:
        """Clear the usage log."""
        self.usage_log = []

