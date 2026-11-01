from typing import Dict, List, Optional
import logging
from pathlib import Path
import sys

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from embeddings.embeddings_handler import EmbeddingsHandler
from langchain.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langchain.chains import LLMChain

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SolarRAGSystem:
    """
    Retrieval-Augmented Generation system for Solar domain chatbot
    Supports Sinhala-English cross-lingual queries
    """
    
    def __init__(self, config):
        """
        Initialize RAG system
        
        Args:
            config: Configuration object with API keys and settings
        """
        self.config = config
        
        # Initialize embeddings handler
        logger.info("Initializing embeddings handler...")
        self.embeddings_handler = EmbeddingsHandler(
            model_name=config.EMBEDDING_MODEL,
            db_path=str(config.VECTORDB_DIR)
        )
        
        # Initialize LLM
        logger.info("Initializing LLM...")
        if not config.OPENAI_API_KEY:
            logger.warning("OpenAI API key not found. Using mock responses.")
            self.llm = None
        else:
            self.llm = ChatOpenAI(
                api_key=config.OPENAI_API_KEY,
                model=config.LLM_MODEL,
                temperature=config.LLM_TEMPERATURE,
                request_timeout=30
            )
        
        # Create prompt template
        self.prompt_template = self._create_prompt_template()
        
        logger.info("✓ RAG System initialized successfully")
    
    def _create_prompt_template(self) -> PromptTemplate:
        """Create domain-specific prompt template"""
        
        template = """You are a knowledgeable solar energy expert assistant specialized in the Sri Lankan solar industry. You help users understand solar systems, panels, costs, installation processes, and government incentives.

**Context from Knowledge Base:**
{context}

**User Question ({language}):** 
{question}

**Instructions:**
1. Answer based on the provided context from the knowledge base
2. If the user asks in Sinhala (සිංහල), respond in Sinhala
3. If the user asks in English, respond in English
4. Provide specific, accurate information about:
   - Solar panel types and specifications
   - Installation costs and processes in Sri Lanka
   - Government incentives and regulations
   - Energy savings calculations
   - Maintenance requirements
   - Environmental benefits
5. If the context doesn't contain the answer, politely say you don't have that specific information
6. Be helpful, friendly, and provide practical advice
7. Include relevant numbers, costs, or specifications when available

**Answer:**"""
        
        return PromptTemplate(
            input_variables=["context", "question", "language"],
            template=template
        )
    
    def detect_language(self, text: str) -> str:
        """
        Detect if text is in Sinhala or English
        
        Args:
            text: Input text
            
        Returns:
            Language name ("Sinhala" or "English")
        """
        # Sinhala Unicode range: U+0D80 to U+0DFF
        sinhala_chars = sum(1 for char in text if '\u0D80' <= char <= '\u0DFF')
        total_chars = len(text.strip())
        
        # If more than 20% are Sinhala characters, consider it Sinhala
        if total_chars > 0 and (sinhala_chars / total_chars) > 0.2:
            return "Sinhala"
        return "English"
    
    def retrieve_context(self, query: str, n_results: int = None) -> Dict:
        """
        Retrieve relevant context from vector database
        
        Args:
            query: User query
            n_results: Number of results to retrieve (uses config default if None)
            
        Returns:
            Dictionary with documents, metadata, and distances
        """
        if n_results is None:
            n_results = self.config.TOP_K_RESULTS
        
        logger.info(f"Retrieving top {n_results} relevant chunks for query...")
        results = self.embeddings_handler.search(query, n_results=n_results)
        
        return results
    
    def format_context(self, results: Dict) -> str:
        """
        Format retrieved results into context string
        
        Args:
            results: Results from vector database
            
        Returns:
            Formatted context string
        """
        if not results or not results.get('documents') or not results['documents'][0]:
            return "No relevant information found in the knowledge base."
        
        contexts = []
        for i, doc in enumerate(results['documents'][0], 1):
            metadata = results['metadatas'][0][i-1]
            source = metadata.get('filename', 'Unknown source')
            
            context_piece = f"[Source {i}: {source}]\n{doc}\n"
            contexts.append(context_piece)
        
        return "\n".join(contexts)
    
    def generate_response(self, question: str, use_mock: bool = False) -> Dict:
        """
        Generate response using RAG
        
        Args:
            question: User question
            use_mock: If True, return mock response without calling LLM
            
        Returns:
            Dictionary with answer, language, sources, and context
        """
        # Detect language
        language = self.detect_language(question)
        logger.info(f"Detected language: {language}")
        
        # Retrieve relevant context
        retrieval_results = self.retrieve_context(question)
        context = self.format_context(retrieval_results)
        
        # Generate response
        if self.llm is None or use_mock:
            # Mock response for testing
            answer = self._generate_mock_response(question, language, context)
        else:
            # Generate with LLM
            prompt = self.prompt_template.format(
                context=context,
                question=question,
                language=language
            )
            
            try:
                response = self.llm.invoke(prompt)
                answer = response.content
            except Exception as e:
                logger.error(f"Error generating response: {str(e)}")
                answer = "I apologize, but I encountered an error generating a response. Please try again."
        
        # Extract sources
        sources = []
        if retrieval_results.get('metadatas') and retrieval_results['metadatas'][0]:
            for metadata in retrieval_results['metadatas'][0]:
                source_info = {
                    'filename': metadata.get('filename', 'Unknown'),
                    'source_type': metadata.get('source_type', 'Unknown')
                }
                if 'page_number' in metadata:
                    source_info['page'] = metadata['page_number']
                sources.append(source_info)
        
        return {
            "answer": answer,
            "language": language,
            "sources": sources,
            "context_used": len(retrieval_results.get('documents', [[]])[0]),
            "raw_context": context
        }
    
    def _generate_mock_response(self, question: str, language: str, context: str) -> str:
        """Generate mock response when LLM is not available"""
        
        if language == "Sinhala":
            return f"""මෙම ප්‍රශ්නය සඳහා මට සොයාගත හැකි තොරතුරු මෙන්න:

සම්බන්ධිත තොරතුරු දත්ත ගබඩාවෙන් සොයා ගන්නා ලදී. සම්පූර්ණ පිළිතුරක් සඳහා, කරුණාකර OpenAI API යතුර සකසන්න.

ප්‍රශ්නය: {question}

[සටහන: මෙය පරීක්ෂණ ප්‍රතිචාරයකි]"""
        else:
            return f"""Based on the information in our knowledge base:

I found relevant information for your question. For a complete answer, please configure the OpenAI API key.

Question: {question}

[Note: This is a test response. Configure your API key for full functionality.]"""
    
    def get_system_info(self) -> Dict:
        """Get information about the RAG system"""
        collection_info = self.embeddings_handler.get_collection_info()
        
        return {
            "embedding_model": self.config.EMBEDDING_MODEL,
            "llm_model": self.config.LLM_MODEL if self.llm else "Not configured",
            "vector_db_chunks": collection_info.get('total_chunks', 0),
            "top_k_results": self.config.TOP_K_RESULTS,
            "status": "Active" if self.llm else "Limited (No API Key)"
        }