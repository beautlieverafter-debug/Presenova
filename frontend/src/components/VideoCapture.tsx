import React, { useEffect, useState } from 'react';

interface VideoCaptureProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isStreaming: boolean;
}

const VideoCapture: React.FC<VideoCaptureProps> = ({ videoRef, isStreaming }) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    let active = true;
    let localStream: MediaStream | null = null;

    if (isStreaming) {
      navigator.mediaDevices
        .getUserMedia({ video: { width: 640, height: 480 }, audio: false })
        .then((mediaStream) => {
          if (!active) {
            mediaStream.getTracks().forEach((track) => track.stop());
            return;
          }
          localStream = mediaStream;
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            videoRef.current.play().catch((err) => {
              console.warn('Webcam playback auto-start was interrupted or blocked:', err);
            });
          }
          setCameraActive(true);
        })
        .catch((err) => {
          console.error('Error accessing webcam:', err);
          setCameraActive(false);
        });
    } else {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setCameraActive(false);
    }

    return () => {
      active = false;
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isStreaming]);

  return (
    <div style={containerStyle}>
      {isStreaming ? (
        <video
          ref={videoRef as React.RefObject<HTMLVideoElement>}
          autoPlay
          muted
          playsInline
          style={videoStyle}
        />
      ) : (
        <div style={placeholderStyle}>
          <span style={iconStyle}>Camera</span>
          <p style={textStyle}>Camera is off</p>
        </div>
      )}
      {cameraActive && isStreaming && (
        <div style={badgeStyle}>
          <span style={dotStyle}></span> LIVE
        </div>
      )}
    </div>
  );
};

// Simple clean CSS-in-JS for isolation and robustness
const containerStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  minHeight: '320px',
  backgroundColor: '#0f172a',
  borderRadius: '12px',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid #334155',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
};

const videoStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  transform: 'scaleX(-1)', // Mirror effect for user convenience
};

const placeholderStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '1rem',
  color: '#94a3b8',
};

const iconStyle: React.CSSProperties = {
  fontSize: '3rem',
};

const textStyle: React.CSSProperties = {
  fontSize: '1rem',
  fontWeight: 600,
};

const badgeStyle: React.CSSProperties = {
  position: 'absolute',
  top: '1rem',
  left: '1rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  backgroundColor: 'rgba(239, 68, 68, 0.9)',
  color: '#ffffff',
  padding: '0.3rem 0.8rem',
  borderRadius: '99px',
  fontSize: '0.8rem',
  fontWeight: 700,
  letterSpacing: '0.05em',
};

const dotStyle: React.CSSProperties = {
  width: '8px',
  height: '8px',
  backgroundColor: '#ffffff',
  borderRadius: '50%',
  display: 'inline-block',
  animation: 'pulse 1.5s infinite',
};

export default VideoCapture;
