# Presentation Rewriter - Improvement Checklist

## Critical Bugs to Fix
- [ ] Schema mismatch: `_fallback_local_rewrite` references `charts_data` but `gemini_service.py` validation expects `charts` — verify consistency
- [ ] Gemini prompt has slightly different structure than validator expects — ensure `tables_data`/`tables` mapping is consistent
- [ ] Frontend stepper is purely simulated — add real backend progress tracking

## Missing Features
- [ ] **Slide-by-slide detailed report** — create new endpoint `/api/presentation-rewriter/report/<filename>` that returns per-slide before/after text comparison with specific changes
- [ ] **PDF report export** — add PDF generation for detailed AI report with overall scores, slide-wise scores, grammar fixes, spelling fixes, readability, tone, 7Cs analysis
- [ ] **Frontend comparison view** — show original text vs improved text per slide in the UI
- [ ] **Download detailed report** button alongside the download PPTX button

## Backend Improvements
- [ ] Add `run_report_pipeline()` that generates a comprehensive per-slide comparison report
- [ ] Add route for downloading the analysis report (JSON + PDF)
- [ ] Enhance integrity validation to check image hashes more thoroughly before allowing download
- [ ] Add better error messages for validation failures

## Frontend Improvements
- [ ] Add real-time progress updates from backend (poll or WebSocket)
- [ ] Add "Compare Changes" tab showing before/after text per slide
- [ ] Add "Download Report" button
- [ ] Improve the "Coming Soon" section with actual implemented features

## Quality & Edge Cases
- [ ] Test with empty presentations
- [ ] Test with presentations that have only images/no text
- [ ] Handle very large presentations (split prompts more aggressively)
- [ ] Ensure UTF-8/special characters work correctly in Gemini responses

## Verification
- [ ] Start backend and test the rewrite flow end-to-end
- [ ] Verify text-only changes preserve all visual elements
- [ ] Confirm downloaded PPTX opens correctly
