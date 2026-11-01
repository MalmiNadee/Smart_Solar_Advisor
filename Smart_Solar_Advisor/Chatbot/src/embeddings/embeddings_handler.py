from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings
from typing import List, Dict, Any
import logging
from pathlib import Path
import json
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EmbeddingsHandler:
    """Handle embeddings creation and vector database operations"""
    
    def __init__(self, 
                 model_name: str = "paraphrase-multilingual-MiniLM-L12-v2",
                 db_path: str = "./vectordb"):
        """
        Initialize embeddings handler
        
        Args:
            model_name: Name of sentence-transformers model
            db_path: Path to store vector database
        """
        self.model_name = model_name
        self.db_path = Path(db_path)
        self.db_path.mkdir(parents=True, exist_ok=True)
        self.logger = logger
        
        logger.info(f"Loading embedding model: {model_name}...")
        self.model = SentenceTransformer(model_name)
        logger.info(f"✓ Model loaded successfully")
        
        # Initialize ChromaDB
        logger.info("Initializing ChromaDB...")
        self.client = chromadb.PersistentClient(path=str(self.db_path))
        
        # Create or get collection
        self.collection = self.client.get_or_create_collection(
            name="solar_knowledge",
            metadata={
                "description": "Solar domain knowledge base for Sri Lanka",
                "model": model_name,
                "created_at": datetime.now().isoformat()
            }
        )
        logger.info(f"✓ ChromaDB initialized at {self.db_path}")
    
    def _sanitize_metadata(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sanitize metadata to ensure all values are ChromaDB-compatible types.
        Converts lists to comma-separated strings and handles nested structures.
        """
        sanitized = {}
        for key, value in metadata.items():
            if value is None:
                sanitized[key] = None
            elif isinstance(value, (str, int, float, bool)):
                sanitized[key] = value
            elif isinstance(value, list):
                # Convert list to comma-separated string
                sanitized[key] = ", ".join(str(v) for v in value)
            elif isinstance(value, dict):
                # Convert dict to JSON string
                sanitized[key] = json.dumps(value)
            else:
                # Convert other types to string
                sanitized[key] = str(value)
        return sanitized
    
    def create_embeddings(self, texts: List[str], batch_size: int = 32) -> List[List[float]]:
        """
        Create embeddings for a list of texts
        
        Args:
            texts: List of text strings
            batch_size: Batch size for encoding
            
        Returns:
            List of embedding vectors
        """
        logger.info(f"Creating embeddings for {len(texts)} texts...")
        
        embeddings = self.model.encode(
            texts,
            batch_size=batch_size,
            show_progress_bar=True,
            convert_to_numpy=True
        )
        
        # Convert to list for JSON serialization
        embeddings_list = embeddings.tolist()
        
        logger.info(f"✓ Created {len(embeddings_list)} embeddings")
        
        return embeddings_list
    
    def add_chunks_to_vectordb(self, chunks: List[Dict], batch_size: int = 100):
        """
        Add chunks to vector database with embeddings
        
        Args:
            chunks: List of chunk dictionaries
            batch_size: Number of chunks to process at once
        """
        logger.info(f"Adding {len(chunks)} chunks to vector database...")
        
        total_batches = (len(chunks) + batch_size - 1) // batch_size
        
        for batch_idx in range(0, len(chunks), batch_size):
            batch_chunks = chunks[batch_idx:batch_idx + batch_size]
            
            # Extract texts and prepare data
            texts = [chunk["text"] for chunk in batch_chunks]
            ids = [chunk["chunk_id"] for chunk in batch_chunks]
            # Sanitize metadata before adding to ChromaDB
            metadatas = [self._sanitize_metadata(chunk["metadata"]) for chunk in batch_chunks]
            
            # Create embeddings for this batch
            embeddings = self.create_embeddings(texts, batch_size=32)
            
            try:
                # Add to ChromaDB
                self.collection.add(
                    embeddings=embeddings,
                    documents=texts,
                    metadatas=metadatas,
                    ids=ids
                )
                
                current_batch = (batch_idx // batch_size) + 1
                logger.info(f"✓ Processed batch {current_batch}/{total_batches}")
            except Exception as e:
                self.logger.error(f"✗ Error adding batch: {str(e)}")
                # Log problematic metadata for debugging
                for i, meta in enumerate(metadatas):
                    for k, v in meta.items():
                        if not isinstance(v, (str, int, float, bool, type(None))):
                            self.logger.error(f"  Invalid metadata in chunk {i}: {k} = {v} (type: {type(v)})")
                raise
        
        logger.info(f"✓ Successfully added all chunks to vector database")
        logger.info(f"  Total items in collection: {self.collection.count()}")
    
    def search(self, query: str, n_results: int = 3):
        """Search for similar chunks"""
        try:
            # Generate query embedding
            query_embedding = self.model.encode([query])[0].tolist()
            
            # Search in ChromaDB with cosine similarity
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                include=['documents', 'metadatas', 'distances']
            )
            
            # Convert squared L2 distances to similarity scores
            # ChromaDB uses squared L2 distance by default
            # We need to normalize or convert appropriately
            if results['distances']:
                # Normalize distances to 0-1 range for better interpretation
                distances = results['distances'][0]
                max_dist = max(distances) if distances else 1
                normalized_distances = [d / max_dist if max_dist > 0 else d for d in distances]
                results['distances'] = [normalized_distances]
            
            return results
            
        except Exception as e:
            logging.error(f"Error during search: {str(e)}")
            return {'documents': [[]], 'metadatas': [[]], 'distances': [[]]}
    
    def get_collection_info(self) -> Dict:
        """Get information about the vector database collection"""
        count = self.collection.count()
        
        info = {
            "collection_name": self.collection.name,
            "total_chunks": count,
            "model": self.model_name,
            "db_path": str(self.db_path)
        }
        
        return info
    
    def save_embedding_metadata(self, output_path: Path, chunks: List[Dict]):
        """Save metadata about embeddings"""
        metadata = {
            "created_at": datetime.now().isoformat(),
            "model": self.model_name,
            "total_chunks": len(chunks),
            "collection_info": self.get_collection_info()
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
        
        logger.info(f"✓ Saved embedding metadata to {output_path}")