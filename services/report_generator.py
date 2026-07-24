"""Report generation for per-slide comparison data and PDF export."""

import json
import logging
import os
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


def build_slide_report(original_slides: list[dict], rewritten_slides: list[dict]) -> list[dict]:
    """Pair original and rewritten slides into a per-slide comparison report.

    Each entry maps shape/slide structure from the Gemini-validated rewrite
    output back to the original extracted text so consumers can render a
    before/after diff.
    """
    report_slides = []
    for orig, rew in zip(original_slides, rewritten_slides):
        slide_report = {
            'slide_number': orig.get('slide_number'),
            'title': orig.get('title', ''),
            'textboxes': [],
            'tables': [],
            'charts': [],
        }

        # ── Textboxes ────────────────────────────────────────────────────
        orig_textboxes = {tb['shape_index']: tb for tb in orig.get('textboxes', [])}
        for tb in rew.get('textboxes', []):
            orig_tb = orig_textboxes.get(tb['shape_index'], {})
            slide_report['textboxes'].append({
                'shape_index': tb['shape_index'],
                'shape_name': orig_tb.get('shape_name', ''),
                'original_paragraphs': [
                    _para_text(p) for p in orig_tb.get('paragraphs', [])
                ],
                'improved_paragraphs': [str(p) for p in tb.get('paragraphs', [])],
            })

        # ── Tables ───────────────────────────────────────────────────────
        orig_tables = {t['shape_index']: t for t in orig.get('tables_data', [])}
        for t in rew.get('tables', []):
            orig_t = orig_tables.get(t['shape_index'], {})
            orig_cells = {}
            for c in orig_t.get('cells', []):
                orig_cells[(c['row_index'], c['column_index'])] = c
            cells = []
            for c in t.get('cells', []):
                orig_c = orig_cells.get((c['row_index'], c['column_index']), {})
                cells.append({
                    'row_index': c['row_index'],
                    'column_index': c['column_index'],
                    'original_paragraphs': [
                        _para_text(p) for p in orig_c.get('paragraphs', [])
                    ],
                    'improved_paragraphs': [str(p) for p in c.get('paragraphs', [])],
                })
            slide_report['tables'].append({
                'shape_index': t['shape_index'],
                'cells': cells,
            })

        # ── Charts ───────────────────────────────────────────────────────
        orig_charts = {c['shape_index']: c for c in orig.get('charts_data', [])}
        for c in rew.get('charts', []):
            orig_c = orig_charts.get(c['shape_index'], {})
            slide_report['charts'].append({
                'shape_index': c['shape_index'],
                'original_title_paragraphs': [
                    _para_text(p) for p in orig_c.get('title_paragraphs', [])
                ],
                'improved_title_paragraphs': [str(p) for p in c.get('title_paragraphs', [])],
            })

        report_slides.append(slide_report)
    return report_slides


def _para_text(p) -> str:
    """Extract text from a paragraph dict or return the value as string."""
    if isinstance(p, dict):
        return str(p.get('text', ''))
    return str(p)


def save_report_json(
    report_data: dict,
    output_pptx_path: str,
) -> str:
    """Write a .report.json file alongside the PPTX output.

    Returns the path of the saved report file.
    """
    report_path = output_pptx_path + '.report.json'
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report_data, f, ensure_ascii=False, indent=2)
    logger.info("[report_generator] Saved report to '%s'.", report_path)
    return report_path


def load_report_json(filename: str, download_folder: str) -> dict | None:
    """Load a saved .report.json file by PPTX output filename."""
    base, _ = os.path.splitext(filename)
    report_path = os.path.join(download_folder, base + '.pptx.report.json')
    if not os.path.isfile(report_path):
        # Try alternate naming
        report_path = os.path.join(download_folder, filename + '.report.json')
    if not os.path.isfile(report_path):
        logger.warning("[report_generator] Report file not found for '%s'.", filename)
        return None
    try:
        with open(report_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError) as exc:
        logger.error("[report_generator] Failed to load report: %s", exc)
        return None


def load_report_for_pptx(output_filename: str, download_folder: str) -> dict | None:
    """Load report JSON using the output PPTX filename (no extra extension)."""
    return load_report_json(output_filename, download_folder)
