# AI Presentation Enhancement Platform — Implementation Plan

## Architecture Overview

Based on thorough codebase analysis, the current system is a working presentation rewriter with:
- **Monolithic gemini_service.py** (~800 lines) handling prompts, API calls, validation, and fallbacks
- **rewrite_engine.py** orchestrating pipeline
- **Working frontend** with upload, scoring, comparison views
- **PPTX preservation** via compare_pptx.py

The master requirement is to transform this into a **complete AI Presentation Enhancement Platform** comparable to Gamma AI.

---

## Phase 1: Provider Abstraction Layer
*Create modular AI provider architecture*

### 1.1 `services/ai/__init__.py`
Package init with provider registry and factory.

### 1.2 `services/ai/base_provider.py`
Abstract `AIProvider` class with:
- `generate(prompt, temperature, max_tokens) -> str`
- `generate_structured(prompt, schema) -> dict`
- `get_model_info() -> dict`
- `count_tokens(text) -> int`

### 1.3 `services/ai/gemini_provider.py`
Refactored Gemini integration implementing `AIProvider`:
- Current/new SDK support
- Retry logic with exponential backoff
- Model fallback chain
- Token counting
- Timeout handling

### 1.4 `services/ai/prompts.py`
Centralized prompt templates:
- `SYSTEM_PROMPTS` dict (professional/academic/quick modes)
- `build_analysis_prompt()`
- `build_rewrite_prompt()`
- `build_validation_prompt()`
- `build_scoring_prompt()`

### 1.5 `services/ai/fallback.py`
Fallback chain:
- Primary → Retry → Fallback Model 1 → Fallback Model 2 → Local fallback
- Per-slide recovery, never fail entire presentation
- Abort only if >50% slides fail

---

## Phase 2: Analysis Modules
*Per-slide and holistic analysis engine*

### 2.1 `services/analysis/statistics.py`
Presentation statistics computation:
- Slide count, word count, textboxes, tables, charts, images
- Reading time, speaking duration
- Text density, average bullets per slide
- Longest/shortest slide

### 2.2 `services/analysis/holistic.py`
Holistic presentation analysis:
- Overall topic identification
- Objective assessment
- Audience analysis  
- Story flow evaluation
- Per-slide role classification

### 2.3 `services/analysis/per_slide.py`
Detailed per-slide scoring:
- Grammar, spelling, readability
- Tone, clarity, conciseness
- 7 Cs scoring per slide
- Improvement categories

### 2.4 `services/analysis/storytelling.py`
Storytelling intelligence:
- Hook evaluation
- Narrative flow
- Pacing analysis
- Identification of missing sections (hook, intro, problem, etc.)
- Transition quality scoring

### 2.5 `services/analysis/design.py`
Design analysis (non-destructive):
- Visual balance scoring
- White space evaluation
- Text density
- Bullet overload detection
- Font/color consistency

### 2.6 `services/analysis/consistency.py`
Consistency analysis:
- Terminology consistency
- Capitalization patterns
- Units and formatting
- Voice/tense consistency

### 2.7 `services/analysis/duplicate_detector.py`
Duplicate detection:
- Repeated headings
- Repeated bullets/content
- Repeated ideas
- Duplicate score generation

### 2.8 `services/analysis/accessibility.py`
Accessibility analysis:
- Contrast evaluation
- Reading order
- Text size analysis
- Accessibility score

### 2.9 `services/analysis/speaker.py`
Speaker readiness:
- Speaking duration estimation
- Reading difficulty (Flesch score)
- Audience engagement prediction
- Q&A preparedness scoring

---

## Phase 3: Rewrite Engine Modules
*Smart filtering and rewrite execution*

### 3.1 `services/rewrite/smart_filter.py`
AI cost optimization:
- Skip high-quality textboxes/slides
- Heuristics + AI scores for filter decisions
- Save ~30% tokens

### 3.2 `services/rewrite/planner.py`
Enhancement planning:
- Processing mode selection (Quick/Professional/Academic)
- Tone injection
- Batch planning for large presentations
- Token budget tracking

### 3.3 `services/rewrite/executor.py`
Rewrite execution:
- Three-level batching (analysis/rewrite/validation)
- Rolling summaries between batches
- Per-slide error recovery
- Change severity classification

---

## Phase 4: Validation Modules
*Multi-stage validation pipeline*

### 4.1 `services/validation/semantic.py`
Semantic validation:
- Fact preservation check
- Meaning preservation
- Hallucination detection

### 4.2 `services/validation/structural.py`
Structural validation:
- Slide count preservation
- Shape count preservation
- Layout preservation
- Reference to compare_pptx.py

### 4.3 `services/validation/final.py`
Final validation and scoring:
- Post-rewrite quality scoring
- Confidence score computation
- Change severity classification

---

## Phase 5: Report Modules
*Comprehensive report generation*

### 5.1 `services/report/executive_summary.py`
One-page executive summary:
- Topic, audience, purpose
- Strengths and weaknesses
- Most improved slides
- Overall improvement percentage

### 5.2 `services/report/analytics.py`
Before/after analytics:
- Original scores vs improved scores
- Delta computation
- Category improvements
- Grade improvement

### 5.3 `services/report/recommendations.py`
AI recommendations engine:
- Categorized (Writing/Design/Delivery/Storytelling)
- Priority assignment
- Expected impact estimation

---

## Phase 6: Pipeline Refactoring
*Update rewrite_engine.py to use new modular architecture*

### 6.1 Refactor `rewrite_engine.py`
- Use provider abstraction instead of direct Gemini calls
- Integrate analysis pipeline modules
- Integrate smart filtering
- Add performance logging
- Add processing mode support
- Add tone selection support

### 6.2 Refactor `gemini_service.py`
- Reduce to a thin compatibility shim
- Delegate to `services/ai/` provider modules
- Maintain backward compatibility

---

## Phase 7: API & Route Updates
*Extend existing APIs with new features*

### 7.1 Update `routes/presentation_rewriter.py`
- Add mode and tone parameters to /submit endpoint
- Add /stats/<filename> endpoint
- Add /executive-summary/<filename> endpoint
- Add /recommendations/<filename> endpoint
- Enhanced report endpoint with all new data

### 7.2 Frontend API Updates
- New types for extended response data
- Mode/tone selection in request
- New endpoint calls

---

## Phase 8: Frontend Enhancements
*Extended UI for platform features*

### 8.1 Mode/Tone Selectors
- Quick/Professional/Academic mode selector
- Tone dropdown (Professional/Academic/Business/Technical/etc.)

### 8.2 Statistics Dashboard
- Presentation statistics card
- Visual stats display

### 8.3 Enhanced Analytics
- Before/after comparison charts
- Delta visualization
- Category improvement breakdown

### 8.4 Executive Summary Panel
- Condensed one-page summary view

### 8.5 Recommendations Panel
- Categorized recommendations with priorities

---

## Implementation Order

1. **Phase 1** — Provider abstraction (foundation for everything)
2. **Phase 2.1** — Statistics module (independent, no deps)
3. **Phase 6.1** — Refactor rewrite_engine.py minimally to use provider
4. **Phase 2.2-2.9** — Analysis modules
5. **Phase 3** — Rewrite modules
6. **Phase 4** — Validation modules
7. **Phase 5** — Report modules
8. **Phase 6.2** — Refactor gemini_service.py to thin shim
9. **Phase 7** — API updates
10. **Phase 8** — Frontend enhancements

