/**
 * DocumentAnalyzer Page (Phase 2)
 * Iterative version uploader & comparison dashboard (V1 vs V2)
 */

import React, { useState } from 'react';
import FileUploader from '../components/FileUploader';
import Button from '../components/Button';
import { useNavigate } from 'react-router-dom';
import { analyzeDocument, compareDocuments } from '../services/api';
import { AnalysisReport, ComparisonReport } from '../types';
import { downloadProgressReportPDF } from '../services/pdfGenerator';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import './DocumentAnalyzer.css';

// Sub-component: 7Cs Pie Chart
const SevenCsPieChart: React.FC<{ scores?: any; overallScore?: number }> = ({ scores, overallScore = 70 }) => {
  const defaultScores = {
    Clear: Math.max(25, overallScore - 5),
    Concise: Math.max(25, overallScore - 12),
    Correct: Math.max(25, overallScore - 10),
    Complete: Math.max(25, overallScore - 15),
    Courteous: Math.min(100, overallScore + 5),
    Concrete: Math.max(25, overallScore - 8),
    Consistent: Math.max(25, overallScore - 14)
  };
  const activeScores = scores || defaultScores;
  
  // Normalize keys to capitalize them (in case the API returns lowercase keys)
  const normalizedScores: Record<string, number> = {};
  Object.entries(activeScores).forEach(([key, val]) => {
    const normalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
    normalizedScores[normalizedKey] = typeof val === 'number' ? val : 70;
  });

  const data = Object.entries(normalizedScores).map(([name, value]) => ({
    name,
    value
  }));

  const COLORS = [
    '#4f46e5', // Clear - Indigo
    '#10b981', // Concise - Emerald
    '#f43f5e', // Correct - Rose
    '#f59e0b', // Complete - Amber
    '#8b5cf6', // Courteous - Purple
    '#ec4899', // Concrete - Pink
    '#06b6d4', // Consistent - Cyan
  ];

  return (
    <div className="seven-cs-chart-wrapper">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: any) => [`${value}/100`, 'Score']}
            contentStyle={{ borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(15, 23, 42, 0.95)', color: '#fff' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="seven-cs-legend">
        {data.map((entry, index) => (
          <div key={entry.name} className="legend-item">
            <span className="legend-color-dot" style={{ backgroundColor: COLORS[index] }}></span>
            <span className="legend-label">{entry.name}: <strong>{entry.value}</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Sub-component: Progress Donut Chart
const ProgressDonutChart: React.FC<{ v1Score: number; v2Score: number }> = ({ v1Score, v2Score }) => {
  const gain = Math.max(0, v2Score - v1Score);
  const startScore = v1Score;
  const gap = 100 - Math.max(v1Score, v2Score);

  const data = [
    { name: 'V1 Baseline', value: startScore, color: '#6366f1' }, // Indigo
    { name: 'Progress Gain', value: gain, color: '#10b981' }, // Emerald
    { name: 'Remaining Gap', value: gap, color: 'rgba(148, 163, 184, 0.15)' } // Slate / muted
  ];

  // If there's a decline
  const hasDecline = v2Score < v1Score;
  const declineData = hasDecline ? [
    { name: 'V2 Current Score', value: v2Score, color: '#6366f1' },
    { name: 'Score Loss', value: v1Score - v2Score, color: '#f43f5e' },
    { name: 'Remaining Gap', value: 100 - v1Score, color: 'rgba(148, 163, 184, 0.15)' }
  ] : null;

  const activeData = declineData || data;

  return (
    <div className="progress-donut-wrapper">
      <div className="donut-chart-container">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={activeData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={95}
              paddingAngle={2}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
            >
              {activeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: any) => [`${value}%`, 'Percentage']} 
              contentStyle={{ borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(15, 23, 42, 0.95)', color: '#fff' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center-label">
          <span className="donut-value">{v2Score}</span>
          <span className="donut-sub">Current Score</span>
        </div>
      </div>
      <div className="progress-legend">
        {activeData.map((entry) => (
          <div key={entry.name} className="legend-item">
            <span className="legend-color-dot" style={{ backgroundColor: entry.color }}></span>
            <span className="legend-label">{entry.name}: <strong>{entry.value}%</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
};

const DocumentAnalyzer: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const handlePracticeWithCoach = () => {
    if (!v2Analysis) return;
    navigate('/practice', {
      state: {
        phase: 'analyzer',
        analysis: v2Analysis,
        session_id: 'document-' + (v2Analysis.document_name || 'practice'),
        v1Analysis: v1Analysis,
        v2Analysis: v2Analysis,
        v1Text: v1Analysis?.original_text || '',
        v2Text: v2Analysis?.original_text || '',
        comparison: comparison
      }
    });
  };
  
  // File states
  const [v1File, setV1File] = useState<File | null>(null);
  const [v2File, setV2File] = useState<File | null>(null);
  
  // Analysis report states
  const [v1Analysis, setV1Analysis] = useState<AnalysisReport | null>(null);
  const [v2Analysis, setV2Analysis] = useState<AnalysisReport | null>(null);
  const [comparison, setComparison] = useState<ComparisonReport | null>(null);
  
  // UX states
  const [activeReportTab, setActiveReportTab] = useState<'comparison' | 'v1' | 'v2'>('comparison');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // File selectors
  const handleV1Select = (file: File) => {
    setV1File(file);
    setError(null);
    setV1Analysis(null);
    setV2File(null);
    setV2Analysis(null);
    setComparison(null);
    setStep(1);
  };

  const handleV2Select = (file: File) => {
    setV2File(file);
    setError(null);
    setV2Analysis(null);
    setComparison(null);
  };

  // Analyze Version 1
  const handleAnalyzeV1 = async () => {
    if (!v1File) {
      setError('Please select Version 1 file first');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeDocument(v1File);
      setV1Analysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze Version 1');
    } finally {
      setLoading(false);
    }
  };

  // Analyze Version 2
  const handleAnalyzeV2 = async () => {
    if (!v2File) {
      setError('Please select Version 2 file first');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeDocument(v2File);
      setV2Analysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze Version 2');
    } finally {
      setLoading(false);
    }
  };

  // Generate Comparison
  const handleCompare = async () => {
    if (!v1Analysis || !v2Analysis) {
      setError('Both versions must be analyzed before comparison');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const v1Text = v1Analysis.original_text || "";
      const v2Text = v2Analysis.original_text || "";
      const result = await compareDocuments(
        v1Text,
        v2Text,
        v1Analysis.overall_score,
        v2Analysis.overall_score,
        v1File?.name || 'presentation.pdf'
      );
      setComparison(result);
      setStep(3);
      setActiveReportTab('comparison');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate comparison report');
    } finally {
      setLoading(false);
    }
  };

  // Reset all
  const handleReset = () => {
    setV1File(null);
    setV2File(null);
    setV1Analysis(null);
    setV2Analysis(null);
    setComparison(null);
    setStep(1);
    setError(null);
  };

  const handleDownloadReport = () => {
    if (!v1Analysis || !v2Analysis) return;
    
    const categoryScores = [
      { name: 'Structure', v1: v1Analysis.category_scores.Structure || 0, v2: v2Analysis.category_scores.Structure || 0 },
      { name: 'Clarity', v1: v1Analysis.category_scores.Clarity || 0, v2: v2Analysis.category_scores.Clarity || 0 },
      { name: 'Persuasion', v1: v1Analysis.category_scores.Persuasion || 0, v2: v2Analysis.category_scores.Persuasion || 0 },
      { name: 'Content Quality', v1: v1Analysis.category_scores.Content_Quality || 0, v2: v2Analysis.category_scores.Content_Quality || 0 },
      { name: 'Call to Action', v1: v1Analysis.category_scores.Call_to_Action || 0, v2: v2Analysis.category_scores.Call_to_Action || 0 },
      { name: 'Grammar and Syntax', v1: v1Analysis.category_scores.Grammar_and_Syntax || 0, v2: v2Analysis.category_scores.Grammar_and_Syntax || 0 },
      { name: 'Accuracy', v1: v1Analysis.category_scores.Accuracy || 0, v2: v2Analysis.category_scores.Accuracy || 0 },
      { name: 'Tone Appropriateness', v1: v1Analysis.category_scores.Tone_Appropriateness || 0, v2: v2Analysis.category_scores.Tone_Appropriateness || 0 },
      { name: 'Audience Alignment', v1: v1Analysis.category_scores.Audience_Alignment || 0, v2: v2Analysis.category_scores.Audience_Alignment || 0 },
      { name: 'Purpose Fulfillment', v1: v1Analysis.category_scores.Purpose_Fulfillment || 0, v2: v2Analysis.category_scores.Purpose_Fulfillment || 0 },
    ];

    downloadProgressReportPDF({
      title: 'Presentation Revision Progress Report',
      documentName: v1File?.name || v1Analysis.document_name || 'presentation_draft.pdf',
      v1Score: v1Analysis.overall_score,
      v2Score: v2Analysis.overall_score,
      gain: v2Analysis.overall_score - v1Analysis.overall_score,
      categoryScores,
      synthesis: comparison?.synthesis_summary || 'Your presentation has been revised and compared successfully.',
      improvements: comparison?.key_improvements || [],
      remaining: comparison?.remaining_issues || [],
    }, `Progress_Report_${v1Analysis.document_name.replace(/\.[^/.]+$/, "")}.pdf`);
  };

  // Recharts data mapper
  const getChartData = () => {
    if (!v1Analysis || !v2Analysis) return [];
    
    // Explicitly align properties
    const keys = [
      'Structure',
      'Clarity',
      'Persuasion',
      'Content_Quality',
      'Call_to_Action',
      'Grammar_and_Syntax',
      'Accuracy',
      'Tone_Appropriateness',
      'Audience_Alignment',
      'Purpose_Fulfillment'
    ] as const;
    return keys.map(key => ({
      name: key.replace(/_/g, ' '),
      'Version 1': v1Analysis.category_scores[key as keyof typeof v1Analysis.category_scores] || 0,
      'Version 2': v2Analysis.category_scores[key as keyof typeof v2Analysis.category_scores] || 0,
    }));
  };

  return (
    <div className="document-analyzer">
      <h1>Iterative Presentation Analyzer</h1>
      <p className="subtitle">
        Improve your presentation in 3 steps: Upload a draft (V1), apply suggestions, upload the revision (V2), and track your progress.
      </p>

      {/* Step Navigation Indicator */}
      <div className="step-wizard-indicator">
        <button 
          className={`step-tab ${step === 1 ? 'active' : ''} ${v1Analysis ? 'completed' : ''}`}
          onClick={() => setStep(1)}
        >
          <span className="step-num">1</span>
          <span className="step-label">V1: Initial Draft</span>
        </button>
        <div className="step-line"></div>
        <button 
          className={`step-tab ${step === 2 ? 'active' : ''} ${v2Analysis ? 'completed' : ''}`}
          disabled={!v1Analysis}
          onClick={() => setStep(2)}
        >
          <span className="step-num">2</span>
          <span className="step-label">V2: Improved Version</span>
        </button>
        <div className="step-line"></div>
        <button 
          className={`step-tab ${step === 3 ? 'active' : ''}`}
          disabled={!v1Analysis || !v2Analysis}
          onClick={() => {
            if (comparison) {
              setStep(3);
            } else {
              handleCompare();
            }
          }}
        >
          <span className="step-num">3</span>
          <span className="step-label">Progress Report</span>
        </button>
      </div>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* STEP 1 SCREEN */}
      {step === 1 && (
        <div className="step-container fadeIn">
          <h2>Step 1: Upload Your Initial Presentation (Version 1)</h2>
          <p className="step-description">Upload your draft slides or speaker notes (.pdf, .docx, .txt) to get your baseline scores and coaching feedback.</p>
          
          <div className="upload-box-wrapper">
            <FileUploader onFileSelect={handleV1Select} loading={loading} />
            {v1File && (
              <div className="selected-file-details">
                <span className="file-icon">Doc</span>
                <div>
                  <strong>{v1File.name}</strong>
                  <span className="file-size">({(v1File.size / 1024).toFixed(2)} KB)</span>
                </div>
              </div>
            )}
            
            {v1File && !v1Analysis && (
              <div className="action-button-container">
                <Button label="Analyze Version 1" onClick={handleAnalyzeV1} loading={loading} />
              </div>
            )}
          </div>

          {v1Analysis && (
            <div className="report-container">
              <div className="report-success-badge">Version 1 Analyzed Successfully!</div>
              
              <div className="score-summary-row">
                <div className="score-widget">
                  <h3>V1 Overall Score</h3>
                  <div className="score-circle">{v1Analysis.overall_score}</div>
                </div>
                <div className="feedback-widget">
                  <h3>Baseline Feedback</h3>
                  <p>{v1Analysis.detailed_feedback}</p>
                </div>
              </div>

              <div className="report-sections-grid">
                <div className="report-card seven-cs-card-container">
                  <h3>7Cs Evaluation</h3>
                  <div className="seven-cs-content-split">
                    <div className="checklist-grid">
                      {Object.entries(v1Analysis.seven_cs_evaluation).map(([c, val]) => {
                        const isObj = typeof val === 'object' && val !== null;
                        const status = isObj ? (val as any).status : null;
                        const feedback = isObj ? (val as any).feedback : String(val);
                        return (
                          <div key={c} className="c-item">
                            <strong>{c}:</strong>{' '}
                            {status && (
                              <span className={`status-badge ${status.toLowerCase().replace(/ /g, '-')}`}>
                                {status}
                              </span>
                            )}{' '}
                            {feedback}
                          </div>
                        );
                      })}
                    </div>
                    <SevenCsPieChart scores={v1Analysis.seven_cs_scores} overallScore={v1Analysis.overall_score} />
                  </div>
                </div>

                <div className="report-card">
                  <h3>Key Recommendations</h3>
                  <ul className="rec-list">
                    {v1Analysis.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                  {v1Analysis.improved_text && (
                    <div style={{ marginTop: '1.5rem' }}>
                      <h4 style={{ color: '#2d3748', marginBottom: '0.6rem', fontWeight: 600, fontSize: '0.95rem' }}>AI Professional Rewrite Snippet</h4>
                      <p style={{ fontSize: '0.85rem', color: '#4a5568', fontStyle: 'italic', lineHeight: 1.5, background: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        {v1Analysis.improved_text.length > 250 ? `${v1Analysis.improved_text.slice(0, 250)}...` : v1Analysis.improved_text}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="proceed-action-row">
                <Button 
                  label="Proceed to Step 2: Upload Revised Version" 
                  onClick={() => setStep(2)}
                  variant="primary"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2 SCREEN */}
      {step === 2 && v1Analysis && (
        <div className="step-container fadeIn">
          <h2>Step 2: Upload Your Revised Presentation (Version 2)</h2>
          <p className="step-description">
            Apply the recommendations from Version 1, improve your slides/text, and upload the updated file here.
          </p>

          <div className="baseline-banner">
            <span>Version 1 Score: <strong>{v1Analysis.overall_score}/100</strong></span>
            <span>Target: Fix grammatical issues, structure, and 7Cs.</span>
          </div>

          <div className="upload-box-wrapper">
            <FileUploader onFileSelect={handleV2Select} loading={loading} />
            {v2File && (
              <div className="selected-file-details">
                <span className="file-icon">Doc</span>
                <div>
                  <strong>{v2File.name}</strong>
                  <span className="file-size">({(v2File.size / 1024).toFixed(2)} KB)</span>
                </div>
              </div>
            )}
            
            {v2File && !v2Analysis && (
              <div className="action-button-container">
                <Button label="Analyze Version 2" onClick={handleAnalyzeV2} loading={loading} />
              </div>
            )}
          </div>

          {v2Analysis && (
            <div className="report-container">
              <div className="report-success-badge">Version 2 Analyzed Successfully!</div>
              
              <div className="score-summary-row">
                <div className="score-widget">
                  <h3>V2 Overall Score</h3>
                  <div className="score-circle v2-color">{v2Analysis.overall_score}</div>
                </div>
                <div className="feedback-widget">
                  <h3>Revised Version Feedback</h3>
                  <p>{v2Analysis.detailed_feedback}</p>
                </div>
              </div>

              <div className="report-sections-grid">
                <div className="report-card seven-cs-card-container">
                  <h3>Revised 7Cs Status</h3>
                  <div className="seven-cs-content-split">
                    <div className="checklist-grid">
                      {Object.entries(v2Analysis.seven_cs_evaluation).map(([c, val]) => {
                        const isObj = typeof val === 'object' && val !== null;
                        const status = isObj ? (val as any).status : null;
                        const feedback = isObj ? (val as any).feedback : String(val);
                        return (
                          <div key={c} className="c-item">
                            <strong>{c}:</strong>{' '}
                            {status && (
                              <span className={`status-badge ${status.toLowerCase().replace(/ /g, '-')}`}>
                                {status}
                              </span>
                            )}{' '}
                            {feedback}
                          </div>
                        );
                      })}
                    </div>
                    <SevenCsPieChart scores={v2Analysis.seven_cs_scores} overallScore={v2Analysis.overall_score} />
                  </div>
                </div>

                <div className="report-card">
                  <h3>Remaining Improvements</h3>
                  <ul className="rec-list">
                    {v2Analysis.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                  {v2Analysis.improved_text && (
                    <div style={{ marginTop: '1.5rem' }}>
                      <h4 style={{ color: '#2d3748', marginBottom: '0.6rem', fontWeight: 600, fontSize: '0.95rem' }}>AI Professional Rewrite Snippet</h4>
                      <p style={{ fontSize: '0.85rem', color: '#4a5568', fontStyle: 'italic', lineHeight: 1.5, background: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        {v2Analysis.improved_text.length > 250 ? `${v2Analysis.improved_text.slice(0, 250)}...` : v2Analysis.improved_text}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="proceed-action-row">
                <Button 
                  label="Generate Comparison Report" 
                  onClick={handleCompare}
                  loading={loading}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 3 SCREEN */}
      {step === 3 && v1Analysis && v2Analysis && (
        <div className="step-container fadeIn">
          <h2>Step 3: Revision Progress & Comparison Dashboard</h2>
          <p className="step-description">See how much your presentation structure, clarity, and overall communication quality improved between Version 1 and Version 2.</p>

          <div className="report-actions-header">
            <div className="report-badge-container">
              <span className="file-badge">{v1Analysis.document_name}</span>
              <span className={`improvement-badge ${v2Analysis.overall_score - v1Analysis.overall_score >= 0 ? 'positive' : 'negative'}`}>
                Gain: {v2Analysis.overall_score - v1Analysis.overall_score >= 0 ? '+' : ''}
                {v2Analysis.overall_score - v1Analysis.overall_score} pts
              </span>
            </div>
            <div className="report-actions-buttons">
              <Button 
                label="Download Report" 
                onClick={handleDownloadReport} 
                variant="primary" 
              />
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="tab-menu">
            <button 
              className={`tab-btn ${activeReportTab === 'comparison' ? 'active' : ''}`}
              onClick={() => setActiveReportTab('comparison')}
            >
              Progress Dashboard
            </button>
            <button 
              className={`tab-btn ${activeReportTab === 'v1' ? 'active' : ''}`}
              onClick={() => setActiveReportTab('v1')}
            >
              Version 1 Report
            </button>
            <button 
              className={`tab-btn ${activeReportTab === 'v2' ? 'active' : ''}`}
              onClick={() => setActiveReportTab('v2')}
            >
              Version 2 Report
            </button>
          </div>

          {/* TAB 1: COMPARISON REPORT */}
          {activeReportTab === 'comparison' && (
            <div className="comparison-content-wrapper fadeIn">
              
              <div className="comparison-row-split">
                <div className="comparison-left-panel">
                  {/* Score Progress Overview */}
                  <div className="progress-overview-cards">
                    <div className="progress-card-metric">
                      <h4>V1 Score</h4>
                      <div className="metric-num">{v1Analysis.overall_score}</div>
                    </div>
                    <div className="arrow-spacer">to</div>
                    <div className="progress-card-metric">
                      <h4>V2 Score</h4>
                      <div className="metric-num v2-num">{v2Analysis.overall_score}</div>
                    </div>
                    <div className="progress-card-metric difference-card">
                      <h4>Progress Gain</h4>
                      <div className={`metric-num diff-num ${v2Analysis.overall_score - v1Analysis.overall_score >= 0 ? 'positive' : 'negative'}`}>
                        {v2Analysis.overall_score - v1Analysis.overall_score >= 0 ? '+' : ''}
                        {v2Analysis.overall_score - v1Analysis.overall_score}
                      </div>
                    </div>
                  </div>

                  {/* Progress Donut Chart */}
                  <div className="donut-chart-card">
                    <h3>Overall Score Progress</h3>
                    <ProgressDonutChart v1Score={v1Analysis.overall_score} v2Score={v2Analysis.overall_score} />
                  </div>
                </div>

                <div className="comparison-right-panel">
                  {/* Visual Category Comparison Chart */}
                  <div className="visual-chart-card">
                    <h3>Category-Wise Score Comparison</h3>
                    <div className="chart-container-wrapper" style={{ width: '100%', height: 320 }}>
                      <ResponsiveContainer>
                        <BarChart
                          data={getChartData()}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" interval={0} />
                          <YAxis domain={[0, 100]} />
                          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(15, 23, 42, 0.95)', color: '#fff' }} />
                          <Legend />
                          <Bar dataKey="Version 1" fill="#6366f1" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Version 2" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Progress Synthesis */}
              {comparison && (
                <div className="ai-synthesis-grid">
                  <div className="synthesis-card summary-text">
                    <h3>AI Coach Progress Synthesis</h3>
                    <p>{comparison.synthesis_summary}</p>
                  </div>
                  
                  <div className="synthesis-lists-split">
                    <div className="list-box improvements-box">
                      <h4>Key Improvements Achieved</h4>
                      <ul>
                        {comparison.key_improvements.map((imp, idx) => (
                          <li key={idx}>{imp}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="list-box remaining-box">
                      <h4>Remaining Areas to Polish</h4>
                      <ul>
                        {comparison.remaining_issues.map((iss, idx) => (
                          <li key={idx}>{iss}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Text Diff Comparison */}
              {v1Analysis.original_text && v2Analysis.original_text && (
                <div className="version-diff-viewer">
                  <h3>Text Changes: V1 vs. V2</h3>
                  <p>Check where text was modified, corrected, or expanded in the updated slides:</p>
                  <div className="diff-container">
                    <ReactDiffViewer
                      oldValue={v1Analysis.original_text}
                      newValue={v2Analysis.original_text}
                      splitView={true}
                      leftTitle="Version 1 Draft"
                      rightTitle="Version 2 Revision"
                      styles={{
                        variables: {
                          light: {
                            diffViewerBackground: '#ffffff',
                            addedBackground: '#e6ffec',
                            addedColor: '#24292e',
                            removedBackground: '#ffeef0',
                            removedColor: '#24292e',
                            wordAddedBackground: '#acf2bd',
                            wordRemovedBackground: '#fdb8c0',
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: VERSION 1 FULL REPORT */}
          {activeReportTab === 'v1' && (
            <div className="full-report-tab fadeIn">
              <h3>Version 1 Analysis Details</h3>
              <div className="score-summary-row">
                <div className="score-widget">
                  <h3>Overall Score</h3>
                  <div className="score-circle">{v1Analysis.overall_score}</div>
                </div>
                <div className="feedback-widget">
                  <h3>Detailed Feedback</h3>
                  <p>{v1Analysis.detailed_feedback}</p>
                </div>
              </div>
              <div className="report-sections-grid" style={{ marginTop: '2rem' }}>
                <div className="report-card seven-cs-card-container">
                  <h3>7Cs Evaluation</h3>
                  <div className="seven-cs-content-split">
                    <div className="checklist-grid">
                      {Object.entries(v1Analysis.seven_cs_evaluation).map(([c, val]) => {
                        const isObj = typeof val === 'object' && val !== null;
                        const status = isObj ? (val as any).status : null;
                        const feedback = isObj ? (val as any).feedback : String(val);
                        return (
                          <div key={c} className="c-item">
                            <strong>{c}:</strong>{' '}
                            {status && (
                              <span className={`status-badge ${status.toLowerCase().replace(/ /g, '-')}`}>
                                {status}
                              </span>
                            )}{' '}
                            {feedback}
                          </div>
                        );
                      })}
                    </div>
                    <SevenCsPieChart scores={v1Analysis.seven_cs_scores} overallScore={v1Analysis.overall_score} />
                  </div>
                </div>
                <div className="report-card">
                  <h3>Recommendations</h3>
                  <ul className="rec-list">
                    {v1Analysis.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                  {v1Analysis.improved_text && (
                    <div style={{ marginTop: '2rem' }}>
                      <h4 style={{ color: '#2d3748', marginBottom: '0.8rem', fontWeight: 600 }}>AI Coach Professional Rewrite Suggestion</h4>
                      <p style={{ fontSize: '0.95rem', color: '#4a5568', fontStyle: 'italic', lineHeight: 1.6, background: '#fff', padding: '1.2rem', borderRadius: '8px', border: '1px solid #e2e8f0', whiteSpace: 'pre-line' }}>
                        {v1Analysis.improved_text}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VERSION 2 FULL REPORT */}
          {activeReportTab === 'v2' && (
            <div className="full-report-tab fadeIn">
              <h3>Version 2 Analysis Details</h3>
              <div className="score-summary-row">
                <div className="score-widget">
                  <h3>Overall Score</h3>
                  <div className="score-circle v2-color">{v2Analysis.overall_score}</div>
                </div>
                <div className="feedback-widget">
                  <h3>Detailed Feedback</h3>
                  <p>{v2Analysis.detailed_feedback}</p>
                </div>
              </div>
              <div className="report-sections-grid" style={{ marginTop: '2rem' }}>
                <div className="report-card seven-cs-card-container">
                  <h3>7Cs Evaluation</h3>
                  <div className="seven-cs-content-split">
                    <div className="checklist-grid">
                      {Object.entries(v2Analysis.seven_cs_evaluation).map(([c, val]) => {
                        const isObj = typeof val === 'object' && val !== null;
                        const status = isObj ? (val as any).status : null;
                        const feedback = isObj ? (val as any).feedback : String(val);
                        return (
                          <div key={c} className="c-item">
                            <strong>{c}:</strong>{' '}
                            {status && (
                              <span className={`status-badge ${status.toLowerCase().replace(/ /g, '-')}`}>
                                {status}
                              </span>
                            )}{' '}
                            {feedback}
                          </div>
                        );
                      })}
                    </div>
                    <SevenCsPieChart scores={v2Analysis.seven_cs_scores} overallScore={v2Analysis.overall_score} />
                  </div>
                </div>
                <div className="report-card">
                  <h3>Recommendations</h3>
                  <ul className="rec-list">
                    {v2Analysis.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                  {v2Analysis.improved_text && (
                    <div style={{ marginTop: '2rem' }}>
                      <h4 style={{ color: '#2d3748', marginBottom: '0.8rem', fontWeight: 600 }}>AI Coach Professional Rewrite Suggestion</h4>
                      <p style={{ fontSize: '0.95rem', color: '#4a5568', fontStyle: 'italic', lineHeight: 1.6, background: '#fff', padding: '1.2rem', borderRadius: '8px', border: '1px solid #e2e8f0', whiteSpace: 'pre-line' }}>
                        {v2Analysis.improved_text}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Restart Analysis Row */}
          <div className="reset-container" style={{ marginTop: '3rem', display: 'flex', gap: '1.5rem', justifyContent: 'center' }}>
            <Button label="Practice with AI Coach" onClick={handlePracticeWithCoach} variant="primary" />
            <Button label="Analyze New Presentation" onClick={handleReset} variant="secondary" />
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentAnalyzer;
