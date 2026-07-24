/**
 * SpeechAnalyzer Page (Phase 3 Presentation Coach)
 * Real-time speech recording and analysis using MediaRecorder API and backend Whisper/Gemini integration.
 * Standardized 3-step revision comparison wizard (V1 -> V2 -> Progress Report).
 */

import React, { useState, useEffect, useRef } from 'react';
import Button from '../components/Button';
import { useNavigate } from 'react-router-dom';
import { analyzeAudio, analyzeSpeech, compareDocuments } from '../services/api';
import { SpeechMetrics, ComparisonReport } from '../types';
import { downloadProgressReportPDF } from '../services/pdfGenerator';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import './SpeechAnalyzer.css';

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

const SpeechAnalyzer: React.FC = () => {
  const navigate = useNavigate();
  // ===== WIZARD STATE MANAGEMENT =====
  const [step, setStep] = useState(1);
  const [activeReportTab, setActiveReportTab] = useState<'comparison' | 'v1' | 'v2'>('comparison');

  const handlePracticeWithCoach = () => {
    if (!v2Analysis) return;
    navigate('/practice', {
      state: {
        phase: 'speech',
        analysis: v2Analysis,
        session_id: 'speech-' + Date.now(),
        v1Analysis: v1Analysis,
        v2Analysis: v2Analysis,
        v1Text: v1Transcript,
        v2Text: v2Transcript,
        comparison: comparison
      }
    });
  };
  
  // Version 1 State
  const [v1Transcript, setV1Transcript] = useState('');
  const [v1Duration, setV1Duration] = useState(0);
  const [v1Analysis, setV1Analysis] = useState<SpeechMetrics | null>(null);

  // Version 2 State
  const [v2Transcript, setV2Transcript] = useState('');
  const [v2Duration, setV2Duration] = useState(0);
  const [v2Analysis, setV2Analysis] = useState<SpeechMetrics | null>(null);

  // Comparison State
  const [comparison, setComparison] = useState<ComparisonReport | null>(null);

  // Common UI / Temp Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ===== REFS FOR AUDIO RECORDING =====
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ===== CLEANUP ON COMPONENT UNMOUNT =====
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Web Audio Recording is not supported in this browser. Please use Chrome, Firefox, or Edge.');
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // ===== TIMER EFFECT: TRACK RECORDING DURATION IN SECONDS =====
  useEffect(() => {
    if (isRecording) {
      timerIntervalRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRecording]);

  // ===== START/STOP RECORDING HANDLER =====
  const handleToggleRecording = async () => {
    setError(null);

    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    } else {
      // Start recording
      setError(null);
      setDuration(0);
      audioChunksRef.current = [];

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Microphone error:', err);
        setError('Microphone access denied or unavailable. Please connect a microphone and check permissions.');
      }
    }
  };

  // ===== ANALYZE SPEECH: SEND FILE TO BACKEND =====
  const handleAnalyze = async () => {
    if (audioChunksRef.current.length === 0) {
      setError('Please record some speech audio first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
      const audioFile = new File([audioBlob], 'speech.wav', { type: 'audio/wav' });

      const result = await analyzeAudio(audioFile, duration);
      
      if (step === 1) {
        setV1Analysis(result);
        setV1Transcript(result.transcript || '');
        setV1Duration(duration);
      } else {
        setV2Analysis(result);
        setV2Transcript(result.transcript || '');
        setV2Duration(duration);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze speech audio');
    } finally {
      setLoading(false);
    }
  };

  // ===== GENERATE COMPARISON REPORT =====
  const handleCompare = async () => {
    if (!v1Analysis || !v2Analysis) {
      setError('Both versions must be analyzed before comparison');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const v1Score = v1Analysis.overall_score !== undefined ? v1Analysis.overall_score : v1Analysis.clarity_score;
      const v2Score = v2Analysis.overall_score !== undefined ? v2Analysis.overall_score : v2Analysis.clarity_score;

      const result = await compareDocuments(
        v1Transcript,
        v2Transcript,
        v1Score,
        v2Score,
        'speech_practice_comparison.wav'
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

  // ===== CLEAR RECORDING & TRANSCRIPT =====
  const handleClear = () => {
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setDuration(0);
    setError(null);
    setIsRecording(false);
    
    if (step === 1) {
      setV1Transcript('');
      setV1Duration(0);
      setV1Analysis(null);
    } else if (step === 2) {
      setV2Transcript('');
      setV2Duration(0);
      setV2Analysis(null);
    }
  };

  // ===== RESET ALL STATE =====
  const handleReset = () => {
    handleClear();
    setV1Transcript('');
    setV1Duration(0);
    setV1Analysis(null);
    setV2Transcript('');
    setV2Duration(0);
    setV2Analysis(null);
    setComparison(null);
    setStep(1);
  };

  const handleUseDemoSpeech = async () => {
    setLoading(true);
    setError(null);
    try {
      const demoV1Text = "Hello everyone, today I want to talk about, you know, blockchain technology. Basically, blockchain is like a distributed ledger, and actually, it is very secure. Um, we can use it for smart contracts, and kind of, you know, supply chain tracking. But the main problem is scalability. Um, we need to find, you know, better consensus mechanisms. So, basically, that is my presentation. Any questions?";
      const demoV2Text = "Good morning, everyone. Today, we will explore blockchain technology and its security benefits. Blockchain acts as a decentralized ledger, ensuring data integrity and tamper-proof records. While smart contracts and supply chain tracking are highly viable applications, scalability remains a critical challenge. To resolve this, we must develop more efficient consensus mechanisms. Thank you for your time, and I welcome any questions.";
      
      const textToAnalyze = step === 1 ? demoV1Text : demoV2Text;
      const durationSecs = step === 1 ? 30 : 25;
      
      const result = await analyzeSpeech(textToAnalyze, durationSecs);
      
      if (step === 1) {
        setV1Analysis(result);
        setV1Transcript(result.transcript || demoV1Text);
        setV1Duration(durationSecs);
      } else {
        setV2Analysis(result);
        setV2Transcript(result.transcript || demoV2Text);
        setV2Duration(durationSecs);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze demo speech');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = () => {
    if (!v1Analysis || !v2Analysis) return;
    
    const v1Score = v1Analysis.overall_score !== undefined ? v1Analysis.overall_score : v1Analysis.clarity_score;
    const v2Score = v2Analysis.overall_score !== undefined ? v2Analysis.overall_score : v2Analysis.clarity_score;

    const categoryScores = [
      { name: 'Structure', v1: v1Analysis.category_scores?.Structure || 0, v2: v2Analysis.category_scores?.Structure || 0 },
      { name: 'Clarity', v1: v1Analysis.category_scores?.Clarity || 0, v2: v2Analysis.category_scores?.Clarity || 0 },
      { name: 'Persuasion', v1: v1Analysis.category_scores?.Persuasion || 0, v2: v2Analysis.category_scores?.Persuasion || 0 },
      { name: 'Content Quality', v1: v1Analysis.category_scores?.Content_Quality || 0, v2: v2Analysis.category_scores?.Content_Quality || 0 },
      { name: 'Call to Action', v1: v1Analysis.category_scores?.Call_to_Action || 0, v2: v2Analysis.category_scores?.Call_to_Action || 0 },
    ];

    const additionalMetrics = [
      { 
        label: 'Word Count', 
        v1: `${v1Analysis.word_count} words`, 
        v2: `${v2Analysis.word_count} words`,
        change: `${v2Analysis.word_count - v1Analysis.word_count >= 0 ? '+' : ''}${v2Analysis.word_count - v1Analysis.word_count} words`
      },
      { 
        label: 'Speaking Pace (WPM)', 
        v1: `${v1Analysis.speech_speed_wpm} WPM`, 
        v2: `${v2Analysis.speech_speed_wpm} WPM`,
        change: `${v2Analysis.speech_speed_wpm - v1Analysis.speech_speed_wpm >= 0 ? '+' : ''}${v2Analysis.speech_speed_wpm - v1Analysis.speech_speed_wpm} WPM`
      },
      { 
        label: 'Filler Words Count', 
        v1: `${v1Analysis.filler_words_count}`, 
        v2: `${v2Analysis.filler_words_count}`,
        change: `${v2Analysis.filler_words_count - v1Analysis.filler_words_count <= 0 ? '' : '+'}${v2Analysis.filler_words_count - v1Analysis.filler_words_count}`
      },
      { 
        label: 'Word Repetitions', 
        v1: `${v1Analysis.repetition_count || 0}`, 
        v2: `${v2Analysis.repetition_count || 0}`,
        change: `${(v2Analysis.repetition_count || 0) - (v1Analysis.repetition_count || 0) <= 0 ? '' : '+'}${(v2Analysis.repetition_count || 0) - (v1Analysis.repetition_count || 0)}`
      }
    ];

    downloadProgressReportPDF({
      title: 'Speech Delivery Progression Report',
      documentName: 'Speech Practice Session',
      v1Score,
      v2Score,
      gain: v2Score - v1Score,
      categoryScores,
      synthesis: comparison?.synthesis_summary || 'Your speech has been revised and compared successfully.',
      improvements: comparison?.key_improvements || [],
      remaining: comparison?.remaining_issues || [],
      additionalMetrics,
    }, 'Speech_Delivery_Progress_Report.pdf');
  };

  // ===== FORMAT DURATION TO MM:SS =====
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ===== RECHARTS BAR DATA FOR CATEGORY SCORE COMPARISON =====
  const getChartData = () => {
    if (!v1Analysis || !v2Analysis) return [];
    const keys = ['Structure', 'Clarity', 'Persuasion', 'Content_Quality', 'Call_to_Action'] as const;
    return keys.map(key => ({
      name: key.replace(/_/g, ' '),
      'Version 1': v1Analysis.category_scores?.[key] || 0,
      'Version 2': v2Analysis.category_scores?.[key] || 0,
    }));
  };

  // Helper to render individual report card
  const renderSingleReport = (report: SpeechMetrics, elapsedSecs: number) => {
    return (
      <div className="report-container fadeIn">
        {/* Overall Score & Feedback */}
        <div className="score-summary-row">
          <div className="score-widget">
            <h3>Overall Score</h3>
            <div className="score-circle">
              {report.overall_score !== undefined ? report.overall_score : report.clarity_score}
            </div>
          </div>
          <div className="feedback-widget">
            <h3>Speech Coach Summary</h3>
            <p>
              {report.detailed_feedback || 
               `Your speech analysis is complete. You spoke a total of ${report.word_count} words over ${report.duration_seconds || elapsedSecs} seconds, achieving an average pacing rate of ${report.speech_speed_wpm} WPM. Clarity was evaluated at ${report.clarity_score}/100 based on filler word density and repetition rates.`}
            </p>
          </div>
        </div>

        {/* Category Scores Breakdown */}
        {report.category_scores && (
          <div className="category-scores-section mt-4">
            <h3>Pacing & Quality Categories</h3>
            <div className="category-scores-grid">
              {Object.entries(report.category_scores).map(([cat, score]) => (
                <div key={cat} className="category-score-card">
                  <div className="category-score-header">
                    <span className="category-score-name">{cat.replace('_', ' ')}</span>
                    <span className="category-score-num">{score}/100</span>
                  </div>
                  <div className="category-score-bar">
                    <div 
                      className="category-score-fill" 
                      style={{ width: `${score}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Metrics Grid */}
        <div className="metrics-section mt-4">
          <h3>Speaking Delivery Metrics</h3>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-icon">Stats</div>
              <div className="metric-label">Word Count</div>
              <div className="metric-value">{report.word_count}</div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">Pace</div>
              <div className="metric-label">Pacing Speed (WPM)</div>
              <div className="metric-value">{report.speech_speed_wpm}</div>
              <div className="metric-subtext">
                {report.speech_speed_wpm > 160 
                  ? 'Speaking Fast' 
                  : report.speech_speed_wpm < 100 
                    ? 'Speaking Slow' 
                    : 'Optimal Pace (120-160 WPM)'}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">Fillers</div>
              <div className="metric-label">Filler Words</div>
              <div className="metric-value">{report.filler_words_count}</div>
              <div className="metric-subtext">{report.filler_words_percentage.toFixed(1)}% of total speech</div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">Repeats</div>
              <div className="metric-label">Word Repetitions</div>
              <div className="metric-value">{report.repetition_count || 0}</div>
              <div className="metric-subtext">Consecutive repeated words</div>
            </div>
          </div>
        </div>

        {/* 7Cs Evaluation */}
        {report.seven_cs_evaluation && (
          <div className="report-card seven-cs-card-container mt-4">
            <h3>7Cs Speech Evaluation</h3>
            <div className="seven-cs-content-split">
              <div className="checklist-grid">
                {Object.entries(report.seven_cs_evaluation).map(([cs, val]) => {
                  const isObj = typeof val === 'object' && val !== null;
                  const status = isObj ? (val as any).status : null;
                  const feedback = isObj ? (val as any).feedback : String(val);
                  return (
                    <div key={cs} className="c-item">
                      <strong>{cs}:</strong>{' '}
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
              <SevenCsPieChart scores={report.seven_cs_scores} overallScore={report.overall_score || report.clarity_score} />
            </div>
          </div>
        )}

        {/* Strengths & Recommendations */}
        <div className="report-sections-grid mt-4">
          {report.strengths && report.strengths.length > 0 && (
            <div className="strengths-list-section">
              <h4 className="strengths-list-title">Key Strengths Identified</h4>
              <ul className="strengths-list">
                {report.strengths.map((str, idx) => (
                  <li key={idx}>{str}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="report-card">
            <h3>Actionable Improvement Tips</h3>
            {report.recommendations && report.recommendations.length > 0 ? (
              <ul className="rec-list">
                {report.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            ) : report.actionable_feedback && report.actionable_feedback.length > 0 ? (
              <ul className="rec-list">
                {report.actionable_feedback.map((feedback, index) => (
                  <li key={index}>{feedback}</li>
                ))}
              </ul>
            ) : (
              <p className="no-feedback">Excellent speech delivery! No pacing or filler word improvements recommended.</p>
            )}
          </div>
        </div>

        {/* Rewrite Section */}
        {report.improved_text && (
          <div className="rewrite-section mt-4">
            <h3>AI Cleaned Transcript (Rewrite Suggestion)</h3>
            <p className="subtitle" style={{ fontSize: '0.85rem', marginBottom: '0.8rem', textAlign: 'left' }}>
              Here is a polished, grammatically correct version of your speech transcript with filler words and repetitions removed:
            </p>
            <div className="rewrite-text-display">
              {report.improved_text}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="speech-analyzer">
      <h1>Presentation Coach</h1>
      <p className="subtitle">
        Improve your speech delivery in 3 steps: Record a baseline (V1), apply metrics advice, record the revision (V2), and track your progress.
      </p>

      {/* Step Navigation Wizard */}
      <div className="step-wizard-indicator">
        <button 
          className={`step-tab ${step === 1 ? 'active' : ''} ${v1Analysis ? 'completed' : ''}`}
          onClick={() => setStep(1)}
        >
          <span className="step-num">1</span>
          <span className="step-label">V1: Initial Speech</span>
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
          <h2>Step 1: Record Your Initial Speech (Version 1)</h2>
          <p className="step-description">Click Start Recording to read your presentation slides or notes. We will analyze your pacing and clarity baseline.</p>

          <section className="recording-section">
            <div className={`recording-indicator ${isRecording ? 'active' : ''}`}>
              {isRecording && <div className="recording-pulse"></div>}
              <span>{isRecording ? 'Recording V1 Speech...' : 'Ready to Record V1'}</span>
            </div>

            <div className="duration-display">
              <span className="duration-label">Baseline Duration:</span>
              <span className="duration-value">{formatDuration(isRecording ? duration : v1Duration)}</span>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <Button
                label={isRecording ? 'Stop V1 Recording' : 'Start V1 Recording'}
                onClick={handleToggleRecording}
                disabled={loading}
              />
              {audioChunksRef.current.length > 0 && !isRecording && (
                <>
                  <Button
                    label="Analyze V1 Speech"
                    onClick={handleAnalyze}
                    loading={loading}
                  />
                  <Button
                    label="Clear"
                    onClick={handleClear}
                    variant="secondary"
                    disabled={loading}
                  />
                </>
              )}
              {!isRecording && audioChunksRef.current.length === 0 && (
                <Button
                  label="Load Demo Speech"
                  onClick={handleUseDemoSpeech}
                  variant="secondary"
                  disabled={loading}
                />
              )}
            </div>
          </section>

          {/* V1 Transcript */}
          {v1Transcript && !v1Analysis && (
            <section className="transcript-section mt-4">
              <label className="transcript-label">Current Speech Transcript</label>
              <div className="transcript-display">
                <p className="transcript-text">{v1Transcript}</p>
              </div>
            </section>
          )}

          {v1Analysis && (
            <>
              {renderSingleReport(v1Analysis, v1Duration)}
              <div className="proceed-action-row mt-4" style={{ display: 'flex', justifyContent: 'center', margin: '2rem 0' }}>
                <Button
                  label="Proceed to Step 2: Record Revised Speech"
                  onClick={() => {
                    setStep(2);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* STEP 2 SCREEN */}
      {step === 2 && (
        <div className="step-container fadeIn">
          <h2>Step 2: Record Your Revised Speech (Version 2)</h2>
          <p className="step-description">Practice speaking again. Try to avoid filler words (um, like, basically), keep an even pace, and address Version 1's feedback.</p>

          {v1Analysis && (
            <div className="baseline-banner" style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 1.5rem', backgroundColor: '#fffaf0', borderLeft: '5px solid #dd6b20', borderRadius: '6px', color: '#c05621', fontWeight: 500 }}>
              <span><strong>V1 Score Baseline:</strong> {v1Analysis.overall_score !== undefined ? v1Analysis.overall_score : v1Analysis.clarity_score}/100</span>
              <span>Pacing Rate: {v1Analysis.speech_speed_wpm} WPM</span>
              <span>Fillers Detected: {v1Analysis.filler_words_count}</span>
            </div>
          )}

          <section className="recording-section mt-4">
            <div className={`recording-indicator ${isRecording ? 'active' : ''}`}>
              {isRecording && <div className="recording-pulse"></div>}
              <span>{isRecording ? 'Recording V2 Speech...' : 'Ready to Record V2'}</span>
            </div>

            <div className="duration-display">
              <span className="duration-label">Revised Duration:</span>
              <span className="duration-value">{formatDuration(isRecording ? duration : v2Duration)}</span>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <Button
                label={isRecording ? 'Stop V2 Recording' : 'Start V2 Recording'}
                onClick={handleToggleRecording}
                disabled={loading}
              />
              {audioChunksRef.current.length > 0 && !isRecording && (
                <>
                  <Button
                    label="Analyze V2 Speech"
                    onClick={handleAnalyze}
                    loading={loading}
                  />
                  <Button
                    label="Clear"
                    onClick={handleClear}
                    variant="secondary"
                    disabled={loading}
                  />
                </>
              )}
              {!isRecording && audioChunksRef.current.length === 0 && (
                <Button
                  label="Load Demo Speech"
                  onClick={handleUseDemoSpeech}
                  variant="secondary"
                  disabled={loading}
                />
              )}
            </div>
          </section>

          {/* V2 Transcript */}
          {v2Transcript && !v2Analysis && (
            <section className="transcript-section mt-4">
              <label className="transcript-label">V2 Speech Transcript</label>
              <div className="transcript-display">
                <p className="transcript-text">{v2Transcript}</p>
              </div>
            </section>
          )}

          {v2Analysis && (
            <>
              {renderSingleReport(v2Analysis, v2Duration)}
              <div className="proceed-action-row mt-4" style={{ display: 'flex', justifyContent: 'center', margin: '2rem 0' }}>
                <Button
                  label="Proceed to Step 3: Compare Versions"
                  onClick={handleCompare}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* STEP 3 SCREEN (COMPARISON VIEW) */}
      {step === 3 && v1Analysis && v2Analysis && (
        <div className="step-container fadeIn">
          <h2>Step 3: Revision Progress Comparison</h2>
          <p className="step-description">Track improvements in your vocal delivery and structural score between the initial baseline and the revision.</p>

          <div className="report-actions-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card-bg)', padding: '1.2rem 2.5rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)', marginBottom: '1.5rem' }}>
            <div className="report-badge-container" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span className="file-badge" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', padding: '0.5rem 1.2rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>Speech Practice</span>
              {v1Analysis && v2Analysis && (
                <span className="improvement-badge" style={{ background: 'rgba(52, 211, 153, 0.08)', border: '1px solid rgba(52, 211, 153, 0.2)', color: '#34d399', padding: '0.5rem 1.2rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.9rem', fontWeight: 700, boxShadow: '0 0 10px rgba(52, 211, 153, 0.1)' }}>
                  Gain: +{(v2Analysis.overall_score !== undefined ? v2Analysis.overall_score : v2Analysis.clarity_score) - (v1Analysis.overall_score !== undefined ? v1Analysis.overall_score : v1Analysis.clarity_score)} pts
                </span>
              )}
            </div>
            <div className="report-actions-buttons">
              <Button 
                label="Download Report" 
                onClick={handleDownloadReport} 
                variant="primary" 
              />
            </div>
          </div>

          <div className="tab-menu" style={{ display: 'flex', gap: '1rem', borderBottom: '2px solid #edf2f7', marginBottom: '1rem' }}>
            <button 
              className={`tab-btn ${activeReportTab === 'comparison' ? 'active' : ''}`}
              onClick={() => setActiveReportTab('comparison')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.8rem 1.5rem', fontWeight: 600, color: activeReportTab === 'comparison' ? '#4f46e5' : '#718096', borderBottom: activeReportTab === 'comparison' ? '3px solid #4f46e5' : '3px solid transparent' }}
            >
              Progress Report
            </button>
            <button 
              className={`tab-btn ${activeReportTab === 'v1' ? 'active' : ''}`}
              onClick={() => setActiveReportTab('v1')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.8rem 1.5rem', fontWeight: 600, color: activeReportTab === 'v1' ? '#4f46e5' : '#718096', borderBottom: activeReportTab === 'v1' ? '3px solid #4f46e5' : '3px solid transparent' }}
            >
              Version 1 (Baseline)
            </button>
            <button 
              className={`tab-btn ${activeReportTab === 'v2' ? 'active' : ''}`}
              onClick={() => setActiveReportTab('v2')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.8rem 1.5rem', fontWeight: 600, color: activeReportTab === 'v2' ? '#4f46e5' : '#718096', borderBottom: activeReportTab === 'v2' ? '3px solid #4f46e5' : '3px solid transparent' }}
            >
              Version 2 (Revised)
            </button>
          </div>

          {activeReportTab === 'comparison' && (
            <div className="comparison-content-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
              {/* Score deltas */}
              <div className="progress-overview-cards" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', backgroundColor: '#f9fafb', padding: '2rem', borderRadius: '12px', border: '1px solid #edf2f7' }}>
                <div className="progress-card-metric" style={{ background: 'white', padding: '1.5rem', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', width: '150px', textAlign: 'center' }}>
                  <h4 style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Version 1</h4>
                  <span className="metric-num" style={{ fontSize: '2.5rem', fontWeight: 800, color: '#4b5563' }}>
                    {v1Analysis.overall_score !== undefined ? v1Analysis.overall_score : v1Analysis.clarity_score}
                  </span>
                </div>
                <div className="arrow-spacer" style={{ fontSize: '2rem', color: '#9ca3af' }}>to</div>
                <div className="progress-card-metric" style={{ background: 'white', padding: '1.5rem', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', width: '150px', textAlign: 'center' }}>
                  <h4 style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Version 2</h4>
                  <span className="metric-num v2-num" style={{ fontSize: '2.5rem', fontWeight: 800, color: '#10b981' }}>
                    {v2Analysis.overall_score !== undefined ? v2Analysis.overall_score : v2Analysis.clarity_score}
                  </span>
                </div>
                <div className="arrow-spacer" style={{ fontSize: '2rem', color: '#9ca3af' }}>=</div>
                
                {v1Analysis && v2Analysis && (
                  <div className="progress-card-metric difference-card" style={{ width: '180px', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1.5rem', borderRadius: '10px', textAlign: 'center' }}>
                    <h4 style={{ fontSize: '0.8rem', color: '#15803d', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Progress Gain</h4>
                    <span className="metric-num diff-num positive" style={{ fontSize: '2.5rem', fontWeight: 800, color: '#15803d' }}>
                      +{(v2Analysis.overall_score !== undefined ? v2Analysis.overall_score : v2Analysis.clarity_score) - (v1Analysis.overall_score !== undefined ? v1Analysis.overall_score : v1Analysis.clarity_score)}
                    </span>
                  </div>
                )}
              </div>

              {/* Progress Summary Cards */}
              <div className="comparison-row-split" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', alignItems: 'start' }}>
                <div className="comparison-left-panel" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {comparison && (
                    <div className="synthesis-card" style={{ padding: '2rem', borderRadius: '12px', backgroundColor: '#eff6ff', borderLeft: '5px solid #2563eb' }}>
                      <h3 style={{ fontSize: '1.25rem', color: '#1e40af', marginBottom: '1rem', fontWeight: 700 }}>AI Speech Progress Synthesis</h3>
                      <p style={{ lineHeight: '1.7', color: '#1e3a8a', fontSize: '1.05rem' }}>{comparison.synthesis_summary}</p>
                    </div>
                  )}

                  {/* Improvements lists */}
                  {comparison && (
                    <div className="synthesis-lists-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                      <div className="list-box improvements-box" style={{ padding: '2rem', borderRadius: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                        <h4 style={{ fontSize: '1.15rem', color: '#15803d', marginBottom: '1rem', fontWeight: 700 }}>Key Improvements Achieved</h4>
                        <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                          {comparison.key_improvements.map((imp, idx) => (
                            <li key={idx} style={{ lineHeight: '1.6', color: '#166534' }}>{imp}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="list-box remaining-box" style={{ padding: '2rem', borderRadius: '12px', background: '#fffbeb', border: '1px solid #fef3c7' }}>
                        <h4 style={{ fontSize: '1.15rem', color: '#b45309', marginBottom: '1rem', fontWeight: 700 }}>Remaining Areas to Polish</h4>
                        <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                          {comparison.remaining_issues.map((iss, idx) => (
                            <li key={idx} style={{ lineHeight: '1.6', color: '#78350f' }}>{iss}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                <div className="comparison-right-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                  {/* Radar/Bar Chart */}
                  <div className="visual-chart-card" style={{ background: 'white', border: '1px solid #edf2f7', borderRadius: '12px', padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', height: '100%' }}>
                    <h3 style={{ fontSize: '1.2rem', color: '#1f2937', fontWeight: 700, marginBottom: '1.5rem' }}>Performance Category Comparison</h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={getChartData()} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" interval={0} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Version 1" fill="#9ca3af" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Version 2" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Side-by-Side Transcript Diff */}
              <div className="version-diff-viewer mt-4" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <h3 style={{ fontSize: '1.3rem', color: '#1f2937', fontWeight: 700 }}>Speech Transcript Changes (V1 vs V2)</h3>
                <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>Compare the differences in your transcribed words. Red highlighted sections are removed filler words or sentences, while green highlights are your polished revisions.</p>
                
                <div className="diff-container" style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                  <ReactDiffViewer
                    oldValue={v1Transcript}
                    newValue={v2Transcript}
                    splitView={true}
                    leftTitle="Version 1 (Baseline)"
                    rightTitle="Version 2 (Revision)"
                    styles={{
                      variables: {
                        diffViewerBackground: '#f9fafb',
                        addedBackground: '#e6fffa',
                        addedGutterBackground: '#b2f5ea',
                        removedBackground: '#fff5f5',
                        removedGutterBackground: '#fed7d7'
                      }
                    } as any}
                  />
                </div>
              </div>

              {/* Reset Actions */}
              <div className="proceed-action-row mt-4" style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
                <Button label="Practice with AI Coach" onClick={handlePracticeWithCoach} variant="primary" />
                <Button label="Practice New Speech Topic" onClick={handleReset} variant="secondary" />
              </div>
            </div>
          )}

          {activeReportTab === 'v1' && renderSingleReport(v1Analysis, v1Duration)}
          {activeReportTab === 'v2' && renderSingleReport(v2Analysis, v2Duration)}
        </div>
      )}
    </div>
  );
};

export default SpeechAnalyzer;
