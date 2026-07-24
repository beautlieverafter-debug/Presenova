"""
Report Package — Comprehensive Report Generation

Provides:
- executive_summary: One-page executive summary generation
- analytics: Before/after analytics with deltas
- recommendations: AI recommendations with priority and expected impact
"""

from services.report.executive_summary import ExecutiveSummaryGenerator
from services.report.analytics import AnalyticsGenerator
from services.report.recommendations import RecommendationsGenerator

__all__ = [
    "ExecutiveSummaryGenerator", "AnalyticsGenerator", "RecommendationsGenerator",
]

