"""
Rewrite Planner — Enhancement Planning and Batch Management

Handles:
- Processing mode selection (Quick, Professional, Academic)
- Tone injection
- Batch planning for large presentations (100+ slides)
- Token budget tracking
- Rolling summaries between batches
"""

import logging
import math
from typing import Optional

from services.ai.prompts import (
    get_system_prompt,
    get_tone_instruction,
    MODE_SYSTEM_INSTRUCTIONS,
    TONE_INSTRUCTIONS,
)

logger = logging.getLogger(__name__)

# Token budget management (rough estimates: ~4 chars/token)
SAFETY_MARGIN = 0.85  # Reserve 15% for output tokens
MAX_CONTEXT_TOKENS = 128000
MAX_OUTPUT_TOKENS = 8192
# Per-mode token budgets
MODE_TOKEN_MULTIPLIERS = {
    "quick": 0.5,
    "professional": 1.0,
    "academic": 1.3,
}

# Batch sizes per mode
MODE_BATCH_SIZES = {
    "quick": 20,
    "professional": 15,
    "academic": 10,
}


class RewritePlanner:
    """Plans the rewrite process with mode, tone, and batch configuration."""

    def __init__(
        self,
        mode: str = "professional",
        tone: str = "professional",
        max_context_tokens: int = MAX_CONTEXT_TOKENS,
        max_output_tokens: int = MAX_OUTPUT_TOKENS,
    ):
        self.mode = mode if mode in MODE_SYSTEM_INSTRUCTIONS else "professional"
        self.tone = tone if tone in TONE_INSTRUCTIONS else "professional"
        self.max_context_tokens = max_context_tokens
        self.max_output_tokens = max_output_tokens
        self._validate_config()

    def _validate_config(self) -> None:
        """Ensure mode and tone are recognized."""
        if self.mode not in MODE_SYSTEM_INSTRUCTIONS:
            logger.warning(
                "[planner] Unknown mode '%s', falling back to 'professional'.",
                self.mode,
            )
            self.mode = "professional"
        if self.tone not in TONE_INSTRUCTIONS:
            logger.warning(
                "[planner] Unknown tone '%s', falling back to 'professional'.",
                self.tone,
            )
            self.tone = "professional"

    @property
    def system_prompt(self) -> str:
        """Get the system prompt for the current mode."""
        return get_system_prompt(self.mode)

    @property
    def tone_instruction(self) -> str:
        """Get the tone instruction for the current tone."""
        return get_tone_instruction(self.tone)

    def get_batch_size(self) -> int:
        """Get the recommended batch size for the current mode."""
        return MODE_BATCH_SIZES.get(self.mode, 15)

    def get_token_multiplier(self) -> float:
        """Get the token multiplier for the current mode."""
        return MODE_TOKEN_MULTIPLIERS.get(self.mode, 1.0)

    def plan_batches(
        self,
        slides: list[dict],
    ) -> list[dict]:
        """Split slides into batches for processing.

        For presentations with < batch_size slides, returns a single batch.
        For larger presentations, creates multiple batches with context carryover.

        Args:
            slides: List of slide dicts.

        Returns:
            List of batch dicts, each with: slides, batch_index, total_batches,
            context_summary (for batch 2+).
        """
        slide_count = len(slides)
        batch_size = self.get_batch_size()

        if slide_count <= batch_size:
            return [{
                'slides': slides,
                'batch_index': 0,
                'total_batches': 1,
                'is_single': True,
                'context_summary': None,
            }]

        # Calculate batches
        num_batches = math.ceil(slide_count / batch_size)
        batches = []
        rolling_context = None

        for i in range(num_batches):
            start = i * batch_size
            end = min(start + batch_size, slide_count)
            batch_slides = slides[start:end]

            batches.append({
                'slides': batch_slides,
                'batch_index': i,
                'total_batches': num_batches,
                'is_single': False,
                'context_summary': rolling_context,
            })

            # Build rolling summary of this batch for next batch
            try:
                rolling_context = self._build_rolling_summary(batch_slides, rolling_context)
            except Exception:
                logger.warning("[planner] Rolling summary failed for batch %d.", i)

        logger.info(
            "[planner] Planned %d batches (size=%d) for %d slides in mode=%s tone=%s",
            num_batches, batch_size, slide_count, self.mode, self.tone,
        )
        return batches

    def _build_rolling_summary(
        self,
        batch_slides: list[dict],
        previous_summary: Optional[str] = None,
    ) -> str:
        """Build a compact summary of batch slides for context carryover.

        Extracts titles and key points without exceeding token budget.
        """
        lines = []
        if previous_summary:
            lines.append(f"[Previous context: {previous_summary[:200]}]")

        for slide in batch_slides:
            title = slide.get('title', 'Untitled')
            # Get first paragraph as summary
            first_para = ''
            for tb in slide.get('textboxes', []):
                for para in tb.get('paragraphs', []):
                    text = para.get('text', '') if isinstance(para, dict) else str(para)
                    if text.strip():
                        first_para = text.strip()[:100]
                        break
                if first_para:
                    break

            lines.append(f"Slide {slide.get('slide_number')}: {title} -> {first_para}")

        summary = ' | '.join(lines)
        # Keep summary under 500 chars to save context
        return summary[:500]

    def estimate_token_budget(
        self,
        slides: list[dict],
    ) -> dict:
        """Estimate token requirements for rewriting slides.

        Returns:
            Dict with estimated_input_tokens, estimated_output_tokens,
            batches_required, fits_in_context.
        """
        total_chars = 0
        for slide in slides:
            for tb in slide.get('textboxes', []):
                for para in tb.get('paragraphs', []):
                    text = para.get('text', '') if isinstance(para, dict) else str(para)
                    total_chars += len(text)

        # Estimate tokens (~4 chars/token)
        estimated_input = total_chars // 4
        multiplier = self.get_token_multiplier()
        estimated_input = int(estimated_input * multiplier)

        # Add overhead for prompt structure
        prompt_overhead = 2000  # System prompt, instructions, schema
        total_estimated = estimated_input + prompt_overhead

        batch_size = self.get_batch_size()
        num_batches = math.ceil(len(slides) / batch_size)

        # Check if it fits in a single context window
        output_reserve = int(self.max_output_tokens * 1.5)  # Reserve for output
        fits_in_context = (total_estimated + output_reserve) <= int(self.max_context_tokens * SAFETY_MARGIN)

        return {
            'estimated_input_tokens': total_estimated,
            'estimated_output_tokens': int(estimated_input * 0.3),  # ~30% of input
            'prompt_overhead_tokens': prompt_overhead,
            'total_estimated_tokens': total_estimated + prompt_overhead,
            'batches_required': num_batches,
            'fits_in_single_context': fits_in_context,
            'mode': self.mode,
            'tone': self.tone,
        }

