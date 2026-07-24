"""
Language Tool Service
Optional grammar pre-pass using LanguageTool (Java-based local server).
Degrades gracefully if Java / LanguageTool is not installed.

The detected grammar issues are used to ENRICH the Gemini prompt so Gemini
knows exactly which mistakes to correct, producing higher-quality rewrites.
"""

import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

# ── Lazy singleton ──────────────────────────────────────────────────────────
_lt_tool = None
_lt_available: Optional[bool] = None  # None = not yet checked


def _get_tool():
    """Return a cached LanguageTool instance, or None if unavailable."""
    global _lt_tool, _lt_available

    if os.getenv('PRESENTATION_REWRITER_ENABLE_GRAMMAR_CHECK', '0').strip().lower() not in {'1', 'true', 'yes', 'on'}:
        _lt_available = False
        return None

    if _lt_available is True:
        return _lt_tool

    if _lt_available is False:
        return None

    # First call — try to initialise
    try:
        import language_tool_python  # type: ignore
        _lt_tool = language_tool_python.LanguageTool('en-US')
        _lt_available = True
        logger.info("[language_tool_service] LanguageTool initialised successfully.")
        return _lt_tool
    except Exception as exc:
        _lt_available = False
        logger.warning(
            f"[language_tool_service] LanguageTool unavailable (Java may not be installed): {exc}. "
            "Skipping grammar pre-pass — Gemini will handle all grammar corrections."
        )
        return None


# ── Public API ───────────────────────────────────────────────────────────────

def check_grammar(text: str) -> list[dict]:
    """
    Run LanguageTool on the given text and return a list of match dicts:
      {
        "rule_id":   str,
        "message":   str,
        "context":   str,   # the problematic snippet
        "offset":    int,
        "length":    int,
        "replacements": list[str]  # suggested fixes
      }

    Returns an empty list if LanguageTool is unavailable or text is too short.
    """
    if not text or len(text.strip()) < 10:
        return []

    tool = _get_tool()
    if tool is None:
        return []

    try:
        matches = tool.check(text)
        results = []
        for m in matches:
            rule_id = getattr(m, 'ruleId', None)
            replacements = getattr(m, 'replacements', []) or []
            results.append({
                "rule_id":      rule_id,
                "message":      getattr(m, 'message', ''),
                "context":      getattr(m, 'context', ''),
                "offset":       getattr(m, 'offset', 0),
                "length":       getattr(m, 'errorLength', 0),
                "replacements": list(replacements[:3]),  # top-3 suggestions
            })
        logger.info(f"[language_tool_service] Found {len(results)} grammar issues.")
        return results
    except Exception as exc:
        logger.warning(f"[language_tool_service] Grammar check failed: {exc}")
        return []


def summarise_grammar_issues(matches: list[dict], max_issues: int = 20) -> str:
    """
    Convert raw LanguageTool matches into a compact human-readable summary
    that can be appended to the Gemini prompt for enriched correction.
    """
    if not matches:
        return ""

    lines = ["The following specific grammar/spelling issues were detected:"]
    for i, m in enumerate(matches[:max_issues], 1):
        rule_id = m.get('rule_id') or 'unknown'
        fix = f" → suggest: '{m['replacements'][0]}'" if m.get('replacements') else ""
        context = str(m.get('context', ''))
        message = str(m.get('message', ''))
        if len(context) > 60:
            context = context[:60] + '…'
        lines.append(f"  {i}. [{rule_id}] {message} (context: \"{context}\"){fix}")

    if len(matches) > max_issues:
        lines.append(f"  … and {len(matches) - max_issues} more issues.")

    return "\n".join(lines)


def is_available() -> bool:
    """Return True if LanguageTool is usable."""
    return _get_tool() is not None
