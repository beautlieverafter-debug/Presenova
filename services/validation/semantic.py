"""
Semantic Validator — Fact Preservation and Meaning Validation

Validates that rewritten slides preserve:
- Facts, numbers, names, and dates
- Technical terms and concepts
- URLs and references
- Original meaning and intent

Uses AI-powered verification when available, with heuristic fallback.
"""

import json
import logging
import re
from typing import Optional

from services.ai import get_provider
from services.ai.base_provider import AIProvider
from services.ai.prompts import build_validation_prompt

logger = logging.getLogger(__name__)


class SemanticValidator:
    """Validates semantic preservation between original and rewritten content."""

    # Patterns for preserving key data types
    URL_PATTERN = re.compile(r'https?://[^\s<>"]+|www\.[^\s<>"]+')
    EMAIL_PATTERN = re.compile(r'[\w.+-]+@[\w-]+\.[\w.-]+')
    NUMBER_PATTERN = re.compile(r'\b\d+(?:\.\d+)?(?:%|°|℃|℉|€|\$|£|¥)?\b')
    DATE_PATTERN = re.compile(
        r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|'
        r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b'
    )

    def __init__(self, provider: Optional[AIProvider] = None):
        self.provider = provider or get_provider()

    def validate(
        self,
        original_slides: list[dict],
        rewritten_slides: list[dict],
    ) -> dict:
        """Validate semantic preservation across all slides.

        Args:
            original_slides: Original slide dicts.
            rewritten_slides: Rewritten slide dicts.

        Returns:
            Dict with valid flag, total issues, per-slide issues.
        """
        all_issues = []
        total_validations = 0
        validation_passed = 0

        for orig, rew in zip(original_slides, rewritten_slides):
            slide_num = orig.get('slide_number')
            slide_issues = self._validate_slide(orig, rew)

            for issue in slide_issues:
                total_validations += 1
                if not issue.get('passed', True):
                    all_issues.append({
                        'slide_number': slide_num,
                        'issue': issue['message'],
                        'severity': issue['severity'],
                    })
                else:
                    validation_passed += 1

        # Compute preservation score
        preservation_score = round(
            (validation_passed / max(total_validations, 1)) * 100
        ) if total_validations > 0 else 100

        # AI verification for high-confidence issues
        ai_issues = []
        if self.provider and self.provider.is_available() and not all_issues:
            try:
                ai_issues = self._ai_validate(original_slides, rewritten_slides)
            except Exception as exc:
                logger.warning("[semantic] AI validation failed: %s", exc)

        all_issues.extend(ai_issues)

        return {
            'valid': preservation_score >= 80,
            'preservation_score': preservation_score,
            'total_validations': total_validations,
            'passed': validation_passed,
            'failed': len(all_issues),
            'issues': all_issues[:50],  # cap output
        }

    def _validate_slide(
        self,
        original: dict,
        rewritten: dict,
    ) -> list[dict]:
        """Validate a single slide for semantic preservation."""
        issues = []

        # Extract all text from original and rewritten
        orig_texts = self._extract_texts(original)
        rew_texts = self._extract_texts(rewritten)

        for orig_entry, rew_entry in zip(orig_texts, rew_texts):
            orig_text = orig_entry['text']
            rew_text = rew_entry['text']
            location = orig_entry['location']

            # Skip empty text
            if not orig_text.strip():
                continue

            # Check number preservation
            orig_nums = set(self.NUMBER_PATTERN.findall(orig_text))
            rew_nums = set(self.NUMBER_PATTERN.findall(rew_text))
            missing_nums = orig_nums - rew_nums
            if missing_nums:
                issues.append({
                    'passed': False,
                    'message': f"Numbers changed: {', '.join(list(missing_nums)[:3])} in {location}",
                    'severity': 'major',
                })

            # Check URL preservation
            orig_urls = set(self.URL_PATTERN.findall(orig_text))
            rew_urls = set(self.URL_PATTERN.findall(rew_text))
            missing_urls = orig_urls - rew_urls
            if missing_urls:
                issues.append({
                    'passed': False,
                    'message': f"URLs changed/missing in {location}",
                    'severity': 'major',
                })

            # Check email preservation
            orig_emails = set(self.EMAIL_PATTERN.findall(orig_text))
            rew_emails = set(self.EMAIL_PATTERN.findall(rew_text))
            missing_emails = orig_emails - rew_emails
            if missing_emails:
                issues.append({
                    'passed': False,
                    'message': f"Email addresses changed in {location}",
                    'severity': 'major',
                })

            # Check date preservation
            orig_dates = set(self.DATE_PATTERN.findall(orig_text))
            rew_dates = set(self.DATE_PATTERN.findall(rew_text))
            missing_dates = orig_dates - rew_dates
            if missing_dates:
                issues.append({
                    'passed': False,
                    'message': f"Dates changed/missing in {location}",
                    'severity': 'major',
                })

        return issues

    def _extract_texts(self, slide: dict) -> list[dict]:
        """Extract all text entries from a slide with their locations.

        Handles both original slide format (tables_data) and
        rewritten slide format (tables).
        """
        texts = []

        for tb in slide.get('textboxes', []):
            for para in tb.get('paragraphs', []):
                text = para.get('text', '') if isinstance(para, dict) else str(para)
                texts.append({
                    'text': text,
                    'location': f"shape {tb.get('shape_index')}",
                })

        # Support both original (tables_data) and rewritten (tables) formats
        tables_data = slide.get('tables_data') or slide.get('tables') or []
        if isinstance(tables_data, int):
            tables_data = []
        for table in tables_data:
            if not isinstance(table, dict):
                continue
            for cell in table.get('cells', []):
                if not isinstance(cell, dict):
                    continue
                for para in cell.get('paragraphs', []):
                    text = para if isinstance(para, str) else para.get('text', '')
                    texts.append({
                        'text': text,
                        'location': f"table {table.get('shape_index')} cell ({cell.get('row_index')},{cell.get('column_index')})",
                    })

        return texts

    def _ai_validate(
        self,
        original_slides: list[dict],
        rewritten_slides: list[dict],
    ) -> list[dict]:
        """Use AI to validate semantic preservation."""
        prompt = build_validation_prompt(original_slides, rewritten_slides)
        result = self.provider.generate_structured(
            prompt=prompt,
            temperature=0.1,
            max_output_tokens=2048,
        )

        issues = []
        if isinstance(result, dict):
            for slide_issue in result.get('slide_issues', []):
                issues.append({
                    'slide_number': slide_issue.get('slide_number'),
                    'issue': slide_issue.get('issue', 'AI detected issue'),
                    'severity': slide_issue.get('severity', 'minor'),
                })
        return issues

