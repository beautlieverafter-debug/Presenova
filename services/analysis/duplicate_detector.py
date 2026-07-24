"""
Duplicate Detector — Repeated Content Detection

Detects repeated content across the presentation:
- Repeated headings
- Repeated bullet points
- Repeated paragraphs
- Repeated ideas (semantic similarity)
- Repeated conclusions
- Repeated phrases/word combinations

Generates a duplicate score and lists of repeated items.
"""

import logging
import re
from collections import Counter
from typing import Optional

logger = logging.getLogger(__name__)

# Minimum length for a phrase to be considered for duplicate detection
MIN_PHRASE_LENGTH = 15
# Minimum number of occurrences to flag as duplicate
MIN_DUPLICATE_OCCURRENCES = 2
# Similarity threshold for fuzzy matching (0.0 - 1.0)
SIMILARITY_THRESHOLD = 0.85


class DuplicateDetector:
    """Detects duplicate/repeated content across presentation slides."""

    def analyze(self, slides: list[dict]) -> dict:
        """Detect duplicate content across all slides.

        Args:
            slides: List of slide dicts.

        Returns:
            Dict with duplicate_score, duplicate_items, and recommendations.
        """
        if not slides:
            return self._default()

        # Extract all text items with their slide numbers
        all_items: list[dict] = []
        for slide in slides:
            slide_num = slide.get('slide_number', 0)

            # Titles
            title = slide.get('title', '')
            if title.strip():
                all_items.append({
                    'slide_number': slide_num,
                    'type': 'title',
                    'text': title.strip(),
                    'location': f'Slide {slide_num} title',
                })

            # Textbox paragraphs
            for tb in slide.get('textboxes', []):
                for para in tb.get('paragraphs', []):
                    text = para.get('text', '') if isinstance(para, dict) else str(para)
                    text = text.strip()
                    if len(text) > MIN_PHRASE_LENGTH:
                        all_items.append({
                            'slide_number': slide_num,
                            'type': 'paragraph',
                            'text': text,
                            'location': f'Slide {slide_num}, shape {tb.get("shape_index")}',
                        })

            # Table cells
            for table in slide.get('tables_data', []):
                for cell in table.get('cells', []):
                    for para in cell.get('paragraphs', []):
                        text = para.get('text', '') if isinstance(para, dict) else str(para)
                        text = text.strip()
                        if len(text) > MIN_PHRASE_LENGTH:
                            all_items.append({
                                'slide_number': slide_num,
                                'type': 'table_cell',
                                'text': text,
                                'location': f'Slide {slide_num}, table {table.get("shape_index")}, cell ({cell.get("row_index")},{cell.get("column_index")})',
                            })

        # Detect duplicates
        repeated_paragraphs = self._find_exact_duplicates(all_items, 'paragraph')
        repeated_titles = self._find_exact_duplicates(all_items, 'title')
        repeated_phrases = self._find_repeated_phrases(all_items)
        repeated_ideas = self._find_similar_items(all_items)

        all_duplicates = repeated_paragraphs + repeated_titles + repeated_phrases + repeated_ideas

        # Compute duplicate score (0 = no duplicates, 100 = all duplicated)
        total_items = len(all_items)
        duplicate_count = len(set(
            d.get('text', '') for d in all_duplicates
        ))
        duplicate_ratio = duplicate_count / max(total_items, 1)
        duplicate_score = round(max(0, min(100, (1 - duplicate_ratio) * 100)))

        # Generate recommendations
        recommendations = []
        if repeated_titles:
            recommendations.append(f"{len(repeated_titles)} duplicate titles detected. Consider using unique titles for each slide.")
        if repeated_paragraphs:
            recommendations.append(f"{len(repeated_paragraphs)} duplicate paragraphs found. Remove or rephrase repeated content.")
        if repeated_ideas:
            recommendations.append(f"{len(repeated_ideas)} similar ideas expressed across multiple slides. Consolidate for clarity.")

        return {
            'duplicate_score': duplicate_score,
            'duplicate_count': duplicate_count,
            'total_items_checked': total_items,
            'duplicate_ratio': round(duplicate_ratio, 3),
            'duplicates': all_duplicates[:30],  # Limit output
            'repeated_titles_count': len(repeated_titles),
            'repeated_paragraphs_count': len(repeated_paragraphs),
            'repeated_phrases_count': len(repeated_phrases),
            'repeated_ideas_count': len(repeated_ideas),
            'recommendations': recommendations,
        }

    def _find_exact_duplicates(self, items: list[dict], item_type: str) -> list[dict]:
        """Find exact text duplicates for a given type."""
        text_counts = Counter()
        for item in items:
            if item['type'] == item_type:
                text_counts[item['text'].lower().strip()] += 1

        duplicates = []
        for text, count in text_counts.items():
            if count >= MIN_DUPLICATE_OCCURRENCES:
                occurrences = [item for item in items
                               if item['type'] == item_type
                               and item['text'].lower().strip() == text]
                if occurrences:
                    duplicates.append({
                        'type': f'duplicate_{item_type}',
                        'text': occurrences[0]['text'],
                        'occurrences': count,
                        'locations': [o['location'] for o in occurrences],
                    })
        return duplicates

    def _find_repeated_phrases(self, items: list[dict]) -> list[dict]:
        """Find repeated multi-word phrases across items."""
        all_words = ' '.join(item['text'] for item in items).lower()

        # Look for 3-5 word phrases that appear multiple times
        words = re.findall(r'\b[a-z]+\b', all_words)
        phrases = Counter()

        for length in [3, 4]:
            for i in range(len(words) - length + 1):
                phrase = ' '.join(words[i:i + length])
                if len(phrase) > MIN_PHRASE_LENGTH // 3:
                    phrases[phrase] += 1

        repeated = []
        for phrase, count in phrases.items():
            if count >= MIN_DUPLICATE_OCCURRENCES:
                repeated.append({
                    'type': 'repeated_phrase',
                    'text': phrase,
                    'occurrences': count,
                })

        return repeated[:10]

    def _find_similar_items(self, items: list[dict]) -> list[dict]:
        """Find semantically similar items using simple word overlap.

        This is a simplified approach. In production, use embeddings.
        """
        similar_items = []
        texts_by_type: dict[str, list[tuple[int, str, dict]]] = {}

        for item in items:
            if item['type'] not in texts_by_type:
                texts_by_type[item['type']] = []
            idx = len(texts_by_type[item['type']])
            texts_by_type[item['type']].append((idx, item['text'].lower(), item))

        for item_type, type_items in texts_by_type.items():
            for i in range(len(type_items)):
                for j in range(i + 1, len(type_items)):
                    idx1, text1, item1 = type_items[i]
                    idx2, text2, item2 = type_items[j]

                    # Word overlap similarity
                    words1 = set(text1.split())
                    words2 = set(text2.split())

                    if not words1 or not words2:
                        continue

                    intersection = words1 & words2
                    union = words1 | words2

                    if len(union) > 0:
                        similarity = len(intersection) / len(union)
                        if similarity >= SIMILARITY_THRESHOLD and text1 != text2:
                            similar_items.append({
                                'type': 'similar_idea',
                                'text': item1['text'],
                                'similar_to': item2['text'],
                                'similarity': round(similarity, 3),
                                'locations': [item1['location'], item2['location']],
                            })

        return similar_items[:10]

    def _default(self) -> dict:
        return {
            'duplicate_score': 100,
            'duplicate_count': 0,
            'total_items_checked': 0,
            'duplicate_ratio': 0.0,
            'duplicates': [],
            'repeated_titles_count': 0,
            'repeated_paragraphs_count': 0,
            'repeated_phrases_count': 0,
            'repeated_ideas_count': 0,
            'recommendations': [],
        }

