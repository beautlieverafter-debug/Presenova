"""
Consistency Analyzer

Analyzes consistency across the presentation:
- Terminology consistency (same terms used throughout)
- Capitalization patterns
- Units and formatting consistency
- Voice and tense consistency
- Abbreviation usage consistency

All analysis is text-based and non-destructive.
"""

import logging
import re
from collections import Counter
from typing import Optional

logger = logging.getLogger(__name__)

# Minimum frequency for a term to be considered "consistent"
MIN_TERM_FREQUENCY = 3


class ConsistencyAnalyzer:
    """Analyzes textual consistency across presentation slides."""

    def analyze(self, slides: list[dict]) -> dict:
        """Analyze consistency across all slides.

        Args:
            slides: List of slide dicts.

        Returns:
            Dict with consistency scores, issues, and recommendations.
        """
        if not slides:
            return self._default()

        # Collect all text from all slides
        all_text_parts = []
        per_slide_texts = []

        for slide in slides:
            slide_texts = []
            for tb in slide.get('textboxes', []):
                for para in tb.get('paragraphs', []):
                    text = para.get('text', '') if isinstance(para, dict) else str(para)
                    if text.strip():
                        all_text_parts.append(text)
                        slide_texts.append(text)
            per_slide_texts.append((slide.get('slide_number'), slide_texts))

        full_text = ' '.join(all_text_parts)

        # Analyze different consistency dimensions
        terminology_score, term_issues = self._analyze_terminology(all_text_parts)
        capitalization_score, cap_issues = self._analyze_capitalization(full_text)
        tense_score, tense_issues = self._analyze_tense(all_text_parts)
        abbreviation_score, abbr_issues = self._analyze_abbreviations(all_text_parts)
        formatting_score, fmt_issues = self._analyze_formatting(full_text)

        all_issues = term_issues + cap_issues + tense_issues + abbr_issues + fmt_issues

        # Overall consistency score
        scores = [terminology_score, capitalization_score, tense_score,
                  abbreviation_score, formatting_score]
        overall_score = round(sum(scores) / len(scores))

        recommendations = []
        if terminology_score < 70:
            recommendations.append("Standardize terminology — use the same terms consistently across slides.")
        if capitalization_score < 70:
            recommendations.append("Fix capitalization inconsistencies — ensure consistent use of title case vs sentence case.")
        if tense_score < 70:
            recommendations.append("Maintain consistent verb tense throughout the presentation.")
        if abbreviation_score < 70:
            recommendations.append("Define abbreviations on first use and use them consistently.")

        return {
            'consistency_score': overall_score,
            'terminology_score': terminology_score,
            'capitalization_score': capitalization_score,
            'tense_score': tense_score,
            'abbreviation_score': abbreviation_score,
            'formatting_score': formatting_score,
            'issues': all_issues[:20],  # Limit to top issues
            'issue_count': len(all_issues),
            'recommendations': recommendations,
        }

    def _analyze_terminology(self, texts: list[str]) -> tuple[int, list[str]]:
        """Check for terminology consistency.

        Identifies terms that appear with variations across slides.
        """
        issues = []

        # Find repeated multi-word terms
        bigrams = Counter()
        trigrams = Counter()
        for text in texts:
            words = text.lower().split()
            for i in range(len(words) - 1):
                bigrams[' '.join(words[i:i + 1])] += 1
            for i in range(len(words) - 2):
                trigrams[' '.join(words[i:i + 2])] += 1

        # Check for variant spellings (simplified)
        # Look for common capitalization variants
        case_variants = set()
        for text in texts:
            words = text.split()
            for word in words:
                if len(word) > 3:
                    lower = word.lower()
                    if lower != word and len(lower) > 0:
                        case_variants.add((lower, word))

        if case_variants:
            issues.append(f"Found {len(case_variants)} possible case variants of terms.")

        # Score based on how many terms are used consistently
        score = 80  # Baseline
        if len(issues) > 2:
            score -= 10 * len(issues)
        return max(30, min(100, score)), issues[:5]

    def _analyze_capitalization(self, text: str) -> tuple[int, list[str]]:
        """Analyze capitalization consistency."""
        issues = []
        sentences = re.split(r'[.!?]+', text)

        # Check for inconsistent capitalization at start of sentences
        inconsistent_caps = 0
        for sentence in sentences:
            s = sentence.strip()
            if len(s) > 1:
                if s[0].isupper() and any(c.islower() for c in s[1:5]):
                    pass  # Proper capitalization
                elif s[0].islower() and len(s) > 3:
                    inconsistent_caps += 1

        if inconsistent_caps > len(sentences) * 0.2:
            issues.append(f"{inconsistent_caps} sentences have inconsistent capitalization.")

        # Score: penalize for inconsistencies
        score = 85
        if inconsistent_caps > 0:
            score -= min(30, inconsistent_caps * 5)
        return max(30, min(100, score)), issues[:3]

    def _analyze_tense(self, texts: list[str]) -> tuple[int, list[str]]:
        """Analyze verb tense consistency."""
        issues = []

        # Simple tense markers
        past_tense_markers = {'was', 'were', 'had', 'did', 'made', 'used', 'created',
                              'developed', 'implemented', 'tested', 'analyzed'}
        present_tense_markers = {'is', 'are', 'has', 'have', 'does', 'make', 'use',
                                 'creates', 'develops', 'implements'}

        tenses_found = set()
        for text in texts:
            words = set(text.lower().split())
            if words & past_tense_markers:
                tenses_found.add('past')
            if words & present_tense_markers:
                tenses_found.add('present')

        if len(tenses_found) > 1:
            issues.append(f"Mixed verb tenses detected: {', '.join(sorted(tenses_found))}.")

        score = 85 if len(tenses_found) <= 1 else 60
        return score, issues[:2]

    def _analyze_abbreviations(self, texts: list[str]) -> tuple[int, list[str]]:
        """Analyze abbreviation usage consistency."""
        issues = []

        # Find potential acronyms/abbreviations (all caps, 2+ letters)
        acronyms = Counter()
        for text in texts:
            for word in text.split():
                if re.match(r'^[A-Z]{2,}$', word):
                    acronyms[word] += 1

        # Check if abbreviations are defined on first use
        if acronyms:
            defined_acronyms = set()
            for text in texts:
                for match in re.finditer(r'([A-Z]{2,})\s*\(([A-Z]{2,})\)', text):
                    defined_acronyms.add(match.group(2))
                for match in re.finditer(r'([A-Z]{2,})\s*-\s*([A-Z]{2,})', text):
                    defined_acronyms.add(match.group(2))

            undefined = [a for a in acronyms if a not in defined_acronyms]
            if undefined:
                issues.append(f"Undefined abbreviations: {', '.join(undefined[:5])}.")

        score = 80 if not issues else 60
        return score, issues[:3]

    def _analyze_formatting(self, text: str) -> tuple[int, list[str]]:
        """Analyze text formatting consistency."""
        issues = []

        # Check for mixed bullet styles (markers)
        bullet_markers = set(re.findall(r'^[•\-*+–—]\s', text, re.MULTILINE))
        if len(bullet_markers) > 1:
            issues.append(f"Mixed bullet styles: {' '.join(bullet_markers)}.")

        # Check for inconsistent number formatting
        numbers = re.findall(r'\b\d+(?:\.\d+)?%?\b', text)
        percent_mixed = any('%' in n for n in numbers) and any('%' not in n for n in numbers)
        if percent_mixed and numbers:
            issues.append("Inconsistent percentage formatting (with and without % sign).")

        score = 85 if not issues else 65
        return score, issues[:2]

    def _default(self) -> dict:
        return {
            'consistency_score': 75,
            'terminology_score': 75,
            'capitalization_score': 75,
            'tense_score': 75,
            'abbreviation_score': 75,
            'formatting_score': 75,
            'issues': [],
            'issue_count': 0,
            'recommendations': [],
        }

