/**
 * PracticeMode Page (Phase 5)
 * Real-time AI Coach chat interface for multi-turn presentation practice
 *
 * Features:
 * - Multi-turn conversational chat with Gemini 1.5 Flash AI
 * - Professional chat bubble UI with user and AI messages
 * - Context-aware coaching based on analysis reports
 * - Real-time typing indicators during AI response generation
 * - Auto-scroll to latest messages
 * - Send message with Enter key, Shift+Enter for new lines
 */

import React, { useState, useRef, useEffect } from 'react';
import Button from '../components/Button';
import { useLocation } from 'react-router-dom';
import { sendChatMessage } from '../services/api';
import { ChatMessage, ContextReport } from '../types';
import './PracticeMode.css';

const PracticeMode: React.FC = () => {
  const location = useLocation();
  const passedContext = location.state as ContextReport | null;
  const [contextReport] = useState<ContextReport | null>(passedContext);

  const getInitialMessage = (context: ContextReport | null): string => {
    if (!context) {
      return "Hello! I'm your AI Coach, powered by advanced AI. I'm here to help you practice and improve your presentation skills. Share your topic, ask for feedback, or let's work on specific areas like pacing, clarity, or handling nervousness. What would you like to work on today?";
    }

    if (context.v2Analysis || context.v2Report) {
      const v1Score = context.v1Analysis?.overall_score ?? context.v1Report?.overall_score ?? 70;
      const v2Score = context.v2Analysis?.overall_score ?? context.v2Report?.overall_score ?? 75;
      const gain = v2Score - v1Score;
      const modeName = context.phase === 'analyzer' 
        ? 'Iterative Presentation Analyzer' 
        : context.phase === 'speech' 
          ? 'Speech Analyzer' 
          : 'Live Coach';
      
      return `Hello! I'm your AI Coach. I've successfully loaded all the files and comparison data from your ${modeName} session:
- **Baseline V1 Score**: ${v1Score}/100
- **Revised V2 Score**: ${v2Score}/100 (${gain >= 0 ? '+' : ''}${gain} pts improvement!)

I have analyzed the progress you've made, as well as the remaining areas to polish. I am ready to guide you on how to resolve the remaining gaps, improve slide flow, pacing, structure, delivery, and make your presentation 100% perfect. Ask me any question about how to fix these problems, or tell me when you're ready to start practicing!`;
    }

    if (!context.analysis) {
      return "Hello! I'm your AI Coach, powered by advanced AI. I'm here to help you practice and improve your presentation skills. Share your topic, ask for feedback, or let's work on specific areas like pacing, clarity, or handling nervousness. What would you like to work on today?";
    }

    const score = context.analysis.overall_score !== undefined 
      ? context.analysis.overall_score 
      : (context.analysis as any).clarity_score || 70;
      
    const details = context.phase === 'analyzer' 
      ? `your revised presentation draft (Overall Score: ${score}/100)`
      : context.phase === 'speech'
        ? `your revised speech practice session (Overall Score: ${score}/100)`
        : `your revised live practice session (Overall Score: ${score}/100)`;

    return `Hello! I'm your AI Coach. I have loaded the analysis from ${details}. I can see your strengths and areas for improvement. Let's practice pitching or focus on polishing your presentation. Ask me any question or tell me when you're ready to start practicing!`;
  };

  // ===== STATE MANAGEMENT =====
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: '1',
      role: 'ai',
      content: getInitialMessage(passedContext),
      timestamp: new Date().toISOString(),
    },
  ]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ===== REFS =====
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // ===== AUTO-SCROLL TO BOTTOM WHEN NEW MESSAGES ARRIVE =====
  // CRITICAL: This ensures users always see the latest message without manual scrolling
  useEffect(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [messages]);

  // ===== SEND MESSAGE HANDLER =====
  const handleSendMessage = async () => {
    // Validate input
    if (!userInput.trim()) {
      return;
    }

    // ===== STEP 1: ADD USER MESSAGE TO CHAT =====
    const newUserMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userInput,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setUserInput('');
    setIsLoading(true);
    setError(null);

    try {
      // ===== STEP 2: PREPARE CONTEXT REPORT =====
      // The context report includes analysis from previous phases (Phase 2 or Phase 4)
      // This allows the AI coach to provide personalized feedback
      const currentContextReport: ContextReport = contextReport || {
        phase: 'practice',
        session_id: 'session-' + Date.now(),
        analysis: {
          // Dummy analysis data - in production, this comes from Phase 2 or Phase 4
          overall_score: 75,
          word_count: 450,
          clarity_score: 82,
        } as any
      };

      // ===== STEP 3: SEND MESSAGE TO BACKEND =====
      // Backend will send this to Gemini 1.5 Flash with system prompt and context
      const response = await sendChatMessage(userInput, messages, currentContextReport);

      // ===== STEP 4: ADD AI RESPONSE TO CHAT =====
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: response.ai_response,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      // Handle errors gracefully
      const errorMessage = err instanceof Error ? err.message : 'Failed to get AI response';
      setError(errorMessage);
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ===== KEYBOARD EVENT HANDLER =====
  // Enter to send, Shift+Enter for new line
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ===== CLEAR CHAT HANDLER =====
  const handleClearChat = () => {
    setMessages([
      {
        id: '1',
        role: 'ai',
        content: "Hello! I'm your AI Coach, powered by advanced AI. I'm here to help you practice and improve your presentation skills. Share your topic, ask for feedback, or let's work on specific areas like pacing, clarity, or handling nervousness. What would you like to work on today?",
        timestamp: new Date().toISOString(),
      },
    ]);
    setUserInput('');
    setError(null);
  };

  // ===== QUICK PROMPT HANDLER =====
  const handleQuickPrompt = (prompt: string) => {
    setUserInput(prompt);
  };

  return (
    <div className="practice-mode">
      <div className="practice-header">
        <h1>AI Coach - Practice Mode</h1>
        <p className="subtitle">Real-time feedback and coaching powered by advanced AI</p>
      </div>

      {/* Main Chat Container */}
      <section className="chat-container">
        <div className="chat-messages" ref={chatContainerRef}>
          {/* Render all messages */}
          {messages.map((message) => (
            <div key={message.id} className={`message-wrapper message-${message.role}`}>
              <div className="message-bubble">
                <div className="message-avatar">
                  {message.role === 'ai' ? 'AI' : 'User'}
                </div>
                <div className="message-content">
                  <p className="message-text">{message.content}</p>
                  <span className="message-timestamp">
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* ===== LOADING INDICATOR ===== */}
          {/* Shows animated typing indicator while AI is generating response */}
          {isLoading && (
            <div className="message-wrapper message-ai">
              <div className="message-bubble">
                <div className="message-avatar">AI</div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                  <p className="typing-text">AI Coach is thinking...</p>
                </div>
              </div>
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Error Message Display */}
        {error && (
          <div className="error-message-box">
            <span className="error-icon">Error:</span>
            <span className="error-text">{error}</span>
            <button
              className="error-close"
              onClick={() => setError(null)}
              aria-label="Close error"
            >
              ✕
            </button>
          </div>
        )}

        {/* Message Input Section */}
        <div className="input-section">
          <textarea
            className="message-input"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
            disabled={isLoading}
            rows={3}
            maxLength={1000}
          />

          <div className="input-footer">
            <span className="char-count">{userInput.length} / 1000</span>
          </div>

          <div className="input-actions">
            <Button
              label={isLoading ? 'Waiting for response...' : 'Send Message'}
              onClick={handleSendMessage}
              disabled={!userInput.trim() || isLoading}
              loading={isLoading}
            />
            <Button
              label="Clear Chat"
              onClick={handleClearChat}
              variant="secondary"
              disabled={isLoading}
            />
          </div>
        </div>
      </section>

      {/* Quick Suggestions Section */}
      <section className="suggestions-section">
        <h3>Quick Prompts to Get Started</h3>
        <p className="suggestions-subtitle">Click any prompt or type your own message:</p>
        <div className="suggestions-grid">
          <button
            className="suggestion-button"
            onClick={() => handleQuickPrompt("How can I improve my presentation opening to hook my audience immediately?")}
            disabled={isLoading}
            title="Get tips on creating impactful opening statements"
          >
            Powerful Openings
          </button>
          <button
            className="suggestion-button"
            onClick={() => handleQuickPrompt("I often use filler words like 'um' and 'like'. How can I reduce them?")}
            disabled={isLoading}
            title="Tips for reducing filler words"
          >
            Reduce Filler Words
          </button>
          <button
            className="suggestion-button"
            onClick={() => handleQuickPrompt("What are the most common mistakes beginners make during presentations?")}
            disabled={isLoading}
            title="Learn about common presentation mistakes"
          >
            Common Mistakes
          </button>
          <button
            className="suggestion-button"
            onClick={() => handleQuickPrompt("I get nervous before presentations. What techniques can help me stay calm and confident?")}
            disabled={isLoading}
            title="Techniques to manage presentation anxiety"
          >
            Manage Anxiety
          </button>
          <button
            className="suggestion-button"
            onClick={() => handleQuickPrompt("How should I pace my presentation for maximum impact and audience engagement?")}
            disabled={isLoading}
            title="Learn optimal speaking pace"
          >
            Perfect Your Pace
          </button>
          <button
            className="suggestion-button"
            onClick={() => handleQuickPrompt("Can you give me feedback on my presentation structure and content flow?")}
            disabled={isLoading}
            title="Get structured feedback on presentation"
          >
            Presentation Feedback
          </button>
        </div>
      </section>

      {/* Information Section */}
      <section className="info-section">
        <h3>About Your AI Coach</h3>
        <div className="info-grid">
          <div className="info-card">
            <div className="info-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <h4>Personalized Coaching</h4>
            <p>Your AI Coach adapts to your skill level and provides targeted, actionable feedback for continuous improvement.</p>
          </div>
          <div className="info-card">
            <div className="info-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .3 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path>
                <line x1="9" y1="18" x2="15" y2="18"></line>
                <line x1="10" y1="22" x2="14" y2="22"></line>
              </svg>
            </div>
            <h4>Evidence-Based Tips</h4>
            <p>All coaching recommendations are based on proven presentation techniques and public speaking best practices.</p>
          </div>
          <div className="info-card">
            <div className="info-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
            </div>
            <h4>Real-Time Analysis</h4>
            <p>Get instant feedback on your content, delivery, pace, and engagement with real-time metrics and suggestions.</p>
          </div>
          <div className="info-card">
            <div className="info-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                <path d="M8 10h.01"></path>
                <path d="M12 10h.01"></path>
                <path d="M16 10h.01"></path>
              </svg>
            </div>
            <h4>Multi-Turn Conversations</h4>
            <p>Ask follow-up questions, request clarifications, and dive deeper into any topic at your own pace.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PracticeMode;
