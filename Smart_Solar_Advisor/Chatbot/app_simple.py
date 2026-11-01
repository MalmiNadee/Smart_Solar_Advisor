import streamlit as st
import sys
import re
import subprocess
import threading
import time
from pathlib import Path
from datetime import datetime

# Add src to path
sys.path.append(str(Path(__file__).parent / "src"))

from config import Config
from embeddings.embeddings_handler import EmbeddingsHandler
from utils.translator import LanguageTranslator
from rag.answer_generator import AnswerGenerator
from utils.conversation_manager import ConversationManager
from voice.voice_handler import VoiceHandler  # NEW
from utils.api_client import (
    detect_api_intent, extract_location_name, extract_time_mode,
    extract_requested_metric, extract_date_from_query, extract_month_from_query,
    get_sites_summary, get_coordinates, get_nearest_location_data,
    get_aggregate_data, format_sites_response, format_live_data_response,
    format_aggregate_response, format_aggregate_metric_response,
)

# ---------------------------------------------------------------------------
# Pipeline scheduler (module-level — persists across Streamlit reruns)
# ---------------------------------------------------------------------------
_PIPELINE_INTERVAL = 6 * 60 * 60  # 6 hours in seconds
_PIPELINE_SCRIPT = str(Path(__file__).parent / "pipeline_runner.py")

_pipeline_state: dict = {
    "thread": None,
    "last_run": None,
    "next_run": None,
    "status": "not started",
}


def _pipeline_worker() -> None:
    """Background daemon thread: runs pipeline_runner.py on startup, then every 6 hours."""
    first_run = True
    while True:
        if not first_run:
            time.sleep(_PIPELINE_INTERVAL)
        first_run = False

        _pipeline_state["status"] = "running"
        _pipeline_state["last_run"] = datetime.now()
        try:
            result = subprocess.run(
                [sys.executable, _PIPELINE_SCRIPT],
                capture_output=True,
                text=True,
                cwd=str(Path(__file__).parent),
            )
            if result.returncode == 0:
                _pipeline_state["status"] = "success"
            else:
                _pipeline_state["status"] = f"failed (exit {result.returncode})"
        except Exception as exc:
            _pipeline_state["status"] = f"error: {exc}"

        _pipeline_state["next_run"] = datetime.fromtimestamp(
            time.time() + _PIPELINE_INTERVAL
        )


def start_pipeline_scheduler() -> None:
    """Start the background pipeline scheduler if it is not already running."""
    thread = _pipeline_state["thread"]
    if thread is None or not thread.is_alive():
        t = threading.Thread(target=_pipeline_worker, daemon=True)
        t.start()
        _pipeline_state["thread"] = t
        _pipeline_state["next_run"] = datetime.now()  # first run is immediate


# ---------------------------------------------------------------------------
# Page configuration
st.set_page_config(
    page_title="Smart Solar Advisor",
    page_icon="🌞",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS (add voice button styles)
st.markdown("""
<style>
    .main-header {
        font-size: 3rem;
        color: #FF6B35;
        text-align: center;
        margin-bottom: 1rem;
    }
    .sub-header {
        font-size: 1.2rem;
        color: #4A4A4A;
        text-align: center;
        margin-bottom: 2rem;
    }
    .chat-message {
        padding: 1.5rem;
        border-radius: 0.5rem;
        margin-bottom: 1rem;
        color: black;
    }
    .user-message {
        background-color: #E3F2FD;
        border-left: 5px solid #2196F3;
    }
    .assistant-message {
        background-color: #FFF3E0;
        border-left: 5px solid #FF9800;
    }
    .stats-box {
        background-color: #E8F5E9;
        padding: 1rem;
        border-radius: 0.5rem;
        margin: 0.5rem 0;
        color: black;
    }
    .language-badge {
        display: inline-block;
        padding: 0.3rem 0.6rem;
        border-radius: 0.3rem;
        font-size: 0.8rem;
        margin-bottom: 0.5rem;
    }
    .sinhala-badge {
        background-color: #4CAF50;
        color: white;
    }
    .english-badge {
        background-color: #2196F3;
        color: white;
    }
    .voice-indicator {
        background-color: #FF5722;
        color: white;
        padding: 1rem;
        border-radius: 0.5rem;
        text-align: center;
        font-weight: bold;
        animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
</style>
""", unsafe_allow_html=True)

def is_solar_related(text: str, query: str) -> bool:
    """Check if the text is actually related to solar energy - improved version"""
    solar_keywords = [
        'solar', 'panel', 'photovoltaic', 'pv', 'energy', 'electricity',
        'renewable', 'inverter', 'battery', 'grid', 'metering', 'ceb',
        'sun', 'irradiance', 'monocrystalline', 'polycrystalline', 
        'efficiency', 'watt', 'kw', 'installation', 'system', 'power',
        'benefit', 'advantage', 'cost', 'price', 'saving', 'rooftop',
        'electric', 'utility', 'subsidy', 'incentive', 'feed-in'
    ]
    
    text_lower = text.lower()
    query_lower = query.lower()
    
    # Check if the retrieved content has solar keywords
    has_solar_content = any(keyword in text_lower for keyword in solar_keywords)
    
    # For queries, be more lenient - check if query OR translation contains solar keywords
    query_is_solar = any(keyword in query_lower for keyword in solar_keywords)
    
    # Also check if it's a general energy/benefits question
    general_energy_terms = ['benefit', 'advantage', 'cost', 'price', 'save', 'install']
    is_general_energy_query = any(term in query_lower for term in general_energy_terms)
    
    # If it's a general energy query and content has solar keywords, accept it
    if is_general_energy_query and has_solar_content:
        return True
    
    return has_solar_content and (query_is_solar or is_general_energy_query)

def extract_relevant_sentences(text: str, query: str, max_sentences: int = 5) -> str:
    """Extract only the most relevant sentences from the text"""
    import re
    
    # Split into sentences
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if len(s.strip()) > 20]
    
    if not sentences:
        return text
    
    # Score sentences based on query word overlap
    query_words = set(query.lower().split())
    scored_sentences = []
    
    for sentence in sentences:
        sentence_words = set(sentence.lower().split())
        overlap = len(query_words & sentence_words)
        scored_sentences.append((overlap, sentence))
    
    # Sort by relevance and take top sentences
    scored_sentences.sort(reverse=True, key=lambda x: x[0])
    top_sentences = [s[1] for s in scored_sentences[:max_sentences]]
    
    # Return in original order
    result = []
    for sentence in sentences:
        if sentence in top_sentences:
            result.append(sentence)
    
    return '. '.join(result) + '.'

def clean_retrieved_text(text: str) -> str:
    """
    Clean retrieved text by removing citations, URLs, and unnecessary formatting.
    This is applied BEFORE generating the answer.
    """
    import re
    
    # Remove citations like [1], [2], [1,2,3]
    text = re.sub(r'\[[\d,\s]+\]', '', text)
    text = re.sub(r'\[\d+\]', '', text)
    
    # Remove URLs and "Available :" patterns
    text = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', text)
    text = re.sub(r'\[online\]\s*Available\s*:\s*https?://[^\s]+', '', text, flags=re.IGNORECASE)
    text = re.sub(r'Available\s*:\s*https?://[^\s]+', '', text, flags=re.IGNORECASE)
    
    # Remove file references like "file.pdf [23]"
    text = re.sub(r'[\w\-]+\.pdf\s*\[\d+\]', '', text)
    
    # Remove "online" and "Available" patterns
    text = re.sub(r'\[online\]', '', text, flags=re.IGNORECASE)
    
    # Remove page references
    text = re.sub(r'Page\s+\d+\s+of\s+\d+', '', text)
    
    # Clean up multiple spaces and newlines
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text

def build_context_aware_query(query: str, context: dict) -> str:
    """Enrich a follow-up query with context from the previous API turn.

    When the user omits the location (e.g. "What about the temperature?")
    the last known location is appended so existing extractors work normally.
    """
    last_location = context.get('location_name')
    last_intent   = context.get('last_intent')

    # Only apply when the previous turn was an API (sensor) response
    if not last_location or last_intent not in ('live_data', 'aggregate'):
        return query

    # Leave queries that already name a location unchanged
    if extract_location_name(query) is not None:
        return query

    return f"{query} in {last_location}"


def build_rag_history(messages: list, n_turns: int = 3) -> str:
    """Return the last *n_turns* Q&A pairs as a plain-text context string."""
    pairs = []
    i = len(messages) - 1
    while i >= 1 and len(pairs) < n_turns:
        if messages[i]['role'] == 'assistant' and messages[i - 1]['role'] == 'user':
            q = messages[i - 1]['content']
            # Strip markdown bold markers to keep the text clean
            a = re.sub(r'\*+', '', messages[i]['content']).strip()[:300]
            pairs.append((q, a))
            i -= 2
        else:
            i -= 1
    pairs.reverse()
    if not pairs:
        return ''
    return '\n'.join(f"User: {q}\nAssistant: {a}" for q, a in pairs)


def handle_api_query(query: str):
    """Try to answer a query using live monitoring APIs.

    Returns a formatted string answer if the query matches a known API intent,
    or ``None`` if the query should fall through to the normal RAG pipeline.
    """
    intent = detect_api_intent(query)
    if intent is None:
        return None

    # --- Sites summary (no location needed) ---
    if intent == "sites":
        sites = get_sites_summary()
        return format_sites_response(sites)

    # --- Live data or aggregate — require a location name ---
    location_name = extract_location_name(query)
    if not location_name:
        return (
            "Please provide a location name so I can fetch the data.\n"
            "For example: *'What is the dust level in Gampaha today?'*"
        )

    coords = get_coordinates(location_name)
    if not coords:
        return (
            f"I couldn't find the location **'{location_name}'**. "
            "Please check the spelling or try a nearby city name."
        )

    if intent == "live_data":
        metric = extract_requested_metric(query)
        # Route to aggregate API when a specific, aggregate-supported metric is
        # requested (e.g. "dust level", "humidity").  Metrics only present in
        # live readings (panel area, predicted output) still use /nearest-location.
        if metric and metric[1] is not None:   # metric[1] = agg_field
            target_date = extract_date_from_query(query)
            agg_data = get_aggregate_data(coords["lat"], coords["lon"], mode="daily")
            return format_aggregate_metric_response(agg_data, coords["name"], metric, target_date)
        # No specific metric (or live-only metric) — fall back to latest reading
        records = get_nearest_location_data(coords["lat"], coords["lon"])
        return format_live_data_response(records, coords["name"], metric=metric)

    # aggregate
    mode = extract_time_mode(query)
    data = get_aggregate_data(coords["lat"], coords["lon"], mode)
    metric = extract_requested_metric(query)
    if metric and metric[1] is not None:
        # Specific metric requested — filter to that metric and period
        if mode == "monthly":
            period = extract_month_from_query(query)
        else:
            period = extract_date_from_query(query)
        return format_aggregate_metric_response(data, coords["name"], metric, period)
    return format_aggregate_response(data, coords["name"], mode)


def generate_answer(query: str, embeddings_handler, translator, answer_generator, conversation_manager):
    """Generate answer with conversation support"""
    # Detect query language
    query_language = translator.detect_language(query)
    original_query = query
    translated_query = None
    
    is_sinhala = query_language == 'sinhala'
    
    # Detect conversation intent
    intent = conversation_manager.detect_intent(query)
    
    # Handle conversational intents
    if intent == 'greeting':
        return {
            "answer": conversation_manager.generate_greeting_response(is_sinhala),
            "sources": [],
            "chunks_used": 0,
            "language": query_language,
            "translated_query": None,
            "intent": "greeting"
        }
    
    elif intent == 'farewell':
        return {
            "answer": conversation_manager.generate_farewell_response(is_sinhala),
            "sources": [],
            "chunks_used": 0,
            "language": query_language,
            "translated_query": None,
            "intent": "farewell"
        }
    
    elif intent == 'thanks':
        return {
            "answer": conversation_manager.generate_thanks_response(is_sinhala),
            "sources": [],
            "chunks_used": 0,
            "language": query_language,
            "translated_query": None,
            "intent": "thanks"
        }
    
    elif intent == 'help':
        return {
            "answer": conversation_manager.generate_help_response(is_sinhala),
            "sources": [],
            "chunks_used": 0,
            "language": query_language,
            "translated_query": None,
            "intent": "help"
        }
    
    elif intent == 'chitchat':
        return {
            "answer": conversation_manager.generate_chitchat_response(query, is_sinhala),
            "sources": [],
            "chunks_used": 0,
            "language": query_language,
            "translated_query": None,
            "intent": "chitchat"
        }
    
    elif intent == 'affirmation':
        # Get last bot message for context
        last_bot_msg = None
        for msg in reversed(st.session_state.messages):
            if msg['role'] == 'assistant':
                last_bot_msg = msg.get('content', '')
                break
        
        return {
            "answer": conversation_manager.generate_affirmation_response(last_bot_msg, is_sinhala),
            "sources": [],
            "chunks_used": 0,
            "language": query_language,
            "translated_query": None,
            "intent": "affirmation"
        }
    
    # For questions, proceed with RAG pipeline
    # If Sinhala, translate to English for search
    if query_language == 'sinhala':
        translated_query = translator.translate_to_english(query)
        query = translated_query

        if st.session_state.show_debug:
            st.info(f"🔄 Translation: {original_query} → {translated_query}")

    # Enrich follow-up queries with context from the previous turn
    # e.g. "What about the temperature?" → "What about the temperature? in Gampaha"
    resolved_query = build_context_aware_query(
        query, st.session_state.conversation_context
    )

    # Check for live API data queries BEFORE the RAG relevance filter.
    # This ensures monitoring/sensor questions are answered even if they don't
    # contain traditional solar keywords.
    try:
        api_answer = handle_api_query(resolved_query)
    except Exception as api_err:
        api_answer = None
        if st.session_state.show_debug:
            st.warning(f"⚠️ API query failed: {api_err}")

    if api_answer is not None:
        # Save context so the next query can carry it forward
        _loc = extract_location_name(resolved_query)
        if _loc:
            st.session_state.conversation_context['location_name'] = _loc
        st.session_state.conversation_context['last_intent'] = detect_api_intent(resolved_query)
        st.session_state.conversation_context['mode']        = extract_time_mode(resolved_query)

        if query_language == "sinhala":
            api_answer = translator.translate_to_sinhala(api_answer)
        return {
            "answer": api_answer,
            "sources": [{"filename": "Live Monitoring API", "source_type": "live_api"}],
            "chunks_used": 0,
            "language": query_language,
            "translated_query": translated_query,
            "intent": "api_data",
        }

    # Build conversation history early — used for the follow-up check below
    # and later for enriched answer generation.
    conv_history = build_rag_history(st.session_state.messages)

    # Detect RAG follow-ups ("Explain more", "Tell me more about that", etc.)
    # These contain no solar keywords of their own, so they would fail the
    # relevance gate below.  We skip that gate when the previous turn was also
    # a RAG answer and the current query looks like a follow-up.
    is_rag_followup = (
        bool(conv_history)
        and answer_generator._is_followup(query)
        and st.session_state.conversation_context.get('last_intent') == 'question'
    )

    # Check relevance before searching — bypassed for detected follow-ups
    if not is_rag_followup and not answer_generator.is_query_relevant(query):
        no_answer = "I'm sorry, but I can only answer questions related to solar energy systems, solar panels, installation, costs, and benefits in Sri Lanka. Please ask me about solar energy topics."

        if query_language == 'sinhala':
            no_answer = translator.translate_to_sinhala(no_answer)

        return {
            "answer": no_answer,
            "sources": [],
            "chunks_used": 0,
            "language": query_language,
            "translated_query": translated_query,
            "intent": "out_of_scope"
        }

    # For follow-up queries, search using the PREVIOUS user question so that
    # "Explain more" retrieves the same documents as the original question.
    if is_rag_followup:
        search_query = next(
            (m['content'] for m in reversed(st.session_state.messages[:-1])
             if m['role'] == 'user'),
            query,
        )
    else:
        search_query = query

    # Search using English query
    results = embeddings_handler.search(search_query, n_results=5)

    documents = results.get('documents', [[]])[0]
    metadatas = results.get('metadatas', [[]])[0]
    distances = results.get('distances', [[]])[0]

    if st.session_state.show_debug and distances:
        st.info(f"📊 Top result distance: {distances[0]:.4f}")

    if not documents:
        no_answer = "I don't have any information to answer that question."
        if query_language == 'sinhala':
            no_answer = translator.translate_to_sinhala(no_answer)
        return {
            "answer": no_answer,
            "sources": [],
            "chunks_used": 0,
            "language": query_language,
            "translated_query": translated_query,
            "intent": "no_data"
        }

    # Generate answer, passing conversation history for follow-up awareness
    final_answer = answer_generator.generate_answer(query, documents,
                                                    conversation_history=conv_history)

    # Update context so future queries know the last intent was a RAG question
    st.session_state.conversation_context['last_intent'] = 'question'
    
    # Check if answer indicates irrelevant content
    if "I'm sorry" in final_answer or "I don't have enough information" in final_answer:
        if query_language == 'sinhala':
            final_answer = translator.translate_to_sinhala(final_answer)
        
        return {
            "answer": final_answer,
            "sources": [],
            "chunks_used": 0,
            "language": query_language,
            "translated_query": translated_query,
            "intent": "irrelevant"
        }
    
    # Prepare sources
    sources = []
    for meta in metadatas[:3]:
        source_info = {
            "filename": meta.get('filename', 'Unknown'),
            "source_type": meta.get('source_type', 'Unknown')
        }
        if 'page_number' in meta:
            source_info['page'] = meta['page_number']
        if source_info not in sources:
            sources.append(source_info)
    
    # Translate answer if needed
    if query_language == 'sinhala':
        if st.session_state.show_debug:
            st.info("🔄 Translating answer to Sinhala...")
        final_answer = translator.translate_to_sinhala(final_answer)
    
    return {
        "answer": final_answer,
        "sources": sources,
        "chunks_used": len(documents),
        "language": query_language,
        "translated_query": translated_query,
        "intent": "question"
    }

# Initialize session state
if 'messages' not in st.session_state:
    st.session_state.messages = []

if 'conversation_context' not in st.session_state:
    st.session_state.conversation_context = {
        'location_name': None,   # last resolved place name
        'last_intent': None,     # 'live_data' | 'aggregate' | 'question'
        'mode': None,            # 'daily' | 'monthly'
    }

if 'system_ready' not in st.session_state:
    st.session_state.system_ready = False

if 'voice_enabled' not in st.session_state:
    st.session_state.voice_enabled = False

if 'listening' not in st.session_state:
    st.session_state.listening = False

if 'embeddings_handler' not in st.session_state:
    with st.spinner("🔄 Initializing Solar Advisor System..."):
        try:
            config = Config()
            st.session_state.embeddings_handler = EmbeddingsHandler(
                model_name=config.EMBEDDING_MODEL,
                db_path=str(config.VECTORDB_DIR)
            )
            st.session_state.translator = LanguageTranslator()
            st.session_state.answer_generator = AnswerGenerator()
            st.session_state.conversation_manager = ConversationManager()
            st.session_state.voice_handler = VoiceHandler()  # NEW
            st.session_state.system_ready = True
        except Exception as e:
            st.error(f"Error initializing system: {str(e)}")
            st.session_state.system_ready = False

# Start the background pipeline scheduler (runs immediately, then every 6 hours)
start_pipeline_scheduler()

# Header
st.markdown('<h1 class="main-header">🌞 Smart Solar Advisor</h1>', unsafe_allow_html=True)
st.markdown('<p class="sub-header">Your Solar Energy Consultant for Sri Lanka | සූර්ය බලශක්ති උපදේශකයා</p>', unsafe_allow_html=True)

# Sidebar
with st.sidebar:
    st.header("ℹ️ System Information")
    
    if st.session_state.system_ready:
        try:
            info = st.session_state.embeddings_handler.get_collection_info()
            
            st.markdown(f"""
            <div class="stats-box">
            <b>Status:</b> ✅ Ready<br>
            <b>Knowledge Base:</b> {info['total_chunks']} chunks<br>
            <b>Embedding Model:</b> {info['model']}<br>
            <b>Mode:</b> RAG + Translation + Voice<br>
            <b>Languages:</b> English, සිංහල
            </div>
            """, unsafe_allow_html=True)
        except Exception as e:
            st.error(f"Error getting system info: {str(e)}")
    else:
        st.warning("System not ready")
    
    # st.markdown("---")

    # # Pipeline Scheduler Status
    # st.header("🔄 Pipeline Status")
    # _status = _pipeline_state["status"]
    # _last_run = _pipeline_state["last_run"]
    # _next_run = _pipeline_state["next_run"]

    # if "success" in _status:
    #     _icon = "🟢"
    # elif "running" in _status:
    #     _icon = "🟡"
    # elif "not started" in _status:
    #     _icon = "⚪"
    # else:
    #     _icon = "🔴"

    # st.markdown(f"""
    # <div class="stats-box">
    # <b>Status:</b> {_icon} {_status}<br>
    # <b>Last Run:</b> {_last_run.strftime('%H:%M %d/%m/%Y') if _last_run else 'Never'}<br>
    # <b>Next Run:</b> {_next_run.strftime('%H:%M %d/%m/%Y') if _next_run else 'N/A'}<br>
    # <b>Interval:</b> Every 6 hours
    # </div>
    # """, unsafe_allow_html=True)

    st.markdown("---")

    # Voice Settings - NEW
    st.header("🎤 Voice Settings")
    st.session_state.voice_enabled = st.checkbox(
        "Enable Voice Input", 
        value=st.session_state.voice_enabled,
        help="Click to enable microphone for voice questions"
    )
    
    if st.session_state.voice_enabled:
        st.info("🎤 Voice input ready! Click the microphone button below to speak.")
    
    voice_output = st.checkbox(
        "Enable Voice Output", 
        value=False,
        help="Bot will speak the answers"
    )
    
    if 'voice_output' not in st.session_state:
        st.session_state.voice_output = False
    st.session_state.voice_output = voice_output
    
    st.markdown("---")
    
    st.header("🎯 Quick Questions")
    
    # Tabbed interface for language selection
    tab1, tab2 = st.tabs(["English", "සිංහල"])
    
    with tab1:
        english_questions = [
            "What are the benefits of solar energy?",
            "How much does a solar panel system cost?",
            "What is net metering?",
            "Tell me about monocrystalline vs polycrystalline panels",
            "What solar services are available?",
        ]
        
        for idx, question in enumerate(english_questions):
            if st.button(question, key=f"sample_en_{idx}"):
                st.session_state.sample_question = question
    
    with tab2:
        sinhala_questions = [
            "සූර්ය බලශක්තියේ ප්‍රතිලාභ මොනවාද?",
            "සූර්ය පැනල පද්ධතියක මිල කීයද?",
            "ශුද්ධ මීටරය යනු කුමක්ද?",
            "මොනොක්‍රිස්ටලයින් සහ පොලික්‍රිස්ටලයින් පැනල් ගැන කියන්න",
            "ලබා ගත හැකි සූර්ය සේවා මොනවාද?",
        ]
        
        for idx, question in enumerate(sinhala_questions):
            if st.button(question, key=f"sample_si_{idx}"):
                st.session_state.sample_question = question
    
    st.markdown("---")
    
    # Settings
    st.header("⚙️ Settings")
    
    if 'show_sources' not in st.session_state:
        st.session_state.show_sources = True
    
    if 'show_translation' not in st.session_state:
        st.session_state.show_translation = False
    
    if 'show_debug' not in st.session_state:
        st.session_state.show_debug = False
    
    st.session_state.show_sources = st.checkbox("Show Sources", value=st.session_state.show_sources)
    st.session_state.show_translation = st.checkbox("Show Translation Info", value=st.session_state.show_translation)
    st.session_state.show_debug = st.checkbox("Show Debug Info", value=st.session_state.show_debug)
    
    if st.button("🗑️ Clear Chat History"):
        st.session_state.messages = []
        st.session_state.conversation_context = {
            'location_name': None,
            'last_intent': None,
            'mode': None,
        }
        st.rerun()
    
    st.markdown("---")
    
    # Statistics
    st.header("📊 Session Statistics")
    st.metric("Total Messages", len(st.session_state.messages))
    
    if st.session_state.messages:
        user_msgs = len([m for m in st.session_state.messages if m['role'] == 'user'])
        st.metric("Questions Asked", user_msgs)
        
        # Language breakdown
        sinhala_msgs = len([m for m in st.session_state.messages if m.get('language') == 'sinhala'])
        english_msgs = len([m for m in st.session_state.messages if m.get('language') == 'english'])
        
        col1, col2 = st.columns(2)
        with col1:
            st.metric("සිංහල", sinhala_msgs)
        with col2:
            st.metric("English", english_msgs)

# Main chat interface
st.markdown("### 💬 Chat")

# Voice Input Section - NEW
if st.session_state.voice_enabled:
    col1, col2 = st.columns([1, 5])
    
    with col1:
        if st.button("🎤", help="Click and speak your question", use_container_width=True):
            st.session_state.listening = True
    
    with col2:
        if st.session_state.listening:
            st.markdown('<div class="voice-indicator">🎤 Listening... Speak now!</div>', unsafe_allow_html=True)

# Display chat messages
for message in st.session_state.messages:
    if message['role'] == 'user':
        # Show microphone icon if message was voice input
        voice_icon = "🎤 " if message.get('from_voice', False) else ""
        st.markdown(f"""
        <div class="chat-message user-message">
            <b>👤 You:</b> {voice_icon}<br>
            {message['content']}
        </div>
        """, unsafe_allow_html=True)
    else:
        # Language badge
        lang_badge = "english-badge" if message.get('language') == 'english' else "sinhala-badge"
        lang_text = "English" if message.get('language') == 'english' else "සිංහල"
        
        # Show emoji based on intent
        intent_emoji = {
            'greeting': '👋',
            'farewell': '👋',
            'thanks': '😊',
            'help': '💡',
            'chitchat': '💬',
            'question': '🤖',
            'affirmation': '✅',
            'api_data': '📡',
        }
        emoji = intent_emoji.get(message.get('intent', 'question'), '🤖')
        
        st.markdown(f"""
        <div class="chat-message assistant-message">
            <span class="language-badge {lang_badge}">{lang_text}</span><br>
            <b>{emoji} Solar Advisor:</b><br>
            {message['content']}
        </div>
        """, unsafe_allow_html=True)
        
        # Voice output - NEW
        if st.session_state.voice_output and message.get('audio_file'):
            st.audio(message['audio_file'], format='audio/mp3')
        
        # Show translation info if enabled
        if st.session_state.show_translation and message.get('translated_query'):
            with st.expander("🔄 Translation Info"):
                st.info(f"**Original Query (සිංහල):** {message.get('original_query', 'N/A')}")
                st.info(f"**Translated Query (English):** {message['translated_query']}")
        
        # Show sources if enabled
        if st.session_state.show_sources and 'sources' in message and message['sources']:
            with st.expander("📚 Sources"):
                for i, source in enumerate(message['sources'], 1):
                    source_text = f"{i}. **{source['filename']}** ({source['source_type']})"
                    if 'page' in source:
                        source_text += f" - Page {source['page']}"
                    st.markdown(source_text)

# Handle voice input - NEW
if st.session_state.listening:
    with st.spinner("🎤 Listening... Please speak your question..."):
        try:
            detected_lang, recognized_text = st.session_state.voice_handler.listen_from_microphone(
                timeout=5,
                phrase_time_limit=10
            )
            
            if recognized_text:
                st.success(f"✅ Recognized ({detected_lang}): {recognized_text}")
                st.session_state.voice_input = recognized_text
                st.session_state.voice_detected_lang = detected_lang
                st.session_state.from_voice = True
            else:
                st.error("❌ Could not recognize speech. Please try again.")
        
        except Exception as e:
            st.error(f"Error with voice input: {str(e)}")
        
        finally:
            st.session_state.listening = False
            st.rerun()

# Handle sample question
user_input = None
from_voice = False

if 'voice_input' in st.session_state:
    user_input = st.session_state.voice_input
    from_voice = st.session_state.get('from_voice', False)
    del st.session_state.voice_input
    if 'from_voice' in st.session_state:
        del st.session_state.from_voice

if 'sample_question' in st.session_state:
    user_input = st.session_state.sample_question
    del st.session_state.sample_question

# Chat input
if prompt := st.chat_input("Ask me anything about solar energy... | සූර්ය බලශක්තිය ගැන ඕනෑම දෙයක් අසන්න..."):
    user_input = prompt

# Process user input
if user_input:
    if not st.session_state.system_ready:
        st.error("⚠️ System not ready. Please check the initialization errors.")
    else:
        # Add user message
        st.session_state.messages.append({
            "role": "user",
            "content": user_input,
            "timestamp": datetime.now().isoformat(),
            "from_voice": from_voice  # NEW
        })
        
        # Generate response
        with st.spinner("🔍 Thinking... | සිතමින්..."):
            try:
                response = generate_answer(
                    user_input,
                    st.session_state.embeddings_handler,
                    st.session_state.translator,
                    st.session_state.answer_generator,
                    st.session_state.conversation_manager
                )

                # Generate voice output if enabled - NEW
                audio_file = None
                if st.session_state.voice_output:
                    with st.spinner("🔊 Generating voice response..."):
                        audio_file = st.session_state.voice_handler.text_to_speech(
                            response['answer'],
                            response['language']
                        )

                # Add assistant message
                st.session_state.messages.append({
                    "role": "assistant",
                    "content": response['answer'],
                    "sources": response.get('sources', []),
                    "chunks_used": response.get('chunks_used', 0),
                    "language": response['language'],
                    "translated_query": response.get('translated_query'),
                    "original_query": user_input if response['language'] == 'sinhala' else None,
                    "intent": response.get('intent', 'question'),
                    "timestamp": datetime.now().isoformat(),
                    "audio_file": audio_file  # NEW
                })

                # Rerun to show new messages (only on success)
                st.rerun()

            except Exception as e:
                st.error(f"Error generating response: {str(e)}")
                if st.session_state.show_debug:
                    import traceback
                    st.code(traceback.format_exc())

# Footer
st.markdown("---")
st.markdown("""
<div style="text-align: center; color: #888; font-size: 0.9rem;">
    <p>🌱 Powered by RAG + Voice AI | RAG + හඬ AI මගින් බලගන්වයි</p>
    <p>💡 Type or speak in English or Sinhala | ඉංග්‍රීසි හෝ සිංහලෙන් ටයිප් කරන්න හෝ කතා කරන්න</p>
</div>
""", unsafe_allow_html=True)