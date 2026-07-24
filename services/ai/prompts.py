"""
Centralized Prompt Templates for the AI Presentation Enhancement Engine.

All prompts are defined here to keep them consistent, auditable, and
easy to modify across processing modes and tones.
"""

import json
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ── Processing Modes ─────────────────────────────────────────────────────────
# Each mode defines a distinct prompt personality and quality target.
MODE_SYSTEM_INSTRUCTIONS = {
    "quick": (
        "You are a helpful presentation text improver. Make quick, conservative "
        "improvements to grammar, spelling, and clarity. Do not restructure content. "
        "Return valid JSON only."
    ),
    "professional": (
        "You are an Expert AI Presentation Enhancement Engine, Professional "
        "Presentation Designer, Technical Writer, and Communication Coach. "
        "Improve text to be concise, scannable, professional, and presentation-friendly."
    ),
    "academic": (
        "You are an Expert Academic Presentation Consultant. Improve the text "
        "for academic rigor, precision, and formal tone while keeping it readable "
        "from a stage. Preserve all technical terms, citations, and data."
    ),
}

# ── Tone Instructions ────────────────────────────────────────────────────────
TONE_INSTRUCTIONS = {
    "professional": "Use a professional, confident, and authoritative tone.",
    "academic": "Use a formal, precise, and scholarly tone suitable for academic audiences.",
    "business": "Use a corporate, results-oriented tone with clear business language.",
    "technical": "Use a precise technical tone; preserve all technical details and terminology.",
    "executive": "Use a concise, high-level tone suitable for executive briefings.",
    "marketing": "Use a persuasive, benefit-focused tone suitable for marketing contexts.",
    "formal": "Use a strictly formal tone; avoid all colloquialisms and contractions.",
    "simple_english": "Use plain, simple English suitable for a broad, non-specialist audience.",
}

DEFAULT_TONE = "professional"


# ── Build quality analysis prompt ────────────────────────────────────────────

def build_quality_analysis_prompt(
    text: str,
    filename: str = "",
    mode: str = "professional",
) -> str:
    """Build a prompt for evaluating the quality of presentation text.

    Returns a prompt asking for a structured JSON scorecard.
    """
    mode_instruction = MODE_SYSTEM_INSTRUCTIONS.get(mode, MODE_SYSTEM_INSTRUCTIONS["professional"])

    return f"""You are a {mode_instruction}.

Analyse the following presentation text and return a detailed quality scorecard as JSON.

=== SCORING CRITERIA ===
Score each category from 0–100 where 100 is perfect:
1. **Grammar** — correct grammar, no errors
2. **Spelling** — no spelling mistakes
3. **Readability** — clear, easy to understand; appropriate sentence length
4. **Tone** — professional, audience-appropriate tone
5. **Clarity** — clear and unambiguous messaging
6. **Conciseness** — no unnecessary words or repetition
7. **Structure** — logical organisation, good bullet use

Also score the 7 Cs of Communication (0–100 each):
Clear, Concise, Correct, Complete, Concrete, Coherent, Courteous

=== JSON SCHEMA ===
{{
    "overall_score": 75,
    "grade": "B",
    "summary": "Brief 1-2 sentence summary of the presentation quality.",
    "category_scores": {{
        "Grammar": 85,
        "Spelling": 90,
        "Readability": 75,
        "Tone": 80,
        "Clarity": 70,
        "Conciseness": 65,
        "Structure": 72
    }},
    "seven_cs_scores": {{
        "Clear": 75,
        "Concise": 65,
        "Correct": 85,
        "Complete": 70,
        "Concrete": 60,
        "Coherent": 72,
        "Courteous": 80
    }},
    "seven_cs_evaluation": {{
        "Clear": "The message is fairly clear but could be more direct.",
        "Concise": "Some bullet points contain unnecessary words.",
        "Correct": "Grammar and spelling are good with minor issues.",
        "Complete": "Covers most aspects but lacks supporting evidence.",
        "Concrete": "More specific examples and data would strengthen claims.",
        "Coherent": "Ideas flow logically for the most part.",
        "Courteous": "Tone is appropriate and respectful."
    }},
    "strengths": ["Well-structured introduction", "Clear problem statement"],
    "issues_found": ["Some sentences are too long", "Missing data in claims"],
    "recommendations": ["Add specific metrics to support claims", "Break long sentences into shorter bullet points"]
}}

=== FILE ===
{filename}

=== TEXT ===
{text[:120000]}
"""


# ── Build rewrite prompt ─────────────────────────────────────────────────────

def build_rewrite_prompt(
    slides: list[dict],
    grammar_issues_summary: str = "",
    presentation_context: Optional[dict] = None,
    mode: str = "professional",
    tone: str = "professional",
) -> str:
    """Build a comprehensive prompt for rewriting presentation text.

    Incorporates processing mode, tone, presentation context, and grammar issues.
    """
    mode_system = MODE_SYSTEM_INSTRUCTIONS.get(mode, MODE_SYSTEM_INSTRUCTIONS["professional"])
    tone_instruction = TONE_INSTRUCTIONS.get(tone, TONE_INSTRUCTIONS["professional"])

    # Build slide blocks
    slide_blocks = []
    for slide in slides:
        slide_type = slide.get('_inferred_type', 'Content Slide')
        target_lines = [f'  Slide role: {slide_type}']

        for textbox in slide.get('textboxes', []):
            paragraphs = ' | '.join(
                f'[P{p.get("para_index", i)}]: {json.dumps(str(p.get("text", "") if isinstance(p, dict) else str(p)), ensure_ascii=False)}'
                for i, p in enumerate(textbox.get('paragraphs', []))
            )
            target_lines.append(
                f'  Textbox shape_index={textbox.get("shape_index")} '
                f'({len(textbox.get("paragraphs", []))} paragraphs): {paragraphs}'
            )

        for table in slide.get('tables_data', []):
            for cell in table.get('cells', []):
                paragraphs = ' | '.join(
                    f'[P{i}]: {json.dumps(str(p.get("text", "") if isinstance(p, dict) else str(p)), ensure_ascii=False)}'
                    for i, p in enumerate(cell.get('paragraphs', []))
                )
                target_lines.append(
                    f'  Table shape_index={table.get("shape_index")} '
                    f'cell=({cell.get("row_index")},{cell.get("column_index")}): {paragraphs}'
                )

        for chart in slide.get('charts_data', []):
            if chart.get('title_paragraphs'):
                paragraphs = ' | '.join(
                    f'[P{i}]: {json.dumps(str(p.get("text", "") if isinstance(p, dict) else str(p)), ensure_ascii=False)}'
                    for i, p in enumerate(chart.get('title_paragraphs', []))
                )
                target_lines.append(f'  Chart shape_index={chart.get("shape_index")} title: {paragraphs}')

        slide_blocks.append(
            f'Slide {slide.get("slide_number")} — Title: {json.dumps(slide.get("title", ""), ensure_ascii=False)}\n'
            + ('\n'.join(target_lines) if target_lines else '  (no text targets)')
        )

    grammar = f'\nGrammar issues to fix:\n{grammar_issues_summary}\n' if grammar_issues_summary else ''
    context_block = ''

    if presentation_context:
        themes = ', '.join(presentation_context.get('key_themes', [])) or 'N/A'
        context_block = f'''
=== PRESENTATION CONTEXT ===
• Topic: {presentation_context.get('overall_topic', 'N/A')}
• Objective: {presentation_context.get('main_objective', 'N/A')}
• Type: {presentation_context.get('presentation_type', 'N/A')}
• Level: {presentation_context.get('technical_level', 'N/A')}
• Audience: {presentation_context.get('audience', 'N/A')}
• Tone guidance: {presentation_context.get('tone_guidance', 'N/A')}
• Key themes: {themes}
'''

    return f'''{mode_system}

=== TONE ===
{tone_instruction}

=== OBJECTIVE ===
Improve the textual content of each slide so it is concise, scannable, professional,
and easy to explain verbally — while preserving 100% of the original meaning, facts,
and visual structure.
{context_block}
=== RULES ===
1. Return **only valid JSON**. No markdown, no explanations.
2. Every slide, textbox, table cell, and chart title must appear in the output.
3. Keep each paragraph array **exactly the same length** as the input.
4. Preserve all facts, names, dates, URLs, statistics, and technical meaning.
5. Never add, remove, or reorder slides, shapes, textboxes, tables, charts, or cells.
6. Make titles clear and descriptive when possible.
7. Use parallel grammatical structure in bullet lists.
8. Avoid weak phrases: "In this section", "As you can see", etc.

=== JSON SCHEMA ===
{{"slides":[{{"slide_number":1,"textboxes":[{{"shape_index":0,"paragraphs":["..."]}}],"tables":[{{"shape_index":1,"cells":[{{"row_index":0,"column_index":0,"paragraphs":["..."]}}]}}],"charts":[{{"shape_index":2,"title_paragraphs":["..."]}}]}}]}}
{grammar}
=== SLIDE DATA ===
{chr(10).join(slide_blocks)}
'''


# ── Build presentation context prompt ────────────────────────────────────────

def build_presentation_context_prompt(slides: list[dict]) -> str:
    """Build a prompt for holistic presentation context analysis.

    Phase 1 of the analysis pipeline: understand the presentation as a whole
    before improving individual slides.
    """
    slide_summaries = []
    for slide in slides:
        title = slide.get('title', '')
        full_text = ' '.join(
            str(p.get('text', '') if isinstance(p, dict) else str(p))
            for tb in slide.get('textboxes', [])
            for p in tb.get('paragraphs', [])
        )[:300]
        slide_summaries.append(
            f'Slide {slide.get("slide_number")}: Title={json.dumps(title, ensure_ascii=False)} | '
            f'Content={json.dumps(full_text, ensure_ascii=False)}'
        )

    return f'''Analyse the COMPLETE presentation below and return a compact JSON summary.

Determine:
- overall_topic — the single main subject
- main_objective — what the presenter wants to achieve
- presentation_type — e.g. thesis defense, sales pitch, training
- technical_level — beginner | intermediate | advanced | academic
- audience — likely viewer demographic
- story_flow — 1-sentence narrative arc
- key_themes — 3-5 recurring themes
- tone_guidance — 1 sentence on appropriate rewrite tone
- slide_roles — mapping of slide_number → role label

JSON SCHEMA:
{{"overall_topic":"...","main_objective":"...","presentation_type":"...","technical_level":"...","audience":"...","story_flow":"...","key_themes":["..."],"tone_guidance":"...","slide_roles":{{"1":"Title Slide"}}}}

PRESENTATION DATA:
{chr(10).join(slide_summaries)}
'''


# ── Build validation prompt ─────────────────────────────────────────────────

def build_validation_prompt(
    original_slides: list[dict],
    rewritten_slides: list[dict],
) -> str:
    """Build a prompt for validating rewritten slides against originals.

    Checks for semantic drift, hallucination, and structural issues.
    """
    return f'''Compare the original and rewritten slides below. Verify that:
1. All facts, numbers, names, and data are preserved.
2. No hallucinated information has been added.
3. The meaning and intent of each slide is unchanged.
4. All slides, textboxes, and paragraphs are accounted for.

Return JSON: {{"valid":true,"issues":[],"slide_issues":[{{"slide_number":1,"issue":"...","severity":"minor|major"}}]}}

ORIGINAL:
{json.dumps([{
    "slide_number": s.get("slide_number"),
    "title": s.get("title"),
    "text_count": sum(len(tb.get("paragraphs", [])) for tb in s.get("textboxes", [])),
} for s in original_slides], indent=2)}

REWRITTEN:
{json.dumps([{
    "slide_number": s.get("slide_number"),
    "title": s.get("title"),
    "text_count": sum(len(tb.get("paragraphs", [])) for tb in s.get("textboxes", [])),
} for s in rewritten_slides], indent=2)}
'''


# ── Build scoring prompt ────────────────────────────────────────────────────

def build_scoring_prompt(
    original_slides: list[dict],
    rewritten_slides: list[dict],
    analysis_results: Optional[dict] = None,
) -> str:
    """Build a prompt for post-rewrite scoring and quality assessment.

    Returns scores for original, improved, delta, and confidence.
    """
    analysis_block = ''
    if analysis_results:
        analysis_block = f'\nPre-rewrite analysis:\n{json.dumps(analysis_results, indent=2)}\n'

    return f'''You are a Presentation Quality Assessor. Evaluate the original vs improved presentation text.

Score each category 0-100 for both original and improved. Compute the delta.
Also provide a confidence score (0-100) for each category reflecting how confident
you are that the text was actually improved.

Categories: Grammar, Spelling, Readability, Tone, Clarity, Conciseness, Structure

Also score the 7 Cs: Clear, Concise, Correct, Complete, Concrete, Coherent, Courteous{analysis_block}

JSON SCHEMA:
{{"original_scores":{{"Grammar":80,...}},"improved_scores":{{"Grammar":90,...}},"delta":{{"Grammar":10,...}},"confidence":{{"Grammar":85,...}},"overall_original":80,"overall_improved":90,"grade":"A"}}

ORIGINAL slides:
{json.dumps([{"slide_number": s.get("slide_number"), "title": s.get("title")} for s in original_slides])}

IMPROVED slides:
{json.dumps([{"slide_number": s.get("slide_number"), "title": s.get("title")} for s in rewritten_slides])}
'''


# ── Build narrative analysis prompt ─────────────────────────────────────────

def build_narrative_analysis_prompt(slides: list[dict]) -> str:
    """Build a prompt for analyzing the narrative/storytelling quality."""
    slide_texts = []
    for slide in slides:
        text = ' '.join(
            str(p.get('text', '') if isinstance(p, dict) else str(p))
            for tb in slide.get('textboxes', [])
            for p in tb.get('paragraphs', [])
        )
        slide_texts.append(f'Slide {slide.get("slide_number")}: {slide.get("title")} — {text[:500]}')

    return f'''Analyse this presentation's storytelling and narrative quality.

Evaluate:
- Hook strength (does the opening grab attention?)
- Narrative arc (clear beginning, middle, end?)
- Pacing (do slides flow at the right speed?)
- Transitions (are there logical bridges between slides?)
- Conclusion impact (does the ending satisfy?)
- Missing sections (hook? problem? solution? evidence? conclusion? CTA?)

Return JSON:
{{"hook_score":80,"narrative_score":75,"pacing_score":70,"conclusion_score":85,"transitions_score":72,"overall_storytelling_score":76,"weakest_transition":"Slide 3 to 4","strongest_transition":"Slide 1 to 2","missing_sections":[],"suggested_order":[],"feedback":"..."}}

PRESENTATION:
{chr(10).join(slide_texts)}
'''


def get_system_prompt(mode: str = "professional") -> str:
    """Get the system-level instruction for a given mode."""
    return MODE_SYSTEM_INSTRUCTIONS.get(mode, MODE_SYSTEM_INSTRUCTIONS["professional"])


def get_tone_instruction(tone: str = "professional") -> str:
    """Get the tone instruction string for a given tone."""
    return TONE_INSTRUCTIONS.get(tone, TONE_INSTRUCTIONS["professional"])


__all__ = [
    "build_quality_analysis_prompt",
    "build_rewrite_prompt",
    "build_presentation_context_prompt",
    "build_validation_prompt",
    "build_scoring_prompt",
    "build_narrative_analysis_prompt",
    "get_system_prompt",
    "get_tone_instruction",
    "MODE_SYSTEM_INSTRUCTIONS",
    "TONE_INSTRUCTIONS",
]

