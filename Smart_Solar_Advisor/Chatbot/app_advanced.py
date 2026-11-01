import streamlit as st
import sys
from pathlib import Path
import json
from datetime import datetime

# Add src to path
sys.path.append(str(Path(__file__).parent / "src"))

from config import Config
from rag.rag_system import SolarRAGSystem

# Page configuration
st.set_page_config(
    page_title="Smart Solar Advisor Pro",
    page_icon="🌞",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
<style>
    .main-header {
        font-size: 2.5rem;
        color: #FF6B35;
        text-align: center;
        margin-bottom: 0.5rem;
    }
    .sub-header {
        font-size: 1rem;
        color: #4A4A4A;
        text-align: center;
        margin-bottom: 2rem;
    }
    .stats-box {
        background-color: #E8F5E9;
        padding: 1rem;
        border-radius: 0.5rem;
        margin: 0.5rem 0;
    }
    .metric-container {
        background-color: #f0f2f6;
        padding: 1rem;
        border-radius: 0.5rem;
        margin: 0.5rem 0;
    }
</style>
""", unsafe_allow_html=True)

# Initialize session state
if 'messages' not in st.session_state:
    st.session_state.messages = []

if 'system_ready' not in st.session_state:
    st.session_state.system_ready = False

if 'rag_system' not in st.session_state:
    with st.spinner("🔄 Initializing Solar Advisor System..."):
        try:
            config = Config()
            st.session_state.rag_system = SolarRAGSystem(config)
            st.session_state.system_ready = True
        except Exception as e:
            st.error(f"Error initializing system: {str(e)}")
            st.session_state.system_ready = False

if 'current_mode' not in st.session_state:
    st.session_state.current_mode = "text"

if 'show_sources' not in st.session_state:
    st.session_state.show_sources = True

# Header
st.markdown('<h1 class="main-header">🌞 Smart Solar Advisor Pro</h1>', unsafe_allow_html=True)
st.markdown('<p class="sub-header">AI-powered solar energy consultant with voice support | හඬ සහාය සහිත AI සූර්ය බලශක්ති උපදේශකයා</p>', unsafe_allow_html=True)

# Sidebar
with st.sidebar:
    st.header("⚙️ System Information")
    
    if st.session_state.system_ready:
        try:
            system_info = st.session_state.rag_system.get_system_info()
            
            st.markdown(f"""
            <div class="stats-box">
            <b>Status:</b> {system_info['status']}<br>
            <b>Knowledge Base:</b> {system_info['vector_db_chunks']} chunks<br>
            <b>Model:</b> {system_info['embedding_model'].split('/')[-1]}<br>
            <b>LLM:</b> {system_info['llm_model']}
            </div>
            """, unsafe_allow_html=True)
        except Exception as e:
            st.error(f"Error: {str(e)}")
    else:
        st.warning("⚠️ System not ready")
    
    st.markdown("---")
    
    # Mode selection
    st.header("🎯 Input Mode")
    mode = st.radio(
        "Choose input method:",
        ["💬 Text Chat", "🎤 Voice Chat", "📊 Analytics"],
        key="mode_selector"
    )
    
    if "Text" in mode:
        st.session_state.current_mode = "text"
    elif "Voice" in mode:
        st.session_state.current_mode = "voice"
    else:
        st.session_state.current_mode = "analytics"
    
    st.markdown("---")
    
    # Quick questions
    if st.session_state.current_mode == "text":
        st.header("🎯 Quick Questions")
        
        sample_questions = {
            "English": [
                "What are solar panel costs?",
                "Government solar incentives?",
                "How to maintain panels?",
                "Solar ROI calculation?"
            ],
            "Sinhala": [
                "සූර්ය පැනල මිල කීයද?",
                "රජයේ දිරි දීමනා මොනවාද?",
                "පැනල නඩත්තු කරන්නේ කෙසේද?"
            ]
        }
        
        lang = st.selectbox("Language:", ["English", "Sinhala"])
        
        for idx, q in enumerate(sample_questions[lang][:3]):
            if st.button(q, key=f"sample_{lang}_{idx}", use_container_width=True):
                st.session_state.sample_question = q
    
    st.markdown("---")
    
    # Settings
    st.header("⚙️ Display Settings")
    st.session_state.show_sources = st.checkbox("Show Sources", value=True)
    
    if st.button("🗑️ Clear Chat", use_container_width=True):
        st.session_state.messages = []
        st.rerun()
    
    st.markdown("---")
    
    # Stats
    st.header("📊 Statistics")
    col1, col2 = st.columns(2)
    with col1:
        st.metric("Messages", len(st.session_state.messages))
    with col2:
        user_msgs = len([m for m in st.session_state.messages if m['role'] == 'user'])
        st.metric("Questions", user_msgs)

# Main content area
if st.session_state.current_mode == "text":
    # TEXT CHAT MODE
    st.header("💬 Text Chat")
    
    # Display chat messages
    chat_container = st.container()
    with chat_container:
        for message in st.session_state.messages:
            with st.chat_message(message['role']):
                st.markdown(message['content'])
                
                if message['role'] == 'assistant' and st.session_state.show_sources:
                    if 'sources' in message and message['sources']:
                        with st.expander("📚 View Sources"):
                            for i, source in enumerate(message['sources'], 1):
                                source_text = f"{i}. **{source['filename']}** ({source['source_type']})"
                                if 'page' in source:
                                    source_text += f" - Page {source['page']}"
                                st.markdown(source_text)
    
    # Handle sample question
    if 'sample_question' in st.session_state:
        user_input = st.session_state.sample_question
        del st.session_state.sample_question
    else:
        user_input = None
    
    # Chat input (OUTSIDE of any container/tab)
    if prompt := st.chat_input("Ask me anything about solar energy... | සූර්ය බලශක්තිය ගැන අසන්න..."):
        user_input = prompt
    
    # Process input
    if user_input:
        if st.session_state.system_ready:
            # Add user message
            st.session_state.messages.append({
                "role": "user",
                "content": user_input,
                "timestamp": datetime.now().isoformat()
            })
            
            # Generate response
            with st.spinner("🤔 Thinking..."):
                try:
                    response = st.session_state.rag_system.generate_response(user_input)
                    
                    st.session_state.messages.append({
                        "role": "assistant",
                        "content": response['answer'],
                        "language": response['language'],
                        "sources": response['sources'],
                        "timestamp": datetime.now().isoformat()
                    })
                except Exception as e:
                    st.error(f"Error: {str(e)}")
            
            st.rerun()
        else:
            st.error("⚠️ System not ready")

elif st.session_state.current_mode == "voice":
    # VOICE CHAT MODE
    st.header("🎤 Voice Chat")
    
    col1, col2 = st.columns([1, 1])
    
    with col1:
        st.info("""
        **Voice Chat Feature**
        
        Voice input/output requires additional packages:
        - SpeechRecognition
        - gTTS
        - PyAudio (may need manual installation)
        
        For now, please use Text Chat mode.
        
        To enable voice features:
        ```bash
        pip install SpeechRecognition gTTS
        ```
        """)
        
        if st.button("🎤 Record Voice (Coming Soon)", disabled=True):
            st.warning("Voice feature coming soon!")
    
    with col2:
        st.markdown("""
        **Supported Languages:**
        - 🇬🇧 English
        - 🇱🇰 Sinhala (සිංහල)
        
        **How it will work:**
        1. Click microphone button
        2. Speak your question
        3. Get text + audio response
        """)

elif st.session_state.current_mode == "analytics":
    # ANALYTICS MODE
    st.header("📊 Chat Analytics")
    
    if st.session_state.messages:
        # Overview metrics
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("Total Messages", len(st.session_state.messages))
        
        with col2:
            user_msgs = len([m for m in st.session_state.messages if m['role'] == 'user'])
            st.metric("Questions", user_msgs)
        
        with col3:
            assistant_msgs = len([m for m in st.session_state.messages if m['role'] == 'assistant'])
            st.metric("Responses", assistant_msgs)
        
        with col4:
            languages = [m.get('language', 'Unknown') for m in st.session_state.messages if m['role'] == 'assistant']
            sinhala_count = languages.count('Sinhala')
            st.metric("Sinhala Queries", sinhala_count)
        
        st.markdown("---")
        
        # Language distribution
        st.subheader("🌐 Language Distribution")
        if languages:
            lang_counts = {lang: languages.count(lang) for lang in set(languages)}
            
            col1, col2 = st.columns(2)
            with col1:
                for lang, count in lang_counts.items():
                    st.metric(lang, count)
            
            with col2:
                st.bar_chart(lang_counts)
        
        st.markdown("---")
        
        # Recent conversations
        st.subheader("💬 Recent Conversations")
        for i, msg in enumerate(reversed(st.session_state.messages[-10:])):
            with st.expander(f"{msg['role'].title()}: {msg['content'][:60]}..."):
                st.write(f"**Content:** {msg['content']}")
                if 'timestamp' in msg:
                    st.caption(f"⏰ {msg['timestamp']}")
                if 'language' in msg:
                    st.caption(f"🌐 Language: {msg['language']}")
        
        st.markdown("---")
        
        # Export option
        st.subheader("💾 Export Data")
        if st.button("📥 Download Chat History (JSON)"):
            json_data = json.dumps(st.session_state.messages, indent=2, ensure_ascii=False)
            st.download_button(
                label="Download JSON",
                data=json_data,
                file_name=f"chat_history_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
                mime="application/json"
            )
    else:
        st.info("📭 No conversations yet. Start chatting to see analytics!")
        
        if st.button("Start Chatting Now", type="primary"):
            st.session_state.current_mode = "text"
            st.rerun()

# Footer
st.markdown("---")
st.markdown("""
<div style="text-align: center; color: #888; font-size: 0.9rem;">
    <p>🌱 Powered by AI | Built for Sri Lankan Solar Industry</p>
    <p>💡 Multilingual Support: English & Sinhala | බහුභාෂා සහාය</p>
</div>
""", unsafe_allow_html=True)