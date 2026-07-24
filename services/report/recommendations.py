"""
Recommendations Generator — AI Recommendations with Priority

Generates categorized recommendations:
- Writing improvements
- Design improvements
- Delivery improvements
- Storytelling improvements
- Visual Communication improvements
- Professionalism improvements
- Academic Quality improvements

Each recommendation includes:
- Priority (high, medium, low)
- Reason for the recommendation
- Expected impact of implementing it
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Priority weights for scoring
PRIORITY_SCORES = {'high': 90, 'medium': 65, 'low': 40}
IMPACT_LEVELS = {'high': 'Significant improvement expected', 'medium': 'Moderate improvement expected', 'low': 'Minor improvement expected'}


class RecommendationsGenerator:
    """Generates categorized, prioritized recommendations."""

    def generate(
        self,
        final_assessment: dict,
        analysis_results: Optional[dict] = None,
        design_results: Optional[dict] = None,
        storytelling_results: Optional[dict] = None,
        consistency_results: Optional[dict] = None,
        accessibility_results: Optional[dict] = None,
        speaker_results: Optional[dict] = None,
    ) -> dict:
        """Generate comprehensive recommendations from all analysis results.

        Args:
            final_assessment: Dict from FinalValidator.compute_final_assessment().
            analysis_results: Pre-rewrite quality analysis results.
            design_results: Design analysis results.
            storytelling_results: Storytelling analysis results.
            consistency_results: Consistency analysis results.
            accessibility_results: Accessibility analysis results.
            speaker_results: Speaker readiness analysis results.

        Returns:
            Dict with categorized recommendations.
        """
        recommendations = []

        # ── Writing Recommendations ────────────────────────────────────
        writing_recs = self._generate_writing_recs(final_assessment, analysis_results)
        recommendations.extend(writing_recs)

        # ── Design Recommendations ─────────────────────────────────────
        design_recs = self._generate_design_recs(design_results)
        recommendations.extend(design_recs)

        # ── Storytelling Recommendations ───────────────────────────────
        storytelling_recs = self._generate_storytelling_recs(storytelling_results)
        recommendations.extend(storytelling_recs)

        # ── Consistency Recommendations ────────────────────────────────
        consistency_recs = self._generate_consistency_recs(consistency_results)
        recommendations.extend(consistency_recs)

        # ── Accessibility Recommendations ──────────────────────────────
        accessibility_recs = self._generate_accessibility_recs(accessibility_results)
        recommendations.extend(accessibility_recs)

        # ── Speaker/Delivery Recommendations ───────────────────────────
        speaker_recs = self._generate_speaker_recs(speaker_results)
        recommendations.extend(speaker_recs)

        # Sort by priority
        priority_order = {'high': 0, 'medium': 1, 'low': 2}
        recommendations.sort(key=lambda r: priority_order.get(r.get('priority', 'low'), 3))

        # Categorize
        categorized = {}
        for rec in recommendations:
            category = rec.get('category', 'General')
            if category not in categorized:
                categorized[category] = []
            categorized[category].append(rec)

        return {
            'recommendations': recommendations,
            'categorized': categorized,
            'total_recommendations': len(recommendations),
            'high_priority_count': sum(1 for r in recommendations if r.get('priority') == 'high'),
            'medium_priority_count': sum(1 for r in recommendations if r.get('priority') == 'medium'),
            'low_priority_count': sum(1 for r in recommendations if r.get('priority') == 'low'),
        }

    def _generate_writing_recs(
        self,
        final_assessment: dict,
        analysis_results: Optional[dict] = None,
    ) -> list[dict]:
        """Generate writing-related recommendations."""
        recs = []
        category_scores = final_assessment.get('category_scores', {})

        if category_scores.get('Grammar', 100) < 80:
            recs.append({
                'category': 'Writing',
                'priority': 'high',
                'recommendation': 'Review grammar in several slides for improved correctness.',
                'reason': f"Grammar score: {category_scores.get('Grammar', 0)}/100",
                'expected_impact': 'Professional-grade grammar throughout.',
            })

        if category_scores.get('Conciseness', 100) < 75:
            recs.append({
                'category': 'Writing',
                'priority': 'medium',
                'recommendation': 'Shorten verbose bullet points. Focus on one idea per bullet.',
                'reason': f"Conciseness score: {category_scores.get('Conciseness', 0)}/100",
                'expected_impact': 'More scannable, presentation-friendly slides.',
            })

        if category_scores.get('Clarity', 100) < 75:
            recs.append({
                'category': 'Writing',
                'priority': 'high',
                'recommendation': 'Improve clarity by using simpler language and more direct phrasing.',
                'reason': f"Clarity score: {category_scores.get('Clarity', 0)}/100",
                'expected_impact': 'Clearer message delivery to the audience.',
            })

        if analysis_results and analysis_results.get('issues_found'):
            recs.append({
                'category': 'Writing',
                'priority': 'medium',
                'recommendation': 'Address identified issues: ' + '; '.join(analysis_results['issues_found'][:3]),
                'reason': 'Improves overall presentation quality.',
                'expected_impact': 'Higher quality scores across all categories.',
            })

        return recs

    def _generate_design_recs(
        self,
        design_results: Optional[dict] = None,
    ) -> list[dict]:
        """Generate design-related recommendations."""
        recs = []
        if not design_results:
            return recs

        design_score = design_results.get('design_score', 75)
        bullet_overload = design_results.get('bullet_overload_slides', 0)

        if design_score < 60:
            recs.append({
                'category': 'Design',
                'priority': 'high',
                'recommendation': 'Improve visual balance. Consider reorganizing content across slides.',
                'reason': f"Design score: {design_score}/100 indicates overcrowded slides.",
                'expected_impact': 'More professional, scannable slide layouts.',
            })

        if bullet_overload > 0:
            recs.append({
                'category': 'Design',
                'priority': 'medium',
                'recommendation': f'Split content in {bullet_overload} slide(s) with too many bullet points.',
                'reason': 'Slides with >7 bullets reduce audience retention.',
                'expected_impact': 'Better audience focus and information retention.',
            })

        return recs

    def _generate_storytelling_recs(
        self,
        storytelling_results: Optional[dict] = None,
    ) -> list[dict]:
        """Generate storytelling-related recommendations."""
        recs = []
        if not storytelling_results:
            return recs

        narrative_score = storytelling_results.get('narrative_score', 65)
        hook_score = storytelling_results.get('hook_score', 65)
        missing_sections = storytelling_results.get('missing_sections', [])

        if narrative_score < 60:
            recs.append({
                'category': 'Storytelling',
                'priority': 'high',
                'recommendation': 'Strengthen the narrative arc. Ensure a clear beginning, middle, and end.',
                'reason': f"Narrative score: {narrative_score}/100.",
                'expected_impact': 'More compelling and memorable presentation.',
            })

        if hook_score < 60:
            recs.append({
                'category': 'Storytelling',
                'priority': 'high',
                'recommendation': 'Improve the opening hook to grab audience attention immediately.',
                'reason': f"Hook score: {hook_score}/100. Weak opening reduces engagement.",
                'expected_impact': 'Stronger first impression and audience engagement.',
            })

        if missing_sections:
            recs.append({
                'category': 'Storytelling',
                'priority': 'medium',
                'recommendation': f"Add missing narrative sections: {', '.join(missing_sections[:3])}.",
                'reason': 'Complete story structure increases persuasiveness.',
                'expected_impact': 'More complete and persuasive presentation.',
            })

        return recs

    def _generate_consistency_recs(
        self,
        consistency_results: Optional[dict] = None,
    ) -> list[dict]:
        recs = []
        if not consistency_results:
            return recs

        consistency_score = consistency_results.get('consistency_score', 75)
        issues = consistency_results.get('issues', [])

        if consistency_score < 60:
            recs.append({
                'category': 'Consistency',
                'priority': 'medium',
                'recommendation': 'Standardize terminology and formatting across all slides.',
                'reason': f"Consistency score: {consistency_score}/100.",
                'expected_impact': 'More professional, coherent presentation.',
            })

        if issues:
            recs.append({
                'category': 'Consistency',
                'priority': 'low',
                'recommendation': '; '.join(issues[:2]),
                'reason': 'Improves overall consistency.',
                'expected_impact': 'Better consistency across the presentation.',
            })

        return recs

    def _generate_accessibility_recs(
        self,
        accessibility_results: Optional[dict] = None,
    ) -> list[dict]:
        recs = []
        if not accessibility_results:
            return recs

        a11y_score = accessibility_results.get('accessibility_score', 75)

        if a11y_score < 60:
            recs.append({
                'category': 'Accessibility',
                'priority': 'medium',
                'recommendation': 'Improve text contrast and font sizes for better readability.',
                'reason': f"Accessibility score: {a11y_score}/100.",
                'expected_impact': 'More inclusive and readable presentation.',
            })

        return recs

    def _generate_speaker_recs(
        self,
        speaker_results: Optional[dict] = None,
    ) -> list[dict]:
        recs = []
        if not speaker_results:
            return recs

        readiness = speaker_results.get('speaker_readiness_score', 70)
        filler_density = speaker_results.get('filler_density', 0)

        if readiness < 60:
            recs.append({
                'category': 'Delivery',
                'priority': 'high',
                'recommendation': 'Practice presentation delivery to build confidence.',
                'reason': f"Speaker readiness score: {readiness}/100.",
                'expected_impact': 'More confident and engaging delivery.',
            })

        if filler_density > 0.05:
            recs.append({
                'category': 'Delivery',
                'priority': 'medium',
                'recommendation': 'Reduce filler words and uncertain language in speaker notes.',
                'reason': f"Filler density: {filler_density:.1%}.",
                'expected_impact': 'More authoritative and confident presentation style.',
            })

        if not speaker_results.get('has_qa_slide', False):
            recs.append({
                'category': 'Delivery',
                'priority': 'low',
                'recommendation': 'Add a dedicated Q&A slide to prepare for audience questions.',
                'reason': 'Q&A slides help presenters feel more prepared.',
                'expected_impact': 'Better audience engagement and presenter confidence.',
            })

        return recs

