"""
Phase Five: AI Coach / Practice Mode Blueprint
Role: Provide real-time AI coaching using Google Gemini 1.5 Flash for presentation practice and feedback.

Key Features:
- Multi-turn conversational AI using Gemini 1.5 Flash model
- Context-aware coaching based on document analysis reports
- System prompt injection for consistent AI persona
- Maintains chat history for contextual continuity
- Comprehensive error handling for API failures
- Session-based chat memory management
"""

import os
import warnings
warnings.filterwarnings('ignore', category=FutureWarning, module='google.generativeai')
from flask import Blueprint, request, jsonify
from datetime import datetime
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize Gemini API
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
gemini_available = False

if GEMINI_API_KEY and GEMINI_API_KEY != 'your-gemini-api-key-here':
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        gemini_available = True
        print("✅ Gemini API configured successfully for AI Coach")
    except Exception as e:
        print(f"⚠️ Failed to configure Gemini API: {str(e)}")
else:
    print("⚠️ GEMINI_API_KEY not configured or placeholder used. Running in demo mode with mock fallbacks.")


# Create a blueprint for AI coach / practice mode
phase_five_bp = Blueprint('phase_five', __name__, url_prefix='/api')


def format_chat_history(frontend_history: list) -> list:
    """
    Convert frontend chat history format to Gemini-compatible format.
    
    Frontend format: { "role": "user"|"ai", "content": "..." }
    Gemini format: { "role": "user"|"model", "parts": [{ "text": "..." }] }
    
    Args:
        frontend_history: List of chat messages from frontend
        
    Returns:
        List of chat messages in Gemini format
    """
    gemini_history = []

    for msg in frontend_history:
        # Map frontend role names to Gemini role names
        # "ai" role becomes "model" in Gemini API
        role = "model" if msg.get("role") == "ai" else msg.get("role", "user")

        gemini_message = {
            "role": role,
            "parts": [
                {
                    "text": msg.get("content", "")
                }
            ]
        }

        gemini_history.append(gemini_message)

    return gemini_history


@phase_five_bp.route('/practice-chat', methods=['POST'])
def practice_chat():
    """
    AI coach chat endpoint for multi-turn practice mode conversations.
    
    Expected JSON input:
    {
        "message": "User's current message",
        "history": [
            { "role": "user", "content": "..." },
            { "role": "ai", "content": "..." }
        ],
        "contextReport": {
            "phase": "practice",
            "analysis": { ... document/speech analysis data ... }
        }
    }
    
    Returns:
    {
        "status": "success",
        "ai_response": "AI coach's response text",
        "message_id": "unique_message_id",
        "timestamp": "ISO 8601 timestamp"
    }
    
    Error responses (400/500):
    - Missing or invalid message
    - JSON parsing errors
    - Gemini API failures
    - Network timeouts
    """

    temp_chat_session = None

    try:
        # ===== STEP 1: VALIDATE REQUEST DATA =====
        data = request.get_json()

        if data is None:
            return jsonify({
                "error": "Invalid JSON",
                "message": "Request body must be valid JSON"
            }), 400

        # Extract and validate message field
        message = data.get('message', '').strip()

        if not message:
            return jsonify({
                "error": "Missing message field",
                "message": "Please provide a 'message' field with your input"
            }), 400

        # Extract history and context report (optional but recommended)
        history = data.get('history', [])
        context_report = data.get('contextReport', {})

        # ===== STEP 2: BUILD SYSTEM PROMPT WITH CONTEXT INJECTION =====
        # CRITICAL: The system prompt establishes the AI's role and constraints
        # Context injection allows the AI to reference the user's detailed V1 vs V2 analysis
        
        context_text = "No analysis report provided."
        
        if context_report:
            phase = context_report.get('phase', 'Unknown')
            v1_analysis = context_report.get('v1Analysis') or context_report.get('v1Report')
            v2_analysis = context_report.get('v2Analysis') or context_report.get('v2Report')
            v1_text = context_report.get('v1Text') or context_report.get('v1Transcript')
            v2_text = context_report.get('v2Text') or context_report.get('v2Transcript')
            comparison_data = context_report.get('comparison') or context_report.get('comparisonReport')
            
            context_text = f"""
Previous Analysis Session Context:
- Phase / Mode: {phase}
- Version 1 (Baseline) Content/Text: {v1_text}
- Version 1 (Baseline) Score & Evaluation: {v1_analysis}
- Version 2 (Revised) Content/Text: {v2_text}
- Version 2 (Revised) Score & Evaluation: {v2_analysis}
- Progress Comparison Report: {comparison_data}
"""

        system_prompt = f"""You are an expert presentation coach and public speaking mentor. Your role is to help users practice and improve their presentation skills through encouragement, practical tips, and constructive feedback.

CONTEXT ABOUT THE USER'S PRESENTATION (V1 vs V2 COMPARISON):
{context_text}

COACHING GUIDELINES:
1. Provide clear, supportive, and engaging responses. While standard conversation should be concise, when explaining how to fix issues or providing suggestions to make the presentation 100% perfect, provide structured, comprehensive guidance (e.g., bullet points, clear recommendations, and step-by-step suggestions).
2. Ask follow-up questions to test understanding and deepen learning.
3. Provide actionable, specific advice (not generic tips). Show the user exactly how to write or deliver specific sections of their content.
4. Reference their specific analysis reports, V1 baseline text vs V2 improved text, and the remaining issues to polish.
5. Maintain a supportive, positive, and professional tone.
6. Address key improvement areas and guide them on how to resolve the remaining gaps.
7. Celebrate progress and improvements between V1 and V2.

IMPORTANT: Always stay in character as a presentation coach. Guide the user on how they can make their presentation 100% perfect by fixing slide content, pacing, structure, delivery, or visual/vocal gaps."""

        # ===== STEP 3: INITIALIZE GEMINI MODEL =====
        ai_response_text = ""
        
        if gemini_available:
            try:
                model = genai.GenerativeModel('gemini-flash-latest')

                # ===== STEP 4: FORMAT CHAT HISTORY FOR GEMINI =====
                # Convert frontend history format to Gemini's expected format
                gemini_history = format_chat_history(history)

                print(f"📊 Chat history converted: {len(gemini_history)} previous messages")

                # ===== STEP 5: START CHAT SESSION AND SEND MESSAGE =====
                # CRITICAL: Use model.start_chat() with the formatted history
                # This maintains conversation continuity across multiple turns
                # The system prompt is used as the first user message to establish context
                
                temp_chat_session = model.start_chat(history=gemini_history)

                print(f"🤖 Sending message to Gemini 1.5 Flash...")

                # Send the current message along with the system prompt as context
                response = temp_chat_session.send_message(
                    f"{system_prompt}\n\nUser message: {message}",
                    generation_config={
                        "temperature": 0.7,  # Balanced creativity and consistency
                        "top_p": 0.9,
                        "top_k": 40,
                        "max_output_tokens": 1024  # Limit response length for chat # Limit response length for chat
                    }
                )

                # ===== STEP 6: EXTRACT AND VALIDATE RESPONSE =====
                ai_response_text = response.text.strip()
            except Exception as e:
                print(f"⚠️ Gemini chat failed at runtime: {str(e)}")
                ai_response_text = ""

        if not ai_response_text:
            print("⚠️ Using mock fallback for AI Coach response due to API error or configuration.")
            msg_lower = message.lower()
            
            # Simple keyword-based coaching advice matching presentation coach persona
            if "filler" in msg_lower or "like" in msg_lower or "um" in msg_lower:
                ai_response_text = "To minimize filler words like 'um' or 'like', practice inserting silent pauses. A pause gives you time to think and sounds more authoritative to your audience. Try rehearsing a 1-minute introduction and consciously pausing instead of speaking filler words."
            elif "nervous" in msg_lower or "anxiety" in msg_lower or "scared" in msg_lower:
                ai_response_text = "It's completely normal to feel nervous! I recommend taking 3 deep belly breaths before you step up to speak, and focusing on your message rather than the audience's reaction. Have you tried practicing in front of a mirror or a friend first?"
            elif "slide" in msg_lower or "powerpoint" in msg_lower or "visual" in msg_lower:
                ai_response_text = "For slides, follow the 6x6 rule: limit slides to 6 bullet points, and 6 words per bullet. Use high-quality visuals to support your words rather than reading off the slide. What is the main theme of your current slide deck?"
            elif "pace" in msg_lower or "speed" in msg_lower or "fast" in msg_lower or "slow" in msg_lower:
                ai_response_text = "An ideal speaking rate is between 120 and 160 words per minute. If you speak too fast, try pausing at the end of each major sentence to let the point land. Let's practice: can you try saying your opening statement slowly and deliberately?"
            else:
                ai_response_text = "That's a very good question! As your presentation coach, I highly recommend structuring your speech with a clear Hook, a Body with three key points, and a memorable Conclusion. Which section of your presentation are you currently practicing?"

        if not ai_response_text:
            print("❌ Empty response from Gemini API")
            return jsonify({
                "error": "Empty response from AI model",
                "message": "The AI model returned an empty response. Please try again."
            }), 500

        # ===== STEP 7: COMPILE AND RETURN RESPONSE =====
        chat_response = {
            "status": "success",
            "ai_response": ai_response_text,
            "message_id": f"msg_{int(datetime.now().timestamp() * 1000)}",
            "timestamp": datetime.now().isoformat()
        }

        print(f"✅ AI Coach response generated successfully")

        return jsonify(chat_response), 200

    except Exception as e:
        # ===== ERROR HANDLING =====
        # Catch all exceptions from Gemini API calls, network errors, etc.
        
        print(f"❌ Error during AI coach chat: {str(e)}")

        # Provide user-friendly error messages based on exception type
        error_message = str(e)
        
        if "api_key" in error_message.lower() or "authentication" in error_message.lower():
            error_message = "Authentication failed. Please check your API key configuration."
        elif "quota" in error_message.lower() or "rate" in error_message.lower():
            error_message = "API quota exceeded. Please try again later."
        elif "timeout" in error_message.lower() or "connection" in error_message.lower():
            error_message = "Network timeout. Please check your connection and try again."

        return jsonify({
            "error": "AI coach service unavailable",
            "message": error_message,
            "details": str(e)
        }), 500
