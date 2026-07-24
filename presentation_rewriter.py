"""
Presentation Rewriter — Root Module
Thin compatibility shim kept for backward compatibility.
All business logic now lives in services/.
"""

# Re-export symbols that might be imported elsewhere in the project
from services.text_extractor import is_allowed_for_rewrite as is_allowed_file  # noqa: F401
from services.download_service import DOWNLOAD_FOLDER  # noqa: F401
from services.rewrite_engine import run_rewrite_pipeline as process_presentation_file  # noqa: F401
from services.gemini_service import build_rewrite_prompt


def build_gemini_prompt(slides):
    """Compatibility prompt for older callers of the root module."""
    lines = [
        'Rewrite the supplied presentation text and return JSON only.',
        'Expected JSON format:',
        '{"slides": [{"slide_number": 1, "textboxes": [{"shape_index": 0, "paragraphs": ["Improved text"]}]}]}',
    ]
    for slide in slides:
        lines.append(f"Slide {slide.get('slide_number')}: {slide.get('title', '')}")
        for textbox in slide.get('textboxes', []):
            text = textbox.get('text', textbox.get('full_text', ''))
            lines.append(f'  shape_index={textbox.get("shape_index")}: {text}')
            lines.append(
                f'  Example: {{"shape_index": {textbox.get("shape_index")}, "text": "Improved text"}}'
            )
    return '\n'.join(lines)

__all__ = [
    'is_allowed_file', 'DOWNLOAD_FOLDER', 'process_presentation_file',
    'build_gemini_prompt', 'build_rewrite_prompt',
]
