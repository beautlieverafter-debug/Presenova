"""
Viva Question Generator Service

Generates thesis-defense style viva questions from uploaded documents (PPTX/PDF).
Reuses the existing text_extractor for content extraction and the AI provider
abstraction layer for LLM interaction.

Usage:
    from services.question_generator import generate_viva_questions

    result = generate_viva_questions("path/to/file.pptx", "original_name.pptx", num_questions=10)
    # Returns: { "success": True, "questions": [...], "summary": {...}, ... }
"""

import json
import logging
import os
import time
from typing import Optional

from services.ai import get_provider
from services.ai.prompts import build_question_generation_prompt
from services.text_extractor import (
    get_all_text_for_analysis,
    get_extension,
    is_allowed_for_analysis,
)

logger = logging.getLogger(__name__)


def generate_viva_questions(
    file_path: str,
    original_filename: str,
    num_questions: int = 10,
) -> dict:
    """Generate viva/thesis-defense style questions from an uploaded document.

    Extracts text from the document, sends it to the AI provider with a
    specialised prompt, and returns structured questions with categories,
    difficulty levels, source references, and preparation tips.

    Args:
        file_path: Absolute path to the uploaded temporary file.
        original_filename: Original filename for extension detection.
        num_questions: Desired number of questions (default 10).

    Returns:
        A dict with the following structure on success:
            {"success": True, "questions": [...], "summary": {...},
             "processing_time": "X.XX seconds"}
        Or on failure:
            {"success": False, "message": "Error description"}
    """
    started = time.time()
    try:
        # ── Step 1: Validate file type ─────────────────────────────────
        ext = get_extension(original_filename)
        if not is_allowed_for_analysis(original_filename):
            return {
                "success": False,
                "message": f"Unsupported file type '{ext}'. Please upload a .pptx or .pdf file.",
            }

        # ── Step 2: Extract text ───────────────────────────────────────
        extracted_text = get_all_text_for_analysis(file_path, original_filename)
        if not extracted_text or len(extracted_text.strip()) < 20:
            return {
                "success": False,
                "message": "The uploaded document contains too little extractable text to generate meaningful questions.",
            }

        logger.info(
            "[question_generator] Extracted %d characters from '%s'.",
            len(extracted_text), original_filename,
        )

        # ── Step 3: Get AI provider ───────────────────────────────────
        provider = get_provider()
        if not provider.is_available():
            logger.warning("[question_generator] AI provider is unavailable.")
            return {
                "success": False,
                "message": "AI question generation is temporarily unavailable. Please try again later.",
            }

        # ── Step 4: Build prompt and call AI ──────────────────────────
        prompt = build_question_generation_prompt(
            text=extracted_text,
            num_questions=num_questions,
        )

        result = provider.generate_structured(
            prompt=prompt,
            temperature=0.3,
            max_output_tokens=8192,
        )

        if not result or not isinstance(result, dict):
            logger.warning(
                "[question_generator] AI returned unexpected response type: %s",
                type(result).__name__,
            )
            return {
                "success": False,
                "message": "AI returned an unexpected response. Please try again.",
            }

        # ── Step 5: Validate and normalise response ──────────────────
        questions = result.get("questions", [])
        summary = result.get("summary", {})

        if not questions or not isinstance(questions, list):
            logger.warning(
                "[question_generator] AI response missing valid 'questions' array."
            )
            return {
                "success": False,
                "message": "AI failed to generate valid questions. Please try again.",
            }

        # Ensure every question has the required fields
        validated_questions = []
        for q in questions:
            if not isinstance(q, dict):
                continue
            validated_questions.append({
                "id": q.get("id", f"q{len(validated_questions) + 1}"),
                "category": q.get("category", "conceptual"),
                "difficulty": q.get("difficulty", "intermediate"),
                "question": q.get("question", ""),
                "source_reference": q.get("source_reference", ""),
                "prep_tip": q.get("prep_tip", ""),
            })

        # Build summary with correct counts
        by_difficulty = {"basic": 0, "intermediate": 0, "advanced": 0}
        for q in validated_questions:
            diff = q["difficulty"]
            if diff in by_difficulty:
                by_difficulty[diff] += 1

        final_summary = {
            "total_questions": len(validated_questions),
            "by_difficulty": by_difficulty,
            "focus_areas": summary.get("focus_areas", []),
        }

        # If fewer questions were generated than requested, add a note
        if len(validated_questions) < num_questions:
            final_summary["note"] = (
                f"Document content limited; generated {len(validated_questions)} "
                f"of {num_questions} requested questions to maintain quality."
            )

        elapsed = time.time() - started
        logger.info(
            "[question_generator] Generated %d questions in %.2fs.",
            len(validated_questions), elapsed,
        )

        return {
            "success": True,
            "questions": validated_questions,
            "summary": final_summary,
            "processing_time": f"{elapsed:.2f} seconds",
        }

    except ValueError as exc:
        logger.warning("[question_generator] Validation error: %s", exc)
        return {"success": False, "message": str(exc)}
    except RuntimeError as exc:
        logger.error("[question_generator] Processing error: %s", exc)
        return {
            "success": False,
            "message": "Question generation is temporarily unavailable. Please try again.",
        }
    except Exception:
        logger.exception("[question_generator] Unexpected error.")
        return {
            "success": False,
            "message": "An unexpected error occurred during question generation.",
        }

