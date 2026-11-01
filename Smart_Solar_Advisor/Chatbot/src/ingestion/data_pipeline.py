"""
Data Pipeline - Main orchestrator for all data processing
Coordinates PDF, Web, and Dataset processors
"""

from pathlib import Path
from typing import List, Dict
import json
from datetime import datetime
import logging
import sys

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from ingestion.pdf_processor import PDFProcessor
from ingestion.web_processor import WebProcessor
from ingestion.dataset_processor import DatasetProcessor
from ingestion.text_chunker import TextChunker  # Add this
from embeddings.embeddings_handler import EmbeddingsHandler  # Add this

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DataPipeline:
    """Main orchestrator for all data processing"""
    
    def __init__(self, config):
        self.config = config
        
        # Initialize processors
        self.pdf_processor = PDFProcessor(
            config.PDF_DIR, 
            config.METADATA_DIR
        )
        self.web_processor = WebProcessor(
            config.WEBSITE_DIR,
            config.METADATA_DIR
        )
        self.dataset_processor = DatasetProcessor(
            config.DATASET_DIR,
            config.METADATA_DIR
        )
        
        # Initialize chunker
        self.text_chunker = TextChunker(
            chunk_size=config.CHUNK_SIZE,
            chunk_overlap=config.CHUNK_OVERLAP
        )
        
        # Initialize embeddings handler
        self.embeddings_handler = EmbeddingsHandler(
            model_name=config.EMBEDDING_MODEL,
            db_path=str(config.VECTORDB_DIR)
        )
        
        self.all_documents = []
        self.all_chunks = []
    
    def run_full_pipeline(self):
        """Run the complete data processing pipeline"""
        logger.info("=" * 70)
        logger.info("Starting Full Data Processing Pipeline")
        logger.info("=" * 70)
        
        # Step 1: Process all data sources
        logger.info("\n[PHASE 1] DATA EXTRACTION")
        logger.info("-" * 70)
        self._extract_all_data()
        
        # Step 2: Chunk documents
        logger.info("\n[PHASE 2] TEXT CHUNKING")
        logger.info("-" * 70)
        self._chunk_documents()
        
        # Step 3: Create embeddings and store in vector database
        logger.info("\n[PHASE 3] EMBEDDINGS & VECTOR DATABASE")
        logger.info("-" * 70)
        self._create_embeddings()
        
        # Step 4: Save summary
        self._save_pipeline_summary()
        
        logger.info("\n" + "=" * 70)
        logger.info("Pipeline Complete!")
        logger.info("=" * 70)
        logger.info(f"✓ Total documents processed: {len(self.all_documents)}")
        logger.info(f"✓ Total chunks created: {len(self.all_chunks)}")
        logger.info(f"✓ Vector database ready with {self.embeddings_handler.collection.count()} items")
        logger.info("=" * 70)
        
        return {
            "documents": self.all_documents,
            "chunks": self.all_chunks,
            "collection_info": self.embeddings_handler.get_collection_info()
        }
    
    def _extract_all_data(self):
        """Extract data from all sources"""
        # Process PDFs
        logger.info("\n[1/3] Processing PDF files...")
        pdf_data = self.pdf_processor.process_all_pdfs()
        self._add_to_documents(pdf_data, "pdf")
        
        # Process Websites
        logger.info("\n[2/3] Processing website files...")
        web_data = self.web_processor.process_all_websites()
        self._add_to_documents(web_data, "website")
        
        # Process Datasets
        logger.info("\n[3/3] Processing dataset files...")
        dataset_data = self.dataset_processor.process_all_datasets()
        self._add_to_documents(dataset_data, "dataset")
        
        # Save all processed documents
        self._save_processed_documents()
    
    def _chunk_documents(self):
        """Chunk all documents"""
        logger.info(f"Chunking {len(self.all_documents)} documents...")
        
        # Create chunks
        self.all_chunks = self.text_chunker.chunk_documents(self.all_documents)
        
        # Get and display stats
        stats = self.text_chunker.get_chunking_stats(self.all_chunks)
        logger.info(f"\nChunking Statistics:")
        logger.info(f"  Total chunks: {stats['total_chunks']}")
        logger.info(f"  Avg chunk size: {stats['avg_chunk_size']:.0f} characters")
        logger.info(f"  Min chunk size: {stats['min_chunk_size']} characters")
        logger.info(f"  Max chunk size: {stats['max_chunk_size']} characters")
        
        # Save chunks
        self.text_chunker.save_chunks(self.all_chunks, self.config.CHUNKS_DIR)
    
    def _create_embeddings(self):
        """Create embeddings and add to vector database"""
        logger.info("Creating embeddings and populating vector database...")
        
        # Add chunks to vector database
        self.embeddings_handler.add_chunks_to_vectordb(self.all_chunks)
        
        # Save embedding metadata
        metadata_path = self.config.METADATA_DIR / "embeddings_metadata.json"
        self.embeddings_handler.save_embedding_metadata(metadata_path, self.all_chunks)
    
    def _add_to_documents(self, data_list: List[Dict], source_type: str):
        """Add processed data to document collection"""
        for item in data_list:
            if source_type == "pdf":
                # PDFs have multiple pages
                for page in item["content"]:
                    self.all_documents.append({
                        "text": page["content"],
                        "metadata": {
                            **item["metadata"],
                            "page_number": page["page"]
                        }
                    })
            else:
                # Websites and datasets have single content
                self.all_documents.append({
                    "text": item["content"],
                    "metadata": item["metadata"]
                })
    
    def _save_processed_documents(self):
        """Save all processed documents to file"""
        output_file = self.config.PROCESSED_DIR / "all_documents.json"
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump({
                "processed_date": datetime.now().isoformat(),
                "total_documents": len(self.all_documents),
                "documents": self.all_documents
            }, f, indent=2, ensure_ascii=False)
        
        logger.info(f"✓ Saved all documents to {output_file}")
    
    def _save_pipeline_summary(self):
        """Save complete pipeline summary"""
        summary = {
            "pipeline_completed_at": datetime.now().isoformat(),
            "documents": {
                "total": len(self.all_documents),
                "sources": {
                    "pdfs": sum(1 for d in self.all_documents if d["metadata"]["source_type"] == "pdf"),
                    "websites": sum(1 for d in self.all_documents if d["metadata"]["source_type"] in ["website", "text"]),
                    "datasets": sum(1 for d in self.all_documents if "dataset" in d["metadata"]["source_type"])
                }
            },
            "chunks": {
                "total": len(self.all_chunks),
                "statistics": self.text_chunker.get_chunking_stats(self.all_chunks)
            },
            "embeddings": {
                "model": self.config.EMBEDDING_MODEL,
                "collection_info": self.embeddings_handler.get_collection_info()
            }
        }
        
        summary_file = self.config.PROCESSED_DIR / "pipeline_summary.json"
        with open(summary_file, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        
        logger.info(f"✓ Saved pipeline summary to {summary_file}")
    
    def get_documents(self):
        """Get all processed documents"""
        return self.all_documents
    
    def get_chunks(self):
        """Get all chunks"""
        return self.all_chunks
    
    def search(self, query: str, n_results: int = 5):
        """Search the vector database"""
        return self.embeddings_handler.search(query, n_results)