import React from 'react';

interface LiveFeedbackOverlayProps {
  eyeContact: number;
  posture: number;
  hint: string;
  isStreaming: boolean;
  confidence: number;
  emotion: string;
}

const LiveFeedbackOverlay: React.FC<LiveFeedbackOverlayProps> = ({
  eyeContact,
  posture,
  hint,
  isStreaming,
  confidence,
  emotion,
}) => {
  if (!isStreaming) return null;

  // Compute status colors
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981'; // Green
    if (score >= 60) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  const getEmotionColor = (emo: string) => {
    switch (emo.toLowerCase()) {
      case 'confident':
      case 'engaging':
        return '#10b981'; // Green
      case 'neutral':
        return '#6366f1'; // Indigo
      case 'distracted':
      case 'anxious':
        return '#f59e0b'; // Amber
      case 'nervous':
        return '#ef4444'; // Red
      default:
        return '#6b7280'; // Gray
    }
  };

  return (
    <div style={wrapperStyle}>
      {/* Real-time Indicator Banners */}
      <div style={hudContainerStyle}>
        <div style={hudItemStyle}>
          <span style={hudLabelStyle}>EYE CONTACT</span>
          <span style={{ ...hudValueStyle, color: getScoreColor(eyeContact) }}>
            {eyeContact}%
          </span>
        </div>
        <div style={hudItemStyle}>
          <span style={hudLabelStyle}>POSTURE</span>
          <span style={{ ...hudValueStyle, color: getScoreColor(posture) }}>
            {posture}%
          </span>
        </div>
        <div style={hudItemStyle}>
          <span style={hudLabelStyle}>CONFIDENCE</span>
          <span style={{ ...hudValueStyle, color: getScoreColor(confidence) }}>
            {confidence}%
          </span>
        </div>
      </div>

      {/* Dynamic Hint Prompt Bubble with Facial Emotion */}
      {(hint || emotion) && (
        <div style={hintBubbleStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%' }}>
            {emotion && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em' }}>FACIAL EMOTION:</span>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  backgroundColor: getEmotionColor(emotion),
                  padding: '0.15rem 0.5rem',
                  borderRadius: '4px',
                  textTransform: 'uppercase'
                }}>
                  {emotion}
                </span>
              </div>
            )}
            {hint && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderTop: emotion ? '1px solid rgba(255, 255, 255, 0.1)' : 'none', paddingTop: emotion ? '0.4rem' : '0' }}>
                <span style={hintIconStyle}>💡</span>
                <p style={hintTextStyle}>{hint}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const wrapperStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none', // Allow clicking through elements to video if necessary
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  padding: '1.2rem',
  boxSizing: 'border-box',
};

const hudContainerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '1rem',
  width: '100%',
};

const hudItemStyle: React.CSSProperties = {
  background: 'rgba(15, 23, 42, 0.85)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '8px',
  padding: '0.5rem 1rem',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  minWidth: '100px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
};

const hudLabelStyle: React.CSSProperties = {
  fontSize: '0.65rem',
  fontWeight: 800,
  color: '#94a3b8',
  letterSpacing: '0.1em',
  marginBottom: '0.2rem',
};

const hudValueStyle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 800,
  fontFamily: "'Outfit', sans-serif",
};

const hintBubbleStyle: React.CSSProperties = {
  alignSelf: 'center',
  background: 'rgba(15, 23, 42, 0.9)',
  backdropFilter: 'blur(12px)',
  border: '1.5px solid #4f46e5',
  borderRadius: '12px',
  padding: '0.8rem 1.5rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.8rem',
  maxWidth: '85%',
  boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.4)',
  marginBottom: '1rem',
  animation: 'pulseGlow 2s infinite',
};

const hintIconStyle: React.CSSProperties = {
  fontSize: '1.2rem',
};

const hintTextStyle: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '0.9rem',
  fontWeight: 600,
  margin: 0,
  lineHeight: 1.4,
};

export default LiveFeedbackOverlay;
