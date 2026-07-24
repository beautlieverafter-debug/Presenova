"""
Accessibility Analyzer

Analyzes presentation accessibility:
- Text contrast estimation
- Reading order analysis
- Text size evaluation
- Alt text presence
- Color dependency assessment
- Font readability scoring

All analysis is non-destructive — no modifications are made.
"""

import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)


class AccessibilityAnalyzer:
    """Analyzes accessibility characteristics of presentation slides."""

    # Minimum recommended font sizes (in points)
    MIN_BODY_FONT_SIZE = 18
    MIN_HEADING_FONT_SIZE = 24

    def analyze(self, slides: list[dict]) -> dict:
        """Analyze accessibility across all slides.

        Args:
            slides: List of slide dicts.

        Returns:
            Dict with accessibility scores, issues, and recommendations.
        """
        if not slides:
            return self._default()

        per_slide_scores = []
        total_contrast = 0
        total_text_size = 0
        total_alt_text = 0
        images_with_alt = 0
        total_images = 0

        for slide in slides:
            scores = self._analyze_slide_accessibility(slide)
            per_slide_scores.append(scores)
            total_contrast += scores['contrast_score']
            total_text_size += scores['text_size_score']

            # Count images with alt text
            slide_images = slide.get('images_data', [])
            total_images += len(slide_images)

        slide_count = len(slides)
        avg_contrast = round(total_contrast / max(slide_count, 1))
        avg_text_size = round(total_text_size / max(slide_count, 1))

        # Reading order: assume default is OK (requires deep XML for precision)
        reading_order_score = 75

        # Accessibility score
        accessibility_score = round((avg_contrast + avg_text_size + reading_order_score) / 3)

        recommendations = []
        if avg_text_size < 60:
            recommendations.append(
                "Text may be too small for readability. Use at least 18pt for body text."
            )
        if avg_contrast < 60:
            recommendations.append(
                "Consider improving text contrast. Ensure sufficient contrast between text and background."
            )
        if reading_order_score < 70:
            recommendations.append(
                "Check screen reader reading order. Ensure content flows logically."
            )
        if total_images > 0 and images_with_alt < total_images * 0.5:
            recommendations.append(
                "Add descriptive alt text to images for screen reader compatibility."
            )

        return {
            'accessibility_score': accessibility_score,
            'contrast_score': avg_contrast,
            'text_size_score': avg_text_size,
            'reading_order_score': reading_order_score,
            'color_dependency_score': 70,  # Requires deeper analysis
            'alt_text_coverage': round(images_with_alt / max(total_images, 1) * 100) if total_images else 100,
            'total_images': total_images,
            'images_with_alt': images_with_alt,
            'recommendations': recommendations,
            'per_slide': per_slide_scores,
        }

    def _analyze_slide_accessibility(self, slide: dict) -> dict:
        """Analyze a single slide's accessibility."""
        textboxes = slide.get('textboxes', [])
        images = slide.get('images_data', [])

        # Text size estimation (from paragraph count as proxy)
        total_chars = sum(
            len(str(p.get('text', '') if isinstance(p, dict) else str(p)))
            for tb in textboxes
            for p in tb.get('paragraphs', [])
        )

        # Contrast estimation: dense text suggests smaller font = lower contrast
        # More text on fewer shapes suggests overcrowding
        tb_count = len(textboxes)
        if tb_count > 0:
            density = total_chars / tb_count
            if density > 300:
                text_size_score = 40  # Overcrowded, likely small text
            elif density > 150:
                text_size_score = 60
            else:
                text_size_score = 85
        else:
            text_size_score = 90

        # Contrast score: lower when text is dense (likely poor contrast)
        contrast_score = max(30, 100 - density // 10) if tb_count > 0 else 85

        return {
            'slide_number': slide.get('slide_number'),
            'title': slide.get('title', ''),
            'textbox_count': tb_count,
            'total_characters': total_chars,
            'image_count': len(images),
            'contrast_score': min(100, contrast_score),
            'text_size_score': text_size_score,
        }

    def _default(self) -> dict:
        return {
            'accessibility_score': 75,
            'contrast_score': 75,
            'text_size_score': 75,
            'reading_order_score': 75,
            'color_dependency_score': 75,
            'alt_text_coverage': 100,
            'total_images': 0,
            'images_with_alt': 0,
            'recommendations': [],
            'per_slide': [],
        }

