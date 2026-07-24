import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLiveSession } from '../hooks/useLiveSession';
import VideoCapture from '../components/VideoCapture';
import LiveFeedbackOverlay from '../components/LiveFeedbackOverlay';
import ReportDashboard from '../components/ReportDashboard';
import { compareDocuments } from '../services/api';
import { downloadProgressReportPDF } from '../services/pdfGenerator';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './LiveCoach.css';

const LiveCoach: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id || 'guest';

  // ===== WIZARD STATE MANAGEMENT =====
  const [step, setStep] = useState(1);
  const [activeReportTab, setActiveReportTab] = useState<'comparison' | 'v1' | 'v2'>('comparison');

  const handlePracticeWithCoach = () => {
    if (!v2Report) return;
    navigate('/practice', {
      state: {
        phase: 'live-coach',
        analysis: v2Report,
        session_id: 'live-' + (v2Report.topic || Date.now()),
        v1Analysis: v1Report,
        v2Analysis: v2Report,
        v1Text: v1Report.improved_text || v1Report.original_text || ('Topic: ' + (v1Topic || v1Report.topic)),
        v2Text: v2Report.improved_text || v2Report.original_text || ('Topic: ' + v2Report.topic),
        comparison: comparison
      }
    });
  };
  
  // Version 1 Session States
  const [v1SessionId, setV1SessionId] = useState<string | null>(null);
  const [v1Report, setV1Report] = useState<any | null>(null);
  const [v1Topic, setV1Topic] = useState('');

  // Version 2 Session States
  const [v2SessionId, setV2SessionId] = useState<string | null>(null);
  const [v2Report, setV2Report] = useState<any | null>(null);

  // Comparison Report State
  const [comparison, setComparison] = useState<any | null>(null);

  // Live session interactive state
  const [topic, setTopic] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [answerText, setAnswerText] = useState('');


  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<any>(null);

  const {
    status,
    sessionId,
    currentQuestion,
    realtimeFeedback,
    hasHistory,
    historySummary,
    finalReport,
    error,
    startSession,
    sendAnswer,
    stopSession,
  } = useLiveSession({ userId, videoRef });

  // Handle timer
  useEffect(() => {
    if (status === 'STREAMING') {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [status]);

  // Save baseline and revision reports
  useEffect(() => {
    if (status === 'FINISHED' && finalReport && sessionId) {
      if (step === 1 && sessionId !== v2SessionId && !v1Report) {
        setV1Report(finalReport);
        setV1SessionId(sessionId);
        setV1Topic(topic);
      } else if (step === 2 && sessionId !== v1SessionId && !v2Report) {
        setV2Report(finalReport);
        setV2SessionId(sessionId);
      }
    }
  }, [status, finalReport, sessionId, step, topic, v1SessionId, v2SessionId, v1Report, v2Report]);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setSeconds(0);
    startSession(topic);
  };

  const handleFinish = () => {
    stopSession();
  };

  const handleAnswerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerText.trim()) return;
    sendAnswer(answerText);
    setAnswerText('');
  };

  // Generate Comparison Report
  const handleCompare = async () => {
    if (!v1Report || !v2Report) {
      return;
    }
    const v1Text = v1Report.improved_text || `Live Presentation session baseline on topic: ${v1Report.topic}`;
    const v2Text = v2Report.improved_text || `Live Presentation session revision on topic: ${v2Report.topic}`;
    
    setSeconds(0);
    
    try {
      const result = await compareDocuments(
        v1Text,
        v2Text,
        v1Report.overall_score,
        v2Report.overall_score,
        'live_coaching_practice.webm'
      );
      setComparison(result);
      setStep(3);
      setActiveReportTab('comparison');
    } catch (err) {
      console.error('Failed to generate live progress report:', err);
    }
  };

  const handleDownloadReport = () => {
    if (!v1Report || !v2Report) return;
    
    const categoryScores = [
      { name: 'Structure', v1: v1Report.category_scores.Structure || 0, v2: v2Report.category_scores.Structure || 0 },
      { name: 'Clarity', v1: v1Report.category_scores.Clarity || 0, v2: v2Report.category_scores.Clarity || 0 },
      { name: 'Persuasion', v1: v1Report.category_scores.Persuasion || 0, v2: v2Report.category_scores.Persuasion || 0 },
      { name: 'Content Quality', v1: v1Report.category_scores.Content_Quality || 0, v2: v2Report.category_scores.Content_Quality || 0 },
      { name: 'Call to Action', v1: v1Report.category_scores.Call_to_Action || 0, v2: v2Report.category_scores.Call_to_Action || 0 },
    ];

    const additionalMetrics = [
      { 
        label: 'Average Eye Contact', 
        v1: `${v1Report.session_metrics.avg_eye_contact}%`, 
        v2: `${v2Report.session_metrics.avg_eye_contact}%`,
        change: `${v2Report.session_metrics.avg_eye_contact - v1Report.session_metrics.avg_eye_contact >= 0 ? '+' : ''}${v2Report.session_metrics.avg_eye_contact - v1Report.session_metrics.avg_eye_contact}%`
      },
      { 
        label: 'Body Posture Accuracy', 
        v1: `${v1Report.session_metrics.avg_posture}%`, 
        v2: `${v2Report.session_metrics.avg_posture}%`,
        change: `${v2Report.session_metrics.avg_posture - v1Report.session_metrics.avg_posture >= 0 ? '+' : ''}${v2Report.session_metrics.avg_posture - v1Report.session_metrics.avg_posture}%`
      },
      { 
        label: 'Average Confidence', 
        v1: `${v1Report.session_metrics.avg_confidence !== undefined ? v1Report.session_metrics.avg_confidence : 0}%`, 
        v2: `${v2Report.session_metrics.avg_confidence !== undefined ? v2Report.session_metrics.avg_confidence : 0}%`,
        change: `${(v2Report.session_metrics.avg_confidence !== undefined ? v2Report.session_metrics.avg_confidence : 0) - (v1Report.session_metrics.avg_confidence !== undefined ? v1Report.session_metrics.avg_confidence : 0) >= 0 ? '+' : ''}${(v2Report.session_metrics.avg_confidence !== undefined ? v2Report.session_metrics.avg_confidence : 0) - (v1Report.session_metrics.avg_confidence !== undefined ? v1Report.session_metrics.avg_confidence : 0)}%`
      },
      { 
        label: 'Vocal Pitch Dynamics', 
        v1: `${v1Report.session_metrics.avg_vocal_pitch !== undefined ? v1Report.session_metrics.avg_vocal_pitch : 0}%`, 
        v2: `${v2Report.session_metrics.avg_vocal_pitch !== undefined ? v2Report.session_metrics.avg_vocal_pitch : 0}%`,
        change: `${(v2Report.session_metrics.avg_vocal_pitch !== undefined ? v2Report.session_metrics.avg_vocal_pitch : 0) - (v1Report.session_metrics.avg_vocal_pitch !== undefined ? v1Report.session_metrics.avg_vocal_pitch : 0) >= 0 ? '+' : ''}${(v2Report.session_metrics.avg_vocal_pitch !== undefined ? v2Report.session_metrics.avg_vocal_pitch : 0) - (v1Report.session_metrics.avg_vocal_pitch !== undefined ? v1Report.session_metrics.avg_vocal_pitch : 0)}%`
      },
      { 
        label: 'Speaking Pace', 
        v1: `${v1Report.session_metrics.avg_wpm} WPM`, 
        v2: `${v2Report.session_metrics.avg_wpm} WPM`,
        change: `${v2Report.session_metrics.avg_wpm - v1Report.session_metrics.avg_wpm >= 0 ? '+' : ''}${v2Report.session_metrics.avg_wpm - v1Report.session_metrics.avg_wpm} WPM`
      },
      { 
        label: 'Filler Words Count', 
        v1: `${v1Report.session_metrics.total_fillers}`, 
        v2: `${v2Report.session_metrics.total_fillers}`,
        change: `${v1Report.session_metrics.total_fillers - v2Report.session_metrics.total_fillers >= 0 ? '-' : '+'}${Math.abs(v1Report.session_metrics.total_fillers - v2Report.session_metrics.total_fillers)}`
      },
      { 
        label: 'Questions Handled', 
        v1: `${v1Report.session_metrics.interruptions_handled}`, 
        v2: `${v2Report.session_metrics.interruptions_handled}`,
        change: `${v2Report.session_metrics.interruptions_handled - v1Report.session_metrics.interruptions_handled >= 0 ? '+' : ''}${v2Report.session_metrics.interruptions_handled - v1Report.session_metrics.interruptions_handled}`
      }
    ];

    downloadProgressReportPDF({
      title: 'Live Presentation Revision Report',
      documentName: v1Topic || v1Report.topic || 'Live Practice Session',
      v1Score: v1Report.overall_score,
      v2Score: v2Report.overall_score,
      gain: v2Report.overall_score - v1Report.overall_score,
      categoryScores,
      synthesis: comparison?.synthesis_summary || 'Your live presentation practice has been revised and compared.',
      improvements: comparison?.key_improvements || [],
      remaining: comparison?.remaining_issues || [],
      additionalMetrics,
    }, 'Live_Coaching_Progress_Report.pdf');
  };

  const handleReset = () => {
    setTopic('');
    setSeconds(0);
    setAnswerText('');
    setStep(1);
    setV1SessionId(null);
    setV1Report(null);
    setV1Topic('');
    setV2SessionId(null);
    setV2Report(null);
    setComparison(null);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isSessionActive = status === 'STREAMING' || status === 'INTERRUPTED_Q&A' || status === 'REPORT_GENERATING';

  return (
    <div className="live-coach-page container">
      {/* Step Navigation Wizard (Only shown when session is NOT active) */}
      {!isSessionActive && (
        <div className="step-wizard-indicator">
          <button 
            className={`step-tab ${step === 1 ? 'active' : ''} ${v1Report ? 'completed' : ''}`}
            onClick={() => setStep(1)}
          >
            <span className="step-num">1</span>
            <span className="step-label">V1: Live Practice</span>
          </button>
          <div className="step-line"></div>
          <button 
            className={`step-tab ${step === 2 ? 'active' : ''} ${v2Report ? 'completed' : ''}`}
            disabled={!v1Report}
            onClick={() => setStep(2)}
          >
            <span className="step-num">2</span>
            <span className="step-label">V2: Revised Practice</span>
          </button>
          <div className="step-line"></div>
          <button 
            className={`step-tab ${step === 3 ? 'active' : ''}`}
            disabled={!v1Report || !v2Report}
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
      )}

      {/* ACTIVE PRESENTATION HUD */}
      {isSessionActive && (
        <>
          {status === 'STREAMING' && (
            <div className="practice-arena fadeIn">
              <div className="arena-left-pane">
                <div className="video-box-wrapper">
                  <VideoCapture videoRef={videoRef} isStreaming={true} />
                  <LiveFeedbackOverlay
                    eyeContact={realtimeFeedback.eyeContact}
                    posture={realtimeFeedback.posture}
                    hint={realtimeFeedback.hint}
                    isStreaming={true}
                    confidence={realtimeFeedback.confidence}
                    emotion={realtimeFeedback.emotion}
                  />
                </div>
                
                <div className="controls-hud">
                  <div className="timer-badge">{formatTime(seconds)}</div>
                  <button className="finish-btn-premium" onClick={handleFinish}>
                    Finish Presentation
                  </button>
                </div>
              </div>

              <div className="arena-right-pane">
                <div className="coach-feedback-hud">
                  <h2>Real-Time Metrics</h2>
                  <div className="meter-grid">
                    <div className="meter-card-hud">
                      <span className="meter-hud-lbl">Eye Contact</span>
                      <div className="meter-hud-ring-wrapper">
                        <span className="meter-hud-num">{realtimeFeedback.eyeContact}%</span>
                      </div>
                    </div>
                    <div className="meter-card-hud">
                      <span className="meter-hud-lbl">Body Posture</span>
                      <div className="meter-hud-ring-wrapper">
                        <span className="meter-hud-num">{realtimeFeedback.posture}%</span>
                      </div>
                    </div>
                    <div className="meter-card-hud">
                      <span className="meter-hud-lbl">Confidence</span>
                      <div className="meter-hud-ring-wrapper">
                        <span className="meter-hud-num">{realtimeFeedback.confidence}%</span>
                      </div>
                    </div>
                  </div>
                  {realtimeFeedback.emotion && (
                    <div style={{ marginTop: '1rem', padding: '0.6rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem', fontWeight: 600, letterSpacing: '0.05em' }}>FACIAL EMOTION</span>
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase' }}>{realtimeFeedback.emotion}</span>
                    </div>
                  )}

                  {hasHistory && historySummary && (
                    <div className="hud-memory-card">
                      <h4>Topic Target Target</h4>
                      <p>In your last session for this topic, your score was {historySummary.previous_score}. Keep an eye on:</p>
                      <ul>
                        {historySummary.top_recommendations.map((rec: string, i: number) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {status === 'INTERRUPTED_Q&A' && (
            <div className="interruption-modal fadeIn">
              <div className="interruption-card">
                <div className="panelist-indicator">
                  <span className="panelist-avatar">P</span>
                  <div>
                    <h3>Academic Examiner</h3>
                    <span className="question-status-badge">QUESTION DETECTED</span>
                  </div>
                </div>

                <p className="interruption-question">"{currentQuestion}"</p>

                <form onSubmit={handleAnswerSubmit} className="answer-form">
                  <textarea
                    placeholder="Formulate and type your answer here..."
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    required
                    className="answer-textarea"
                    rows={4}
                  />
                  <button type="submit" className="submit-answer-btn">
                    Submit Response
                  </button>
                </form>
              </div>
            </div>
          )}

          {status === 'REPORT_GENERATING' && (
            <div className="generating-card fadeIn">
              <div className="spinner-hud"></div>
              <h2>Compiling Presentation Analytics</h2>
              <p>Processing vocal dynamics, eye-gaze tracking frames, and panel responses...</p>
            </div>
          )}
        </>
      )}

      {/* STATIC SCREENS (When session is NOT active) */}
      {!isSessionActive && (
        <>
          {/* STEP 1 SCREENS */}
          {step === 1 && (
            <>
              {v1Report ? (
                <ReportDashboard 
                  report={v1Report} 
                  onReset={() => setStep(2)} 
                  resetButtonLabel="Proceed to Step 2 (Revision Practice)"
                />
              ) : (
                <div className="topic-selector-card fadeIn">
                  <span className="coach-badge">STEP 1: BASELINE SESSION</span>
                  <h1>Interactive Presentation Practice</h1>
                  <p className="subtitle">
                    Enter a presentation topic. The coach will track your visual presence, eye contact, posture, and pacing. 
                    An academic panel will occasionally interrupt you with real-time questions to test your depth.
                  </p>

                  <form onSubmit={handleStart} className="topic-form">
                    <input
                      type="text"
                      placeholder="e.g., Blockchain Scaling, Machine Learning in Health..."
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      required
                      className="topic-input"
                    />
                    <button type="submit" className="start-btn-premium">
                      Start Practice Session
                    </button>
                  </form>
                </div>
              )}
            </>
          )}

          {/* STEP 2 SCREENS */}
          {step === 2 && (
            <>
              {v2Report ? (
                <ReportDashboard 
                  report={v2Report} 
                  onReset={handleCompare} 
                  resetButtonLabel="Generate Progress Report"
                />
              ) : (
                <div className="topic-selector-card fadeIn">
                  <span className="coach-badge">STEP 2: REVISED SESSION</span>
                  <h1>Apply baseline recommendations and practice again!</h1>
                  
                  {v1Report && (
                    <div className="baseline-banner" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', padding: '1.2rem 1.5rem', backgroundColor: '#fffaf0', borderLeft: '5px solid #dd6b20', borderRadius: '6px', color: '#c05621', fontWeight: 500, margin: '1rem 0', textAlign: 'left' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>V1 Baseline Summary:</span>
                      <div style={{ display: 'flex', gap: '2rem', fontSize: '0.95rem' }}>
                        <span>Baseline Score: <strong>{v1Report.overall_score}/100</strong></span>
                        <span>Eye Contact: <strong>{v1Report.session_metrics.avg_eye_contact}%</strong></span>
                        <span>Posture: <strong>{v1Report.session_metrics.avg_posture}%</strong></span>
                        <span>Fillers: <strong>{v1Report.session_metrics.total_fillers}</strong></span>
                      </div>
                      <div style={{ fontSize: '0.9rem', borderTop: '1px solid rgba(221, 107, 32, 0.2)', paddingTop: '0.5rem' }}>
                        <strong>Top Improvement Advice:</strong>
                        <ul style={{ margin: '0.3rem 0 0 1.2rem', padding: 0, listStyleType: 'disc' }}>
                          {v1Report.recommendations.slice(0, 2).map((rec: string, i: number) => (
                            <li key={i}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  <p className="subtitle" style={{ marginTop: '1rem' }}>
                    Practice on your topic: <strong>{v1Topic || topic}</strong>. We will record a second session and compare your performance metrics against your baseline.
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
                    <button 
                      onClick={() => {
                        setSeconds(0);
                        startSession(v1Topic || topic);
                      }} 
                      className="start-btn-premium"
                    >
                      Start Revision Practice Session
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* STEP 3 SCREEN (COMPARISON VIEW) */}
          {step === 3 && v1Report && v2Report && (
            <div className="comparison-dashboard fadeIn" style={{ background: 'var(--card-bg)', padding: '2.5rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <h2>Step 3: Live Practice Revision Comparison</h2>
              <p className="step-description">Track improvements in your visual posture, gaze tracking, vocal fillers, and panel Q&A handling between your baseline and revision sessions.</p>

              <div className="report-actions-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', padding: '1.2rem 2.5rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)', marginBottom: '1.5rem' }}>
                <div className="report-badge-container" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <span className="file-badge" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', padding: '0.5rem 1.2rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>{v1Topic || v1Report.topic}</span>
                  <span className="improvement-badge" style={{ background: 'rgba(52, 211, 153, 0.08)', border: '1px solid rgba(52, 211, 153, 0.2)', color: '#34d399', padding: '0.5rem 1.2rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.9rem', fontWeight: 700, boxShadow: '0 0 10px rgba(52, 211, 153, 0.1)' }}>
                    Gain: +{v2Report.overall_score - v1Report.overall_score} pts
                  </span>
                </div>
                <div className="report-actions-buttons">
                  <button 
                    onClick={handleDownloadReport} 
                    className="start-btn-premium"
                    style={{ margin: 0, padding: '0.6rem 2rem', fontSize: '0.95rem' }}
                  >
                    Download Report
                  </button>
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
                  Session 1 (Baseline)
                </button>
                <button 
                  className={`tab-btn ${activeReportTab === 'v2' ? 'active' : ''}`}
                  onClick={() => setActiveReportTab('v2')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.8rem 1.5rem', fontWeight: 600, color: activeReportTab === 'v2' ? '#4f46e5' : '#718096', borderBottom: activeReportTab === 'v2' ? '3px solid #4f46e5' : '3px solid transparent' }}
                >
                  Session 2 (Revision)
                </button>
              </div>

              {activeReportTab === 'comparison' && (
                <div className="comparison-content-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                  {/* Score deltas */}
                  <div className="progress-overview-cards" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', backgroundColor: '#f9fafb', padding: '2rem', borderRadius: '12px', border: '1px solid #edf2f7' }}>
                    <div className="progress-card-metric" style={{ background: 'white', padding: '1.5rem', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', width: '150px', textAlign: 'center' }}>
                      <h4 style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Baseline Score</h4>
                      <span className="metric-num" style={{ fontSize: '2.5rem', fontWeight: 800, color: '#4b5563' }}>
                        {v1Report.overall_score}
                      </span>
                    </div>
                    <div className="arrow-spacer" style={{ fontSize: '2rem', color: '#9ca3af' }}>to</div>
                    <div className="progress-card-metric" style={{ background: 'white', padding: '1.5rem', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', width: '150px', textAlign: 'center' }}>
                      <h4 style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Revision Score</h4>
                      <span className="metric-num v2-num" style={{ fontSize: '2.5rem', fontWeight: 800, color: '#10b981' }}>
                        {v2Report.overall_score}
                      </span>
                    </div>
                    <div className="arrow-spacer" style={{ fontSize: '2rem', color: '#9ca3af' }}>=</div>
                    <div className="progress-card-metric difference-card" style={{ width: '180px', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1.5rem', borderRadius: '10px', textAlign: 'center' }}>
                      <h4 style={{ fontSize: '0.8rem', color: '#15803d', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Progress Gain</h4>
                      <span className="metric-num diff-num positive" style={{ fontSize: '2.5rem', fontWeight: 800, color: '#15803d' }}>
                        +{v2Report.overall_score - v1Report.overall_score}
                      </span>
                    </div>
                  </div>

                  {/* Progress Summary Cards */}
                  <div className="comparison-row-split" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', alignItems: 'start' }}>
                    <div className="comparison-left-panel" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                      {comparison && (
                        <div className="synthesis-card" style={{ padding: '2rem', borderRadius: '12px', backgroundColor: '#eff6ff', borderLeft: '5px solid #2563eb' }}>
                          <h3 style={{ fontSize: '1.25rem', color: '#1e40af', marginBottom: '1rem', fontWeight: 700 }}>AI Presentation Progress Synthesis</h3>
                          <p style={{ lineHeight: '1.7', color: '#1e3a8a', fontSize: '1.05rem' }}>{comparison.synthesis_summary}</p>
                        </div>
                      )}

                      {/* Improvements lists */}
                      {comparison && (
                        <div className="synthesis-lists-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                          <div className="list-box improvements-box" style={{ padding: '2rem', borderRadius: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                            <h4 style={{ fontSize: '1.15rem', color: '#15803d', marginBottom: '1rem', fontWeight: 700 }}>Key Improvements Achieved</h4>
                            <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                              {comparison.key_improvements.map((imp: string, idx: number) => (
                                <li key={idx} style={{ lineHeight: '1.6', color: '#166534' }}>{imp}</li>
                              ))}
                            </ul>
                          </div>
                          
                          <div className="list-box remaining-box" style={{ padding: '2rem', borderRadius: '12px', background: '#fffbeb', border: '1px solid #fef3c7' }}>
                            <h4 style={{ fontSize: '1.15rem', color: '#b45309', marginBottom: '1rem', fontWeight: 700 }}>Remaining Areas to Polish</h4>
                            <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                              {comparison.remaining_issues.map((iss: string, idx: number) => (
                                <li key={idx} style={{ lineHeight: '1.6', color: '#78350f' }}>{iss}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="comparison-right-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                      {/* Performance Dimension Comparison Chart */}
                      <div className="visual-chart-card" style={{ background: 'white', border: '1px solid #edf2f7', borderRadius: '12px', padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', height: '100%' }}>
                        <h3 style={{ fontSize: '1.25rem', color: '#1f2937', fontWeight: 700, marginBottom: '1.5rem' }}>Performance Dimension Comparison</h3>
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={[
                            { name: 'Structure', 'Version 1': v1Report.category_scores.Structure, 'Version 2': v2Report.category_scores.Structure },
                            { name: 'Clarity', 'Version 1': v1Report.category_scores.Clarity, 'Version 2': v2Report.category_scores.Clarity },
                            { name: 'Persuasion', 'Version 1': v1Report.category_scores.Persuasion, 'Version 2': v2Report.category_scores.Persuasion },
                            { name: 'Content Quality', 'Version 1': v1Report.category_scores.Content_Quality, 'Version 2': v2Report.category_scores.Content_Quality },
                            { name: 'Call to Action', 'Version 1': v1Report.category_scores.Call_to_Action, 'Version 2': v2Report.category_scores.Call_to_Action }
                          ]} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
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

                  {/* Visual & Vocal Metrics Comparison Table */}
                  <div className="metrics-comparison-card" style={{ background: 'white', border: '1px solid #edf2f7', borderRadius: '12px', padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    <h3 style={{ fontSize: '1.2rem', color: '#1f2937', fontWeight: 700, marginBottom: '1.5rem' }}>Visual & Vocal Metrics Comparison</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #edf2f7', color: '#4b5563', fontWeight: 600 }}>
                          <th style={{ padding: '0.8rem' }}>Metric</th>
                          <th style={{ padding: '0.8rem', textAlign: 'center' }}>Version 1</th>
                          <th style={{ padding: '0.8rem', textAlign: 'center' }}>Version 2</th>
                          <th style={{ padding: '0.8rem', textAlign: 'center' }}>Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #edf2f7' }}>
                          <td style={{ padding: '1rem', fontWeight: 500 }}>Average Eye Contact</td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>{v1Report.session_metrics.avg_eye_contact}%</td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>{v2Report.session_metrics.avg_eye_contact}%</td>
                          <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: v2Report.session_metrics.avg_eye_contact >= v1Report.session_metrics.avg_eye_contact ? '#10b981' : '#ef4444' }}>
                            {v2Report.session_metrics.avg_eye_contact >= v1Report.session_metrics.avg_eye_contact ? '+' : ''}
                            {v2Report.session_metrics.avg_eye_contact - v1Report.session_metrics.avg_eye_contact}%
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #edf2f7' }}>
                          <td style={{ padding: '1rem', fontWeight: 500 }}>Body Posture Accuracy</td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>{v1Report.session_metrics.avg_posture}%</td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>{v2Report.session_metrics.avg_posture}%</td>
                          <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: v2Report.session_metrics.avg_posture >= v1Report.session_metrics.avg_posture ? '#10b981' : '#ef4444' }}>
                            {v2Report.session_metrics.avg_posture >= v1Report.session_metrics.avg_posture ? '+' : ''}
                            {v2Report.session_metrics.avg_posture - v1Report.session_metrics.avg_posture}%
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #edf2f7' }}>
                          <td style={{ padding: '1rem', fontWeight: 500 }}>Average Confidence</td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>{v1Report.session_metrics.avg_confidence !== undefined ? v1Report.session_metrics.avg_confidence : 0}%</td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>{v2Report.session_metrics.avg_confidence !== undefined ? v2Report.session_metrics.avg_confidence : 0}%</td>
                          <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: (v2Report.session_metrics.avg_confidence !== undefined ? v2Report.session_metrics.avg_confidence : 0) >= (v1Report.session_metrics.avg_confidence !== undefined ? v1Report.session_metrics.avg_confidence : 0) ? '#10b981' : '#ef4444' }}>
                            {(v2Report.session_metrics.avg_confidence !== undefined ? v2Report.session_metrics.avg_confidence : 0) >= (v1Report.session_metrics.avg_confidence !== undefined ? v1Report.session_metrics.avg_confidence : 0) ? '+' : ''}
                            {(v2Report.session_metrics.avg_confidence !== undefined ? v2Report.session_metrics.avg_confidence : 0) - (v1Report.session_metrics.avg_confidence !== undefined ? v1Report.session_metrics.avg_confidence : 0)}%
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #edf2f7' }}>
                          <td style={{ padding: '1rem', fontWeight: 500 }}>Vocal Pitch Dynamics</td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>{v1Report.session_metrics.avg_vocal_pitch !== undefined ? v1Report.session_metrics.avg_vocal_pitch : 0}%</td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>{v2Report.session_metrics.avg_vocal_pitch !== undefined ? v2Report.session_metrics.avg_vocal_pitch : 0}%</td>
                          <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: (v2Report.session_metrics.avg_vocal_pitch !== undefined ? v2Report.session_metrics.avg_vocal_pitch : 0) >= (v1Report.session_metrics.avg_vocal_pitch !== undefined ? v1Report.session_metrics.avg_vocal_pitch : 0) ? '#10b981' : '#ef4444' }}>
                            {(v2Report.session_metrics.avg_vocal_pitch !== undefined ? v2Report.session_metrics.avg_vocal_pitch : 0) >= (v1Report.session_metrics.avg_vocal_pitch !== undefined ? v1Report.session_metrics.avg_vocal_pitch : 0) ? '+' : ''}
                            {(v2Report.session_metrics.avg_vocal_pitch !== undefined ? v2Report.session_metrics.avg_vocal_pitch : 0) - (v1Report.session_metrics.avg_vocal_pitch !== undefined ? v1Report.session_metrics.avg_vocal_pitch : 0)}%
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #edf2f7' }}>
                          <td style={{ padding: '1rem', fontWeight: 500 }}>Average Speaking Pace</td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>{v1Report.session_metrics.avg_wpm} WPM</td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>{v2Report.session_metrics.avg_wpm} WPM</td>
                          <td style={{ padding: '1rem', textAlign: 'center', color: '#4b5563' }}>
                            {v2Report.session_metrics.avg_wpm} vs {v1Report.session_metrics.avg_wpm} WPM
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #edf2f7' }}>
                          <td style={{ padding: '1rem', fontWeight: 500 }}>Total Filler Words</td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>{v1Report.session_metrics.total_fillers}</td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>{v2Report.session_metrics.total_fillers}</td>
                          <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: v2Report.session_metrics.total_fillers <= v1Report.session_metrics.total_fillers ? '#10b981' : '#ef4444' }}>
                            {v2Report.session_metrics.total_fillers <= v1Report.session_metrics.total_fillers ? '-' : '+'}
                            {Math.abs(v2Report.session_metrics.total_fillers - v1Report.session_metrics.total_fillers)}
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #edf2f7' }}>
                          <td style={{ padding: '1rem', fontWeight: 500 }}>Panel Questions Handled</td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>{v1Report.session_metrics.interruptions_handled}</td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>{v2Report.session_metrics.interruptions_handled}</td>
                          <td style={{ padding: '1rem', textAlign: 'center', color: '#4b5563' }}>
                            {v2Report.session_metrics.interruptions_handled} vs {v1Report.session_metrics.interruptions_handled}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Reset Actions */}
                  <div className="proceed-action-row mt-4" style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
                    <button className="start-btn-premium" onClick={handlePracticeWithCoach} style={{ margin: 0 }}>
                      Practice with AI Coach
                    </button>
                    <button className="reset-btn-premium" onClick={handleReset} style={{ margin: 0 }}>
                      Practice New Topic Session
                    </button>
                  </div>
                </div>
              )}

              {activeReportTab === 'v1' && v1Report && (
                <ReportDashboard report={v1Report} onReset={handleReset} />
              )}
              {activeReportTab === 'v2' && v2Report && (
                <ReportDashboard report={v2Report} onReset={handleReset} />
              )}
            </div>
          )}
        </>
      )}

      {error && (
        <div className="error-alert">
          <span>Error:</span> {error}
        </div>
      )}
    </div>
  );
};

export default LiveCoach;
