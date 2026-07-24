"""
Holistic Presentation Analyzer

Understands the presentation as a whole:
- Overall topic identification
- Main objective/purpose assessment
- Presentation type classification
- Target audience analysis
- Story flow evaluation
- Key themes extraction
- Tone guidance generation
- Per-slide role assignment
"""

import json
import logging
import re
from typing import Optional

from services.ai import get_provider
from services.ai.base_provider import AIProvider
from services.ai.prompts import build_presentation_context_prompt

logger = logging.getLogger(__name__)


class HolisticAnalyzer:
    """Analyzes the entire presentation to understand context and structure."""

    # Fallback slide-type patterns (used when AI is unavailable)
    TYPE_SIGNALS = [
        (r'\b(agenda|outline|overview|roadmap|table of contents)\b', 'Agenda / Outline'),
        (r'\b(introduction|intro|background|context)\b', 'Introduction / Background'),
        (r'\b(problem|challenge|pain point|issue|gap)\b', 'Problem Statement'),
        (r'\b(objective|goal|aim|purpose|mission|vision)\b', 'Objectives / Goals'),
        (r'\b(literature|related work|prior work|background study)\b', 'Literature Review'),
        (r'\b(methodology|approach|method|technique|framework|strategy)\b', 'Methodology / Approach'),
        (r'\b(architecture|system design|system architecture)\b', 'Architecture / System Design'),
        (r'\b(result|finding|outcome|discovery|observation|insight)\b', 'Results / Findings'),
        (r'\b(conclusion|summary|takeaway|key point|wrap.up|recap)\b', 'Conclusion / Summary'),
        (r'\b(future work|next steps|future direction|upcoming)\b', 'Future Work / Next Steps'),
        (r'\b(thank|questions\?|qa|q&a|discuss|contact)\b', 'Thank You / Q&A'),
        (r'\b(timeline|schedule|milestone|deadline|roadmap|gantt)\b', 'Timeline / Milestones'),
    ]

    def __init__(self, provider: Optional[AIProvider] = None):
        """Initialize with an optional AI provider.

        Args:
            provider: AI provider for AI-powered analysis. Falls back to heuristic if None.
        """
        self.provider = provider or get_provider()

    def analyze(self, slides: list[dict]) -> dict:
        """Perform holistic analysis of the presentation.

        Args:
            slides: List of slide dicts from ppt_processor.extract_slides().

        Returns:
            Dict with keys: overall_topic, main_objective, presentation_type,
            technical_level, audience, story_flow, key_themes, tone_guidance,
            slide_roles, source (ai|heuristic).
        """
        if not slides:
            return self._empty_result()

        # Try AI-powered analysis
        if self.provider and self.provider.is_available():
            try:
                prompt = build_presentation_context_prompt(slides)
                result = self._call_ai(prompt)
                if result and self._validate(result):
                    result['source'] = 'ai'
                    return result
            except Exception as exc:
                logger.warning("[holistic] AI analysis failed: %s", exc)

        # Fallback to heuristic analysis
        logger.info("[holistic] Using heuristic analysis.")
        return self._heuristic_analysis(slides)

    def _call_ai(self, prompt: str) -> Optional[dict]:
        """Call the AI provider for holistic analysis."""
        result = self.provider.generate_structured(
            prompt=prompt,
            temperature=0.2,
            max_output_tokens=2048,
        )
        if isinstance(result, dict):
            return result
        return None

    def _validate(self, result: dict) -> bool:
        """Validate the AI response has all required fields."""
        required = (
            'overall_topic', 'main_objective', 'presentation_type',
            'technical_level', 'audience', 'story_flow',
            'key_themes', 'tone_guidance', 'slide_roles',
        )
        return all(key in result for key in required)

    def _heuristic_analysis(self, slides: list[dict]) -> dict:
        """Perform local heuristic analysis when AI is unavailable."""
        titles = [slide.get('title', '') for slide in slides]
        all_text = ' '.join(
            str(p.get('text', '') if isinstance(p, dict) else str(p))
            for slide in slides
            for tb in slide.get('textboxes', [])
            for p in tb.get('paragraphs', [])
        )

        # Infer topic from first slide title
        topic = titles[0] if titles and titles[0].strip() else 'Untitled Presentation'

        # Assign slide roles heuristically
        roles = {}
        for slide in slides:
            sn = str(slide.get('slide_number'))
            roles[sn] = self._infer_slide_type(slide)

        # Estimate technical level from word count
        word_count = len(all_text.split())
        technical_level = 'academic' if word_count > 500 else 'intermediate'

        return {
            'overall_topic': topic,
            'main_objective': 'Inform and persuade the audience.',
            'presentation_type': 'General presentation',
            'technical_level': technical_level,
            'audience': 'Subject-matter audience',
            'story_flow': 'Introduction → body → conclusion.',
            'key_themes': [],
            'tone_guidance': 'Professional, clear, and concise.',
            'slide_roles': roles,
            'source': 'heuristic',
        }

    def _infer_slide_type(self, slide: dict) -> str:
        """Heuristic to classify slide role based on title and content."""
        title = (slide.get('title') or '').lower().strip()
        full_text = ' '.join(
            str(p.get('text', '') if isinstance(p, dict) else str(p))
            for tb in slide.get('textboxes', [])
            for p in tb.get('paragraphs', [])
        ).lower()

        for pattern, label in self.TYPE_SIGNALS:
            if re.search(pattern, title) or re.search(pattern, full_text[:200]):
                return label

        # Check if it's a title/section divider
        tb_count = len(slide.get('textboxes', []))
        total_text_length = sum(
            len(str(p.get('text', '') if isinstance(p, dict) else str(p)))
            for tb in slide.get('textboxes', [])
            for p in tb.get('paragraphs', [])
        )
        if tb_count <= 1 and total_text_length < 60:
            return 'Section Divider / Title Slide'
        if tb_count >= 5 or total_text_length > 800:
            return 'Detailed Content Section'

        return 'Content Section'

    def _empty_result(self) -> dict:
        """Return empty result for no slides."""
        return {
            'overall_topic': '',
            'main_objective': '',
            'presentation_type': '',
            'technical_level': '',
            'audience': '',
            'story_flow': '',
            'key_themes': [],
            'tone_guidance': '',
            'slide_roles': {},
            'source': 'empty',
        }

