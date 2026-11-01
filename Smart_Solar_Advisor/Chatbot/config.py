"""Configuration settings for the Smart Solar Advisor Chatbot"""
from pathlib import Path
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Main configuration class"""
    
    # Base directories
    BASE_DIR = Path(__file__).parent
    DATA_DIR = BASE_DIR / "data"
    
    # Data source directories
    PDF_DIR = DATA_DIR / "pdfs"
    WEBSITE_DIR = DATA_DIR / "websites"
    DATASET_DIR = DATA_DIR / "datasets"
    
    # Processed data directories
    PROCESSED_DIR = DATA_DIR / "processed"
    CHUNKS_DIR = PROCESSED_DIR / "chunks"
    METADATA_DIR = PROCESSED_DIR / "metadata"
    
    # Vector database
    VECTORDB_DIR = BASE_DIR / "vectordb"
    
    # Models directory
    MODELS_DIR = BASE_DIR / "models"
    
    # Chunking parameters
    CHUNK_SIZE = 1000
    CHUNK_OVERLAP = 200
    
    # Embedding model - Multilingual for Sinhala-English support
    EMBEDDING_MODEL = "paraphrase-multilingual-MiniLM-L12-v2"
    
    # LLM Configuration
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    LLM_MODEL = "gpt-3.5-turbo"
    LLM_TEMPERATURE = 0.7
    
    # RAG Configuration
    SIMILARITY_THRESHOLD = 0.6
    TOP_K_RESULTS = 5  # Number of chunks to retrieve
    MAX_ANSWER_LENGTH = 500  # Maximum words in answer
    MAX_SENTENCES_IN_ANSWER = 5  # Maximum sentences to include
    
    # Supported file types
    SUPPORTED_PDF_EXTENSIONS = [".pdf"]
    SUPPORTED_DATASET_EXTENSIONS = [".csv", ".json", ".xlsx"]
    SUPPORTED_WEB_EXTENSIONS = [".html", ".txt"]
    
    # Pipeline Configuration
    PIPELINE_BATCH_SIZE = 100
    REQUEST_DELAY = 2  # seconds between web requests
    MAX_RETRIES = 3
    
    def __init__(self):
        """Create directories if they don't exist"""
        for dir_path in [
            self.DATA_DIR,
            self.PDF_DIR,
            self.WEBSITE_DIR,
            self.DATASET_DIR,
            self.PROCESSED_DIR,
            self.CHUNKS_DIR,
            self.METADATA_DIR,
            self.VECTORDB_DIR,
            self.MODELS_DIR
        ]:
            dir_path.mkdir(parents=True, exist_ok=True)
    
    def validate(self):
        """Validate configuration"""
        errors = []
        
        # Optional: Only warn if API key is missing
        if not self.OPENAI_API_KEY:
            print("⚠ Warning: OPENAI_API_KEY not set in .env file")
        
        if errors:
            raise ValueError(f"Configuration errors:\n" + "\n".join(f"- {e}" for e in errors))
        
        return True