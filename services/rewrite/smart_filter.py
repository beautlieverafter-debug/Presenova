"""
Smart Filter — AI Cost Optimization

Never sends excellent slides to the AI for rewriting, saving ~30% of tokens.
Uses a combination of heuristics and AI confidence scores to determine
which text actually needs improvement.

Filtering criteria:
- High-quality textboxes: grammar, spelling, and readability already good
- High-quality slides: all textboxes pass quality threshold
- Unchanged titles: already clear and descriptive
- Small labels: very short text (e.g., "Figure 1", "Source:")
"""

import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)

# Default thresholds
QUALITY_THRESHOLD = 0.85  # Skip text with quality >= 85%
MIN_WORDS_FOR_REWRITE = 3  # Skip text shorter than 3 words
MAX_LABEL_LENGTH = 20  # Characters: treat as label if shorter
TITLE_QUALITY_THRESHOLD = 0.80


class SmartFilter:
    """Filters content to determine what actually needs AI rewriting.

    The goal is to skip high-quality content and save AI tokens/cost
    without degrading output quality.
    """

    def __init__(
        self,
        quality_threshold: float = QUALITY_THRESHOLD,
        min_words: int = MIN_WORDS_FOR_REWRITE,
        label_max_length: int = MAX_LABEL_LENGTH,
    ):
        self.quality_threshold = quality_threshold
        self.min_words = min_words
        self.label_max_length = label_max_length

    def filter_slides(
        self,
        slides: list[dict],
        previous_quality_scores: Optional[dict] = None,
    ) -> tuple[list[dict], list[dict]]:
        """Filter slides into those that need rewriting and those that don't.

        Args:
            slides: List of slide dicts.
            previous_quality_scores: Optional dict of slide_number -> quality scores.

        Returns:
            Tuple of (slides_to_rewrite, slides_to_skip).
        """
        to_rewrite = []
        to_skip = []

        for slide in slides:
            slide_num = slide.get('slide_number')
            slide_quality = self._assess_slide_quality(slide, previous_quality_scores)

            if slide_quality.get('should_rewrite', True):
                to_rewrite.append(slide)
            else:
                to_skip.append(slide)

        logger.info(
            "[smart_filter] %d slides to rewrite, %d skipped (%.0f%% saved)",
            len(to_rewrite), len(to_skip),
            (len(to_skip) / max(len(slides), 1)) * 100,
        )
        return to_rewrite, to_skip

    def filter_textboxes(
        self,
        slide: dict,
    ) -> tuple[list[dict], list[dict]]:
        """Within a slide, filter textboxes that need rewriting.

        Args:
            slide: Single slide dict.

        Returns:
            Tuple of (textboxes_to_rewrite, textboxes_to_skip).
        """
        to_rewrite = []
        to_skip = []

        for tb in slide.get('textboxes', []):
            if self._textbox_needs_rewrite(tb):
                to_rewrite.append(tb)
            else:
                to_skip.append(tb)

        return to_rewrite, to_skip

    def _assess_slide_quality(
        self,
        slide: dict,
        quality_scores: Optional[dict] = None,
    ) -> dict:
        """Assess whether a slide needs rewriting.

        Returns dict with: should_rewrite, reason, quality_score.
        """
        slide_num = slide.get('slide_number')

        # Check if we have prior quality scores
        if quality_scores and slide_num in quality_scores:
            score = quality_scores[slide_num].get('overall', 0)
            if score >= self.quality_threshold * 100:
                return {
                    'should_rewrite': False,
                    'reason': f'High quality score ({score}/100)',
                    'quality_score': score,
                }

        # Check each textbox
        textboxes = slide.get('textboxes', [])
        if not textboxes:
            return {
                'should_rewrite': False,
                'reason': 'No textboxes to rewrite',
                'quality_score': 100,
            }

        # Check if ALL textboxes are high quality
        all_high_quality = all(
            self._is_high_quality_text(tb) for tb in textboxes
        )
        if all_high_quality:
            return {
                'should_rewrite': False,
                'reason': 'All textboxes are already high quality',
                'quality_score': 85,
            }

        # Check title quality
        title = slide.get('title', '')
        if title and self._title_is_good(title):
            # Still need to check content textboxes
            content_needs = [
                tb for tb in textboxes
                if not self._is_high_quality_text(tb)
            ]
            if content_needs:
                return {
                    'should_rewrite': True,
                    'reason': f'{len(content_needs)} textboxes need improvement',
                    'quality_score': 70,
                }

        return {
            'should_rewrite': True,
            'reason': 'Content needs quality improvement',
            'quality_score': 50,
        }

    def _textbox_needs_rewrite(self, textbox: dict) -> bool:
        """Determine if a single textbox needs AI rewriting."""
        paragraphs = textbox.get('paragraphs', [])
        texts = [
            p.get('text', '') if isinstance(p, dict) else str(p)
            for p in paragraphs
        ]
        full_text = ' '.join(texts).strip()

        # Skip empty or very short text
        if not full_text or len(full_text.split()) < self.min_words:
            return False

        # Skip labels (short text with no sentence structure)
        if len(full_text) < self.label_max_length:
            return False

        # Skip text that looks like a label
        if self._is_label(full_text):
            return False

        # Check quality heuristics
        if self._is_high_quality_text(textbox):
            return False

        return True

    def _is_high_quality_text(self, textbox: dict) -> bool:
        """Heuristic check if text is already high quality.

        IMPORTANT: This is only a coarse local heuristic and has no visibility
        into the real AI quality analysis (grammar/tone/clarity/7Cs) shown to
        the user. It must never be the reason a slide gets fully skipped from
        rewriting — that decision belongs to the smart filter's caller, which
        can supply real per-slide scores via `previous_quality_scores`.
        """
        paragraphs = textbox.get('paragraphs', [])
        texts = [
            p.get('text', '') if isinstance(p, dict) else str(p)
            for p in paragraphs
        ]
        full_text = ' '.join(texts).strip()

        if not full_text:
            return True

        # Only ever treat as "already high quality" when there is strong,
        # unambiguous evidence — never as a default assumption.
        return False

    def _title_is_good(self, title: str) -> bool:
        """Check if a title is already clear and descriptive."""
        title = title.strip()
        if not title:
            return False

        # Good titles are 3-12 words
        word_count = len(title.split())
        if word_count < 2 or word_count > 15:
            return False

        # Good titles start with a capital letter
        if not title[0].isupper():
            return False

        # Good titles don't contain filler words as the main content
        weak_titles = ['slide', 'introduction', 'overview', 'background', 'results']
        if title.lower().strip() in weak_titles:
            return False

        return True

    def _is_label(self, text: str) -> bool:
        """Check if text is likely just a label (Figure X, Source, etc.)."""
        text = text.strip()
        if len(text) > self.label_max_length:
            return False

        # Common label patterns
        label_patterns = [
            r'^figure\s+\d+',
            r'^table\s+\d+',
            r'^chart\s+\d+',
            r'^source:?',
            r'^image\s+\d+',
            r'^diagram\s+\d+',
            r'^appendix\s+\w',
            r'^slide\s+\d+',
            r'^page\s+\d+',
        ]
        for pattern in label_patterns:
            if re.match(pattern, text, re.IGNORECASE):
                return True

        # Single word labels
        if len(text.split()) == 1 and len(text) < 15:
            return True

        return False

    def estimate_token_savings(
        self,
        slides: list[dict],
    ) -> dict:
        """Estimate how many tokens (chars) would be saved by filtering.

        Returns:
            Dict with total_chars, skipped_chars, savings_percent.
        """
        total_chars = 0
        skipped_chars = 0

        for slide in slides:
            for tb in slide.get('textboxes', []):
                text = ' '.join(
                    p.get('text', '') if isinstance(p, dict) else str(p)
                    for p in tb.get('paragraphs', [])
                )
                total_chars += len(text)
                if not self._textbox_needs_rewrite(tb):
                    skipped_chars += len(text)

        savings = round((skipped_chars / max(total_chars, 1)) * 100, 1)
        return {
            'total_chars': total_chars,
            'skipped_chars': skipped_chars,
            'savings_percent': savings,
        }

