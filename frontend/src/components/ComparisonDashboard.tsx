import React from 'react';
import { AnalysisReport } from '../types/index';
import { downloadComparisonPdf } from '../utils/generateComparisonPdf';
import './ComparisonDashboard.css';

/**
 * ComparisonDashboard Component
 * 
 * Displays a side-by-side comparison of baseline vs improved presentation analysis,
 * highlighting growth areas and tracking performance deltas.
 * 
 * Features:
 * - Efficient data transformation with useMemo
 * - Delta calculation (Improved - Baseline) for all metrics
 * - Sorted insights showing top improvements
 * - Color-coded indicators (green positive, red negative)
 * - PDF export functionality
 */

interface ComparisonDashboardProps {
  /** Original presentation analysis (baseline reference) */
  baselineReport: AnalysisReport;

  /** Updated presentation analysis (latest attempt) */
  improvedReport: AnalysisReport;

  /** Optional AI-generated insights about the comparison */
  insights?: string;

  /** Optional callback when PDF export is triggered */
  onExportPdf?: (filename: string) => void;
}

/**
 * Type definition for calculated delta metrics
 * Used internally for comparison calculations and sorting
 */
interface DeltaMetric {
  /** Category name (e.g., "Structure", "Clarity") */
  name: string;

  /** Score from baseline analysis */
  baselineScore: number;

  /** Score from improved analysis */
  improvedScore: number;

  /** Calculated change (improvedScore - baselineScore) */
  delta: number;

  /** Absolute change for sorting purposes */
  absoluteDelta: number;

  /** Percentage change relative to baseline */
  percentageChange: number;

  /** Indicator: 'improvement', 'decline', or 'stable' */
  status: 'improvement' | 'decline' | 'stable';
}

/**
 * Type definition for overall comparison metrics
 */
interface ComparisonMetrics {
  /** Overall score delta */
  overallDelta: number;

  /** Overall percentage change */
  overallPercentageChange: number;

  /** Array of category deltas sorted by magnitude (descending) */
  categoryDeltas: DeltaMetric[];

  /** Top 3 areas of improvement */
  topImprovements: DeltaMetric[];

  /** Top 3 areas of concern (if any) */
  topConcerns: DeltaMetric[];

  /** Number of categories with improvement */
  improvementCount: number;

  /** Number of categories with decline */
  declineCount: number;
}

/**
 * ComparisonDashboard - React Functional Component
 * 
 * Renders a comprehensive comparison dashboard with visual indicators
 * and export functionality.
 * 
 * @param props - Component props
 * @returns React element
 */
export const ComparisonDashboard: React.FC<ComparisonDashboardProps> = ({
  baselineReport,
  improvedReport,
  insights = '',
  onExportPdf,
}) => {
  // State for PDF export loading
  const [isExporting, setIsExporting] = React.useState(false);

  /**
   * COMPARISON METRICS CALCULATION - useMemo Hook
   * 
   * Efficiency: Recalculates only when baselineReport or improvedReport changes
   * 
   * Mathematical Logic:
   * =========================================================================
   * 1. DELTA CALCULATION FORMULA:
   *    Delta = Improved Score - Baseline Score
   *    Range: -100 to +100 (absolute change in points)
   * 
   * 2. PERCENTAGE CHANGE FORMULA:
   *    Percentage Change = (Delta / Baseline Score) × 100%
   *    
   *    Example calculations:
   *    - Baseline: 70, Improved: 85
   *      Delta = 85 - 70 = +15 points
   *      Percentage = (15 / 70) × 100 = +21.4%
   *    
   *    - Baseline: 80, Improved: 72
   *      Delta = 72 - 80 = -8 points
   *      Percentage = (-8 / 80) × 100 = -10%
   * 
   * 3. STABILITY CHECK:
   *    If |Delta| < 2 points, consider "stable" (accounts for rounding)
   * 
   * 4. SORTING STRATEGY:
   *    Sort by |Delta| (absolute value) descending
   *    This prioritizes large changes (positive or negative) over small fluctuations
   * 
   * 5. INSIGHT EXTRACTION:
   *    Top Improvements: Filter where delta > 0, take top 3 by magnitude
   *    Top Concerns: Filter where delta < 0, take top 3 by magnitude (ascending)
   * 
   * =========================================================================
   */
  const comparisonMetrics = React.useMemo<ComparisonMetrics>(() => {
    // Step 1: Calculate overall score delta
    const overallDelta = improvedReport.overall_score - baselineReport.overall_score;
    const overallPercentageChange = (overallDelta / baselineReport.overall_score) * 100;

    // Step 2: Process each category to calculate deltas
    /**
     * CATEGORY ITERATION & DELTA COMPUTATION
     * 
     * Process:
     * - Iterate through each category in baseline_scores (Source of Truth)
     * - For each category, fetch scores from both baseline and improved reports
     * - Apply delta formula: improved - baseline
     * - Determine status based on delta magnitude:
     *   * Improvement: delta > 2
     *   * Decline: delta < -2
     *   * Stable: -2 ≤ delta ≤ 2
     * - Store all metrics in array for further processing
     */
    const categoryDeltas: DeltaMetric[] = Object.entries(
      baselineReport.category_scores
    ).map(([categoryName, baselineScore]) => {
      const improvedScore = improvedReport.category_scores[
        categoryName as keyof typeof improvedReport.category_scores
      ];

      const bScore = baselineScore !== undefined ? baselineScore : 0;
      const iScore = improvedScore !== undefined ? improvedScore : 0;

      const delta = iScore - bScore;
      const absoluteDelta = Math.abs(delta);
      const percentageChange = bScore !== 0 ? (delta / bScore) * 100 : 0;

      // Determine status with 2-point stability threshold
      let status: 'improvement' | 'decline' | 'stable';
      if (delta > 2) {
        status = 'improvement';
      } else if (delta < -2) {
        status = 'decline';
      } else {
        status = 'stable';
      }

      return {
        name: categoryName,
        baselineScore: bScore,
        improvedScore: iScore,
        delta,
        absoluteDelta,
        percentageChange,
        status,
      };
    });

    // Step 3: Sort by absolute delta (descending)
    /**
     * SORTING ALGORITHM
     * 
     * Why absolute delta?
     * - Both +15 and -15 represent significant changes
     * - We want to identify ALL major shifts, not just positive ones
     * - This ensures important performance declines aren't missed
     * 
     * Sorting order: Higher absolute changes first
     * Impact: Top improvements and top concerns bubble to top of list
     */
    const sortedByMagnitude = [...categoryDeltas].sort(
      (a, b) => b.absoluteDelta - a.absoluteDelta
    );

    // Step 4: Extract top improvements and concerns
    /**
     * INSIGHT EXTRACTION LOGIC
     * 
     * Top Improvements: All categories where delta > 0, sorted by delta (descending)
     * Top Concerns: All categories where delta < 0, sorted by delta (ascending)
     * 
     * We take top 3 of each to focus on most impactful changes
     */
    const topImprovements = categoryDeltas
      .filter((metric) => metric.delta > 0)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 3);

    const topConcerns = categoryDeltas
      .filter((metric) => metric.delta < 0)
      .sort((a, b) => a.delta - b.delta)
      .slice(0, 3);

    // Step 5: Count improvements and declines for summary
    const improvementCount = categoryDeltas.filter(
      (m) => m.status === 'improvement'
    ).length;
    const declineCount = categoryDeltas.filter(
      (m) => m.status === 'decline'
    ).length;

    return {
      overallDelta,
      overallPercentageChange,
      categoryDeltas: sortedByMagnitude,
      topImprovements,
      topConcerns,
      improvementCount,
      declineCount,
    };
  }, [baselineReport, improvedReport]);

  /**
   * Handle PDF export click
   */
  const handleExportPdf = async (): Promise<void> => {
    try {
      setIsExporting(true);
      downloadComparisonPdf(
        baselineReport,
        improvedReport,
        insights || 'No additional insights provided.',
        comparisonMetrics
      );
      onExportPdf?.('comparison-pdf-exported');
    } catch (error) {
      console.error('Failed to export comparison PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Utility function to format percentage display
   * Shows + or - prefix with 1 decimal place
   */
  const formatPercentage = (percentage: number): string => {
    const sign = percentage > 0 ? '+' : '';
    return `${sign}${percentage.toFixed(1)}%`;
  };

  /**
   * Utility function to format score display
   * Shows 1 decimal place for consistency
   */
  const formatScore = (score: number): string => {
    return score.toFixed(1);
  };

  return (
    <div className="comparison-dashboard">
      {/* ====================================================================
          HEADER SECTION
          ==================================================================== */}
      <div className="comparison-header">
        <h2>Performance Comparison Dashboard</h2>
        <p className="comparison-subtitle">
          Baseline vs Improved Performance Analysis
        </p>
      </div>

      {/* ====================================================================
          OVERALL IMPROVEMENT SUMMARY CARD
          ==================================================================== */}
      <div className="comparison-summary-card">
        <div className="summary-item">
          <label>Overall Score Change</label>
          <div className={`score-delta ${comparisonMetrics.overallDelta >= 0 ? 'positive' : 'negative'}`}>
            <span className="delta-value">
              {comparisonMetrics.overallDelta >= 0 ? '+' : ''}
              {comparisonMetrics.overallDelta.toFixed(1)}
            </span>
            <span className="delta-percentage">
              ({formatPercentage(comparisonMetrics.overallPercentageChange)})
            </span>
          </div>
        </div>

        <div className="summary-item">
          <label>Baseline Score</label>
          <div className="score-value">
            {formatScore(baselineReport.overall_score)}/100
          </div>
        </div>

        <div className="summary-item">
          <label>Current Score</label>
          <div className="score-value">
            {formatScore(improvedReport.overall_score)}/100
          </div>
        </div>

        <div className="summary-item">
          <label>Categories Improved</label>
          <div className="status-badge positive">
            {comparisonMetrics.improvementCount}/7
          </div>
        </div>

        {comparisonMetrics.declineCount > 0 && (
          <div className="summary-item">
            <label>Areas of Concern</label>
            <div className="status-badge negative">
              {comparisonMetrics.declineCount}/7
            </div>
          </div>
        )}
      </div>

      {/* ====================================================================
          INSIGHTS & VERDICT SECTION
          ==================================================================== */}
      {insights && (
        <div className="comparison-insights">
          <h3>Analysis Insights</h3>
          <p>{insights}</p>
        </div>
      )}

      {/* ====================================================================
          TOP IMPROVEMENTS SECTION
          ==================================================================== */}
      {comparisonMetrics.topImprovements.length > 0 && (
        <div className="comparison-improvements">
          <h3>Top Improvements</h3>
          <div className="metrics-list">
            {comparisonMetrics.topImprovements.map((metric) => (
              <div key={metric.name} className="metric-item improvement">
                <div className="metric-header">
                  <span className="metric-name">{metric.name}</span>
                  <span className={`metric-delta positive`}>
                    +{metric.delta.toFixed(1)}
                  </span>
                </div>
                <div className="metric-scores">
                  <span className="baseline">
                    {formatScore(metric.baselineScore)}
                  </span>
                  <span className="arrow">to</span>
                  <span className="improved">
                    {formatScore(metric.improvedScore)}
                  </span>
                </div>
                <div className="metric-percentage">
                  {formatPercentage(metric.percentageChange)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ====================================================================
          AREAS OF CONCERN SECTION
          ==================================================================== */}
      {comparisonMetrics.topConcerns.length > 0 && (
        <div className="comparison-concerns">
          <h3>Areas of Concern</h3>
          <div className="metrics-list">
            {comparisonMetrics.topConcerns.map((metric) => (
              <div key={metric.name} className="metric-item decline">
                <div className="metric-header">
                  <span className="metric-name">{metric.name}</span>
                  <span className={`metric-delta negative`}>
                    {metric.delta.toFixed(1)}
                  </span>
                </div>
                <div className="metric-scores">
                  <span className="baseline">
                    {formatScore(metric.baselineScore)}
                  </span>
                  <span className="arrow">to</span>
                  <span className="improved">
                    {formatScore(metric.improvedScore)}
                  </span>
                </div>
                <div className="metric-percentage">
                  {formatPercentage(metric.percentageChange)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ====================================================================
          ALL CATEGORY COMPARISON TABLE
          ==================================================================== */}
      <div className="comparison-table-section">
        <h3>Complete Category Breakdown</h3>
        <div className="comparison-table">
          <div className="table-header">
            <div className="table-col category-col">Category</div>
            <div className="table-col score-col">Baseline</div>
            <div className="table-col score-col">Current</div>
            <div className="table-col delta-col">Change</div>
            <div className="table-col percentage-col">% Change</div>
          </div>

          {comparisonMetrics.categoryDeltas.map((metric) => (
            <div
              key={metric.name}
              className={`table-row ${metric.status}`}
            >
              <div className="table-col category-col">{metric.name}</div>
              <div className="table-col score-col">
                {formatScore(metric.baselineScore)}
              </div>
              <div className="table-col score-col">
                {formatScore(metric.improvedScore)}
              </div>
              <div
                className={`table-col delta-col ${
                  metric.delta > 0 ? 'positive' : metric.delta < 0 ? 'negative' : 'stable'
                }`}
              >
                {metric.delta > 0 ? '+' : ''}
                {metric.delta.toFixed(1)}
              </div>
              <div
                className={`table-col percentage-col ${
                  metric.delta > 0 ? 'positive' : metric.delta < 0 ? 'negative' : 'stable'
                }`}
              >
                {formatPercentage(metric.percentageChange)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ====================================================================
          EXPORT PDF BUTTON
          ==================================================================== */}
      <div className="comparison-actions">
        <button
          className="export-comparison-button"
          onClick={handleExportPdf}
          disabled={isExporting}
          type="button"
          aria-label="Export comparison as PDF"
        >
          {isExporting ? (
            <>
              Generating PDF...
            </>
          ) : (
            <>
              Export Comparison as PDF
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ComparisonDashboard;
