"""
Storytelling Analyzer

Analyzes the narrative structure and storytelling quality of a presentation:
- Hook strength (does the opening grab attention?)
- Narrative arc (clear beginning, middle, end?)
- Pacing (do slides flow at the right speed?)
- Transitions (logical bridges between slides)
- Conclusion impact
- Missing sections identification
- Section type classification (hook, intro, problem, solution, etc.)
"""

import json
import logging
import re
from typing import Optional

from services.ai import get_provider
from services.ai.base_provider import AIProvider
from services.ai.prompts import build_narrative_analysis_prompt

logger = logging.getLogger(__name__)

# Expected narrative sections for a complete presentation
NARRATIVE_SECTIONS = [
    'hook', 'introduction', 'problem', 'solution',
    'evidence', 'results', 'conclusion', 'call_to_action',
]


class StorytellingAnalyzer:
    """Analyzes presentation narrative and storytelling quality."""

    def __init__(self, provider: Optional[AIProvider] = None):
        self.provider = provider or get_provider()

    def analyze(self, slides: list[dict]) -> dict:
        """Analyze storytelling quality of the presentation.

        Args:
            slides: List of slide dicts.

        Returns:
            Dict with hook_score, narrative_score, pacing_score, etc.
        """
        if not slides:
            return self._default()

        if self.provider and self.provider.is_available():
            try:
                prompt = build_narrative_analysis_prompt(slides)
                result = self.provider.generate_structured(
                    prompt=prompt,
                    temperature=0.3,
                    max_output_tokens=2048,
                )
                if isinstance(result, dict) and 'overall_storytelling_score' in result:
                    return self._normalize(result)
            except Exception as exc:
                logger.warning("[storytelling] AI analysis failed: %s", exc)

        return self._heuristic_analysis(slides)

    def _heuristic_analysis(self, slides: list[dict]) -> dict:
        """Perform heuristic storytelling analysis."""
        slide_count = len(slides)

        # Extract titles and first lines
        titles = [slide.get('title', '').lower() for slide in slides]
        first_texts = []
        for slide in slides:
            text = ''
            for tb in slide.get('textboxes', []):
                for para in tb.get('paragraphs', []):
                    t = para.get('text', '') if isinstance(para, dict) else str(para)
                    if t.strip():
                        text = t.lower()
                        break
                if text:
                    break
            first_texts.append(text)

        # Detect sections
        found_sections = set()
        for title in titles:
            for section in NARRATIVE_SECTIONS:
                if section.replace('_', ' ') in title:
                    found_sections.add(section)

        # Hook detection (first slide)
        hook_score = 50
        if titles and titles[0]:
            if any(w in titles[0] for w in ['welcome', 'introduction', 'overview', 'hello']):
                hook_score = 40
            elif any(w in titles[0] for w in ['problem', 'challenge', 'did you know', 'imagine']):
                hook_score = 80

        # Narrative score based on section coverage
        section_coverage = len(found_sections) / len(NARRATIVE_SECTIONS)
        narrative_score = round(section_coverage * 100)

        # Conclusion detection (last slide)
        conclusion_score = 40
        if titles and titles[-1]:
            if any(w in titles[-1] for w in ['conclusion', 'summary', 'thank', 'next steps']):
                conclusion_score = 80

        # Pacing based on slide count vs content
        total_words = sum(
            len(str(p.get('text', '') if isinstance(p, dict) else str(p)))
            for slide in slides
            for tb in slide.get('textboxes', [])
            for p in tb.get('paragraphs', [])
        )
        pacing_score = min(100, round((total_words / max(slide_count, 1)) / 50 * 100))

        # Weakest/strongest transitions
        missing = [s for s in NARRATIVE_SECTIONS if s not in found_sections]

        feedback = f"Found {len(found_sections)}/{len(NARRATIVE_SECTIONS)} narrative sections."
        if missing:
            feedback += f" Missing: {', '.join(missing)}."

        return {
            'hook_score': hook_score,
            'narrative_score': narrative_score,
            'pacing_score': pacing_score,
            'conclusion_score': conclusion_score,
            'transitions_score': round((narrative_score + hook_score) / 2),
            'overall_storytelling_score': round(
                (hook_score + narrative_score + pacing_score + conclusion_score) / 4
            ),
            'weakest_transition': self._find_weakest_transition(titles),
            'strongest_transition': '',
            'missing_sections': missing,
            'suggested_order': [],
            'feedback': feedback,
        }

    def _find_weakest_transition(self, titles: list[str]) -> str:
        """Heuristic to find weakest transition between slides."""
        if len(titles) < 2:
            return ''
        for i in range(len(titles) - 1):
            t1 = titles[i] if i < len(titles) else ''
            t2 = titles[i + 1] if i + 1 < len(titles) else ''
            if t1 and t2:
                # If titles have no common theme words, transition may be weak
                words1 = set(t1.split())
                words2 = set(t2.split())
                common = words1 & words2
                if not common and len(words1) > 0 and len(words2) > 0:
                    return f'Slide {i + 1} to {i + 2}'
        return ''

    def _normalize(self, result: dict) -> dict:
        defaults = self._default()
        defaults.update(result)
        return defaults

    def _default(self) -> dict:
        return {
            'hook_score': 65,
            'narrative_score': 65,
            'pacing_score': 65,
            'conclusion_score': 65,
            'transitions_score': 65,
            'overall_storytelling_score': 65,
            'weakest_transition': '',
            'strongest_transition': '',
            'missing_sections': list(NARRATIVE_SECTIONS),
            'suggested_order': [],
            'feedback': 'Storytelling analysis was not available.',
        }

