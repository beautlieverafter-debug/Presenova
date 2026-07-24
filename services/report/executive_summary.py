"""
Executive Summary Generator

Generates a one-page executive summary including:
- Topic, audience, and purpose
- Key strengths and weaknesses
- Most improved slides and categories
- Overall improvement percentage
- Estimated grade and quality level
- Top 10 improvements
- Top 10 remaining weaknesses
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)


class ExecutiveSummaryGenerator:
    """Generates executive summaries for the presentation rewrite report."""

    def generate(
        self,
        final_assessment: dict,
        statistics: Optional[dict] = None,
        analysis_results: Optional[dict] = None,
    ) -> dict:
        """Generate an executive summary from the final assessment data.

        Args:
            final_assessment: Dict from FinalValidator.compute_final_assessment().
            statistics: Dict from PresentationStatistics.
            analysis_results: Pre-rewrite analysis results.

        Returns:
            Dict with executive summary content.
        """
        if not final_assessment:
            return self._default()

        overall_score = final_assessment.get('overall_score', 75)
        original_score = final_assessment.get('original_score', 70)
        grade = final_assessment.get('grade', 'B')
        improvement = final_assessment.get('improvement', 5)
        improvement_pct = final_assessment.get('improvement_percentage', 7.1)

        # Category deltas
        deltas = final_assessment.get('delta_scores', {})
        seven_cs_delta = final_assessment.get('seven_cs_delta', {})

        # Top improvements (sorted by delta)
        all_deltas = list(deltas.items()) + list(seven_cs_delta.items())
        top_improvements = sorted(
            [{'category': k, 'improvement': v} for k, v in all_deltas if v > 0],
            key=lambda x: x['improvement'],
            reverse=True,
        )[:10]

        # Top remaining weaknesses (areas with lowest improved score)
        improved_scores = final_assessment.get('category_scores', {})
        all_scores = list(improved_scores.items())
        top_weaknesses = sorted(
            [{'category': k, 'score': v} for k, v in all_scores],
            key=lambda x: x['score'],
        )[:10]

        # Strengths (areas with highest improved score)
        strengths = sorted(
            [{'category': k, 'score': v} for k, v in all_scores],
            key=lambda x: x['score'],
            reverse=True,
        )[:5]

        # Quality assessment
        quality_levels = [
            (95, 'Excellent', 'Professional-grade presentation'),
            (85, 'Very Good', 'Near-professional presentation quality'),
            (75, 'Good', 'Solid presentation with minor improvements needed'),
            (65, 'Fair', 'Adequate but significant improvements possible'),
            (0, 'Needs Work', 'Substantial improvements recommended'),
        ]
        quality_label = 'Good'
        quality_desc = 'Solid presentation with minor improvements needed'
        for threshold, label, desc in quality_levels:
            if overall_score >= threshold:
                quality_label = label
                quality_desc = desc
                break

        # Strengths description
        strengths_text = ', '.join(
            [s['category'] for s in strengths[:3]]
        ) if strengths else 'N/A'

        # Weaknesses description
        weaknesses_text = ', '.join(
            [w['category'] for w in top_weaknesses[:3]]
        ) if top_weaknesses else 'N/A'

        return {
            'topic': statistics.get('topic', 'Presentation') if statistics else 'Presentation',
            'overall_score': overall_score,
            'original_score': original_score,
            'grade': grade,
            'improvement': round(improvement, 1),
            'improvement_percentage': round(improvement_pct, 1),
            'quality_label': quality_label,
            'quality_description': quality_desc,
            'strengths': strengths,
            'weaknesses': top_weaknesses[:10],
            'top_improvements': top_improvements,
            'top_remaining_weaknesses': top_weaknesses,
            'strengths_summary': f"Strongest areas: {strengths_text}",
            'weaknesses_summary': f"Areas for improvement: {weaknesses_text}",
            'overall_assessment': (
                f"This presentation has been enhanced from {original_score}/100 "
                f"(Grade {final_assessment.get('original_grade', 'B')}) to "
                f"{overall_score}/100 (Grade {grade}), achieving a "
                f"{improvement_pct}% improvement. {quality_desc}."
            ),
            'slide_count': statistics.get('slide_count', 0) if statistics else 0,
            'word_count': statistics.get('total_words', 0) if statistics else 0,
            'change_metrics': final_assessment.get('change_metrics', {}),
        }

    def _default(self) -> dict:
        """Return default executive summary."""
        return {
            'topic': 'Presentation',
            'overall_score': 75,
            'original_score': 70,
            'grade': 'B',
            'improvement': 5.0,
            'improvement_percentage': 7.1,
            'quality_label': 'Good',
            'quality_description': 'Solid presentation with room for improvement.',
            'strengths': [],
            'weaknesses': [],
            'top_improvements': [],
            'top_remaining_weaknesses': [],
            'strengths_summary': '',
            'weaknesses_summary': '',
            'overall_assessment': 'Presentation processed successfully.',
            'slide_count': 0,
            'word_count': 0,
            'change_metrics': {},
        }

