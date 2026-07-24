import React from 'react';
import './ReportDashboard.css';

interface ReportDashboardProps {
  report: {
    overall_score: number;
    topic: string;
    category_scores: {
      Structure: number;
      Clarity: number;
      Persuasion: number;
      Content_Quality: number;
      Call_to_Action: number;
    };
    seven_cs_evaluation?: {
      Clear: string;
      Concise: string;
      Correct: string;
      Complete: string;
      Courteous: string;
      Concrete: string;
      Consistent: string;
    };
    seven_cs_scores: {
      Clear: number;
      Concise: number;
      Correct: number;
      Complete: number;
      Courteous: number;
      Concrete: number;
      Consistent: number;
    };
    strengths: string[];
    recommendations: string[];
    qna_analysis: string;
    improved_text?: string;
    comparison: {
      improved: boolean;
      difference: number;
      note: string;
    };
    session_metrics: {
      avg_eye_contact: number;
      avg_posture: number;
      avg_wpm: number;
      total_fillers: number;
      interruptions_handled: number;
      avg_confidence?: number;
      avg_vocal_pitch?: number;
    };
  };
  onReset: () => void;
  resetButtonLabel?: string;
}

const ReportDashboard: React.FC<ReportDashboardProps> = ({ report, onReset, resetButtonLabel }) => {
  const getScoreColorClass = (score: number) => {
    if (score >= 80) return 'score-green';
    if (score >= 60) return 'score-amber';
    return 'score-red';
  };

  return (
    <div className="report-dashboard fadeIn">
      {/* Header and Summary Scorecard */}
      <div className="dashboard-header-card">
        <div className="header-text">
          <h1>Presentation Feedback</h1>
          <p className="topic-badge">Topic: {report.topic}</p>
        </div>
        <div className="score-badge-circle">
          <div className="circle-score-val">{report.overall_score}</div>
          <span className="circle-score-label">OVERALL</span>
        </div>
      </div>

      {/* Progress Comparison Matrix */}
      <div className="comparison-banner-card">
        <div className="comparison-header">
          <h3>Progress Analysis</h3>
        </div>
        <p className="comp-note">{report.comparison.note}</p>
        {report.comparison.difference !== 0 && (
          <div className={`comp-diff-badge ${report.comparison.improved ? 'positive' : 'negative'}`}>
            {report.comparison.improved ? '+' : ''}{report.comparison.difference} points vs last session
          </div>
        )}
      </div>

      {/* Grid: Standard 5 Category Scores & Telemetry */}
      <div className="scores-grid">
        {/* Category Scores */}
        <div className="score-panel-card">
          <h2>Performance Dimensions</h2>
          <div className="metric-row">
            <span>Structure (Flow & Organization)</span>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${report.category_scores.Structure}%`, backgroundColor: '#4f46e5' }}></div>
              <span className="bar-val">{report.category_scores.Structure}%</span>
            </div>
          </div>
          <div className="metric-row">
            <span>Clarity (Vocabulary & Pacing)</span>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${report.category_scores.Clarity}%`, backgroundColor: '#8b5cf6' }}></div>
              <span className="bar-val">{report.category_scores.Clarity}%</span>
            </div>
          </div>
          <div className="metric-row">
            <span>Persuasion (Confidence & Conviction)</span>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${report.category_scores.Persuasion}%`, backgroundColor: '#ec4899' }}></div>
              <span className="bar-val">{report.category_scores.Persuasion}%</span>
            </div>
          </div>
          <div className="metric-row">
            <span>Content Quality (Depth & Answers)</span>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${report.category_scores.Content_Quality}%`, backgroundColor: '#10b981' }}></div>
              <span className="bar-val">{report.category_scores.Content_Quality}%</span>
            </div>
          </div>
          <div className="metric-row">
            <span>Call to Action (Conclusion & Wrap-up)</span>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${report.category_scores.Call_to_Action}%`, backgroundColor: '#f59e0b' }}></div>
              <span className="bar-val">{report.category_scores.Call_to_Action}%</span>
            </div>
          </div>
        </div>

        {/* Live Session Telemetry Metrics */}
        <div className="telemetry-panel-card">
          <h2>Session Statistics</h2>
          <div className="telemetry-stats">
            <div className="telemetry-item">
              <span className="tel-label">Avg Eye Contact</span>
              <span className="tel-val">{report.session_metrics.avg_eye_contact}%</span>
            </div>
            <div className="telemetry-item">
              <span className="tel-label">Avg Posture</span>
              <span className="tel-val">{report.session_metrics.avg_posture}%</span>
            </div>
            <div className="telemetry-item">
              <span className="tel-label">Avg Confidence</span>
              <span className="tel-val">{report.session_metrics.avg_confidence !== undefined ? report.session_metrics.avg_confidence : 0}%</span>
            </div>
            <div className="telemetry-item">
              <span className="tel-label">Vocal Pitch Dynamics</span>
              <span className="tel-val">{report.session_metrics.avg_vocal_pitch !== undefined ? report.session_metrics.avg_vocal_pitch : 0}%</span>
            </div>
            <div className="telemetry-item">
              <span className="tel-label">Avg Speaking Pace</span>
              <span className="tel-val">{report.session_metrics.avg_wpm} WPM</span>
            </div>
            <div className="telemetry-item">
              <span className="tel-label">Fillers Detected</span>
              <span className={`tel-val ${report.session_metrics.total_fillers > 5 ? 'text-red' : ''}`}>
                {report.session_metrics.total_fillers}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 7 Cs Evaluation Table */}
      <div className="seven-cs-card">
        <h2>7 Cs Communication Scorecard</h2>
        <div className="seven-cs-detailed-list">
          {Object.entries(report.seven_cs_scores).map(([key, value]) => {
            const evalKey = key as keyof typeof report.seven_cs_scores;
            const rawEval = report.seven_cs_evaluation?.[evalKey];
            const isObj = typeof rawEval === 'object' && rawEval !== null;
            const status = isObj ? (rawEval as any).status : null;
            const evaluationText = isObj ? (rawEval as any).feedback : (rawEval || 'No evaluation description available for this metric.');
            return (
              <div className="c-detailed-item" key={key}>
                <div className="c-detailed-header">
                  <span className="c-name">{key}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {status && (
                      <span className={`status-badge ${status.toLowerCase().replace(/ /g, '-')}`}>
                        {status}
                      </span>
                    )}
                    <span className={`c-val-score ${getScoreColorClass(value)}`}>{value}/100</span>
                  </div>
                </div>
                <p className="c-evaluation-text">{evaluationText}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Strengths & Recommendations */}
      <div className="feedback-split-grid">
        <div className="feedback-list-card strengths-card">
          <h3>Top Strengths</h3>
          <ul>
            {report.strengths.map((str, idx) => (
              <li key={idx}>{str}</li>
            ))}
          </ul>
        </div>
        <div className="feedback-list-card recommendations-card">
          <h3>Improvement Steps</h3>
          <ul>
            {report.recommendations.map((rec, idx) => (
              <li key={idx}>{rec}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Interruption Q&A Assessment */}
      <div className="qna-card">
        <h2>Academic Panelist Question Handling</h2>
        <div className="qna-content">
          <p className="qna-summary">{report.qna_analysis}</p>
          <div className="qna-stats-sub">
            <span className="sub-qna-lbl">Interruptions Handled:</span>
            <span className="sub-qna-val">{report.session_metrics.interruptions_handled}</span>
          </div>
        </div>
      </div>

      {/* Professional Rewrite Suggestion */}
      {report.improved_text && (
        <div className="rewrite-section-card">
          <h2>AI Cleaned Transcript (Rewrite Suggestion)</h2>
          <p className="rewrite-subtitle">
            Here is a polished, grammatically correct version of your speech transcript with filler words and repetitions removed:
          </p>
          <div className="rewrite-text-display">
            {report.improved_text}
          </div>
        </div>
      )}

      {/* Reset/Start Over Button */}
      <div className="action-footer-row">
        <button className="reset-btn-premium" onClick={onReset}>
          {resetButtonLabel || "Practice New Session"}
        </button>
      </div>
    </div>
  );
};

export default ReportDashboard;
