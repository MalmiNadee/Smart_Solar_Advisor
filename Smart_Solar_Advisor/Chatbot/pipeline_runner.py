"""
Automated pipeline to collect, process, and index solar data
"""
import sys
from pathlib import Path
import logging
from datetime import datetime
import json

# Add src to path
sys.path.append(str(Path(__file__).parent / "src"))

from config import Config
from pipeline.data_collector import SolarDataCollector
from pipeline.dataset_generator import DatasetGenerator
from ingestion.pdf_processor import PDFProcessor
from ingestion.web_processor import WebProcessor
from ingestion.dataset_processor import DatasetProcessor
from ingestion.text_chunker import TextChunker
from embeddings.embeddings_handler import EmbeddingsHandler

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class SolarDataPipeline:
    """Complete pipeline for solar data collection and processing"""
    
    def __init__(self):
        self.config = Config()
        
        # Initialize processors with correct arguments
        self.pdf_processor = PDFProcessor(
            self.config.PDF_DIR, 
            self.config.PROCESSED_DIR
        )
        self.web_processor = WebProcessor(
            self.config.WEBSITE_DIR,
            self.config.PROCESSED_DIR
        )
        self.dataset_processor = DatasetProcessor(
            self.config.DATASET_DIR,
            self.config.PROCESSED_DIR
        )
        self.text_chunker = TextChunker(
            chunk_size=self.config.CHUNK_SIZE,
            chunk_overlap=self.config.CHUNK_OVERLAP
        )
        
        self.all_chunks = []
        
        logger.info("🚀 Initializing Solar Data Pipeline")
    
    def step1_collect_data(self):
        """Step 1: Collect data from web sources"""
        logger.info("\n" + "="*80)
        logger.info("STEP 1: Collecting Data from Web Sources")
        logger.info("="*80)
        
        collector = SolarDataCollector(self.config)
        data = collector.collect_all_sources()
        collector.save_collected_data(data)
        
        return len(data) > 0
    
    def step2_generate_datasets(self):
        """Step 2: Generate structured datasets"""
        logger.info("\n" + "="*80)
        logger.info("STEP 2: Generating Structured Datasets")
        logger.info("="*80)
        
        generator = DatasetGenerator(self.config)
        generator.save_datasets()
        
        return True
    
    def step3_process_documents(self):
        """Step 3: Process all documents into chunks"""
        logger.info("\n" + "="*80)
        logger.info("STEP 3: Processing Documents into Chunks")
        logger.info("="*80)
        
        stats = {
            'websites': 0,
            'datasets': 0,
            'pdfs': 0,
            'total_chunks': 0
        }
        
        # Process websites
        if self.config.WEBSITE_DIR.exists():
            website_files = list(self.config.WEBSITE_DIR.glob("*.txt")) + \
                          list(self.config.WEBSITE_DIR.glob("*.html"))
            
            for file_path in website_files:
                try:
                    # Read content
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Chunk the content using the correct method name
                    chunks = self.text_chunker.chunk(
                        text=content,
                        source_type='website',
                        filename=file_path.name
                    )
                    
                    self.all_chunks.extend(chunks)
                    stats['websites'] += 1
                    stats['total_chunks'] += len(chunks)
                    logger.info(f"✅ Processed: {file_path.name} ({len(chunks)} chunks)")
                    
                except Exception as e:
                    logger.error(f"❌ Error processing {file_path.name}: {str(e)}")
        
        # Process datasets
        if self.config.DATASET_DIR.exists():
            dataset_files = list(self.config.DATASET_DIR.glob("*.json"))
            
            for file_path in dataset_files:
                try:
                    # Read dataset file
                    with open(file_path, 'r', encoding='utf-8') as f:
                        dataset_items = json.load(f)
                    
                    # Format as chunks with proper structure
                    chunk_id = 0
                    for item in dataset_items:
                        # Handle different dataset formats
                        if isinstance(item, dict):
                            content = item.get('answer', item.get('content', ''))
                            
                            chunk = {
                                'text': content,  # Use 'text' not 'content' for EmbeddingsHandler
                                'chunk_id': f"{file_path.stem}_{chunk_id}",
                                'metadata': {
                                    'source_type': 'dataset',
                                    'filename': file_path.name,
                                    'question': item.get('question', ''),
                                    'category': item.get('category', 'general'),
                                    'language': item.get('language', 'english')
                                }
                            }
                            self.all_chunks.append(chunk)
                            chunk_id += 1
                    
                    stats['datasets'] += 1
                    stats['total_chunks'] += chunk_id
                    logger.info(f"✅ Processed: {file_path.name} ({chunk_id} chunks)")
                    
                except Exception as e:
                    logger.error(f"❌ Error processing {file_path.name}: {str(e)}")
        
        # Process PDFs
        if self.config.PDF_DIR.exists():
            pdf_files = list(self.config.PDF_DIR.glob("*.pdf"))
            
            for file_path in pdf_files:
                try:
                    # Read PDF
                    from PyPDF2 import PdfReader
                    
                    reader = PdfReader(str(file_path))
                    full_text = ""
                    
                    for page_num, page in enumerate(reader.pages):
                        text = page.extract_text()
                        if text:
                            full_text += f"\n\n{text}"
                    
                    if full_text.strip():
                        # Chunk the text
                        chunks = self.text_chunker.chunk(
                            text=full_text,
                            source_type='pdf',
                            filename=file_path.name
                        )
                        
                        self.all_chunks.extend(chunks)
                        stats['pdfs'] += 1
                        stats['total_chunks'] += len(chunks)
                        logger.info(f"✅ Processed: {file_path.name} ({len(chunks)} chunks)")
                    
                except Exception as e:
                    logger.error(f"❌ Error processing {file_path.name}: {str(e)}")
        
        # Save all chunks
        self._save_all_chunks()
        
        logger.info(f"\n📊 Processing Statistics:")
        logger.info(f"   Websites: {stats['websites']}")
        logger.info(f"   Datasets: {stats['datasets']}")
        logger.info(f"   PDFs: {stats['pdfs']}")
        logger.info(f"   Total Chunks: {stats['total_chunks']}")
        
        return stats['total_chunks'] > 0
    
    def _save_all_chunks(self):
        """Save all processed chunks to JSON file"""
        if not self.all_chunks:
            logger.warning("No chunks to save!")
            return
        
        # Ensure processed directory exists
        self.config.PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
        
        # Save chunks (format compatible with EmbeddingsHandler)
        output_file = self.config.PROCESSED_DIR / "all_chunks.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(self.all_chunks, f, indent=2, ensure_ascii=False)
        
        logger.info(f"✅ Saved {len(self.all_chunks)} chunks to {output_file}")
    
    def step4_create_embeddings(self):
        """Step 4: Create vector embeddings"""
        logger.info("\n" + "="*80)
        logger.info("STEP 4: Creating Vector Embeddings")
        logger.info("="*80)
        
        embeddings_handler = EmbeddingsHandler(
            model_name=self.config.EMBEDDING_MODEL,
            db_path=str(self.config.VECTORDB_DIR)
        )
        
        # Load all processed chunks
        all_chunks_file = self.config.PROCESSED_DIR / "all_chunks.json"
        
        if not all_chunks_file.exists():
            logger.error("❌ No processed chunks found!")
            return False
        
        with open(all_chunks_file, 'r', encoding='utf-8') as f:
            chunks = json.load(f)
        
        # Ensure all chunks have required fields
        for i, chunk in enumerate(chunks):
            if 'chunk_id' not in chunk:
                chunk['chunk_id'] = f"chunk_{i}"
            if 'text' not in chunk:
                chunk['text'] = chunk.get('content', '')
            if 'metadata' not in chunk:
                chunk['metadata'] = {'source_type': 'unknown'}
        
        # Add chunks to vector database using the correct method
        embeddings_handler.add_chunks_to_vectordb(chunks, batch_size=100)
        
        # Verify
        info = embeddings_handler.get_collection_info()
        logger.info(f"\n✅ Vector database created successfully!")
        logger.info(f"   Total chunks indexed: {info['total_chunks']}")
        
        return True
    
    def run_full_pipeline(self):
        """Run the complete pipeline"""
        start_time = datetime.now()
        
        logger.info("\n" + "🌞"*40)
        logger.info("SMART SOLAR ADVISOR - AUTOMATED DATA PIPELINE")
        logger.info("🌞"*40 + "\n")
        
        try:
            # Step 1: Collect data
            if not self.step1_collect_data():
                logger.warning("⚠️  No data collected, but continuing...")
            
            # Step 2: Generate datasets
            self.step2_generate_datasets()
            
            # Step 3: Process documents
            if not self.step3_process_documents():
                logger.error("❌ Document processing failed!")
                return False
            
            # Step 4: Create embeddings
            if not self.step4_create_embeddings():
                logger.error("❌ Embedding creation failed!")
                return False
            
            # Success!
            duration = (datetime.now() - start_time).total_seconds()
            logger.info("\n" + "="*80)
            logger.info("✅ PIPELINE COMPLETED SUCCESSFULLY!")
            logger.info(f"⏱️  Total time: {duration:.2f} seconds")
            logger.info("="*80)
            
            logger.info("\n📝 Next Steps:")
            logger.info("   1. Run: streamlit run app_simple.py")
            logger.info("   2. Start asking questions about solar energy!")
            
            return True
            
        except Exception as e:
            logger.error(f"\n❌ Pipeline failed: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return False

def main():
    """Main entry point"""
    pipeline = SolarDataPipeline()
    success = pipeline.run_full_pipeline()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()