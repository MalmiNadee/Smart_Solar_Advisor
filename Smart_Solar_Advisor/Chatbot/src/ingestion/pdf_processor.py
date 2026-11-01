"""
PDF Processor - Extract text from PDF files
Processes all PDFs from data/pdfs/ directory
"""

from pathlib import Path
from PyPDF2 import PdfReader
import json
from datetime import datetime
from typing import List, Dict
import logging

from .content_filter import SolarContentFilter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PDFProcessor:
    """Process PDF files from data/pdfs/ directory"""
    
    def __init__(self, pdf_dir: Path, output_dir: Path, enable_filtering: bool = True, min_score: float = 0.3):
        """
        Initialize PDF processor
        
        Args:
            pdf_dir: Directory containing PDF files
            output_dir: Directory to save metadata
            enable_filtering: Enable solar content filtering
            min_score: Minimum relevance score for filtering
        """
        self.pdf_dir = pdf_dir
        self.output_dir = output_dir
        self.processed_files = []
        self.enable_filtering = enable_filtering
        
        # Initialize content filter
        if enable_filtering:
            self.content_filter = SolarContentFilter(min_score=min_score)
            logger.info(f"PDF Processor: Solar content filtering ENABLED (min_score={min_score})")
        else:
            self.content_filter = None
            logger.info("PDF Processor: Content filtering DISABLED")
        
        # Ensure directories exist
        self.pdf_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def extract_text_from_pdf(self, pdf_path: Path) -> Dict:
        """
        Extract text from a single PDF file
        
        Args:
            pdf_path: Path to PDF file
            
        Returns:
            Dictionary containing content and metadata
        """
        try:
            reader = PdfReader(pdf_path)
            text_content = []
            
            # Extract text from each page
            for page_num, page in enumerate(reader.pages, 1):
                page_text = page.extract_text()
                if page_text and page_text.strip():
                    # Apply content filtering if enabled
                    if self.enable_filtering and self.content_filter:
                        filtered_text, page_metadata, is_relevant = self.content_filter.filter_document(
                            page_text.strip(),
                            {"page": page_num, "filename": pdf_path.name}
                        )
                        
                        if is_relevant and filtered_text:
                            text_content.append({
                                "page": page_num,
                                "content": filtered_text,
                                "filtered": page_metadata.get('filtered', False),
                                "relevance_score": page_metadata.get('relevance_score', 0)
                            })
                    else:
                        # No filtering - keep all content
                        text_content.append({
                            "page": page_num,
                            "content": page_text.strip()
                        })
            
            # Create metadata
            metadata = {
                "filename": pdf_path.name,
                "filepath": str(pdf_path.absolute()),
                "total_pages": len(reader.pages),
                "pages_with_text": len(text_content),
                "processed_date": datetime.now().isoformat(),
                "source_type": "pdf",
                "file_size": pdf_path.stat().st_size
            }
            
            logger.info(f"✓ Extracted {len(text_content)} pages from {pdf_path.name}")
            
            return {
                "content": text_content,
                "metadata": metadata
            }
            
        except Exception as e:
            logger.error(f"✗ Error processing {pdf_path.name}: {str(e)}")
            return None
    
    def process_all_pdfs(self) -> List[Dict]:
        """
        Process all PDF files in the pdfs directory
        
        Returns:
            List of processed documents
        """
        if not self.pdf_dir.exists():
            logger.warning(f"PDF directory not found: {self.pdf_dir}")
            return []
        
        pdf_files = list(self.pdf_dir.glob("*.pdf"))
        
        if not pdf_files:
            logger.warning(f"No PDF files found in {self.pdf_dir}")
            return []
        
        logger.info(f"Found {len(pdf_files)} PDF files to process")
        
        processed_data = []
        
        for pdf_file in pdf_files:
            result = self.extract_text_from_pdf(pdf_file)
            if result:
                processed_data.append(result)
                self.processed_files.append(pdf_file.name)
        
        # Save processing summary
        self._save_processing_summary()
        
        logger.info(f"Successfully processed {len(processed_data)} PDF files")
        
        return processed_data
    
    def _save_processing_summary(self):
        """Save summary of processed files"""
        summary = {
            "processed_date": datetime.now().isoformat(),
            "total_files": len(self.processed_files),
            "files": self.processed_files,
            "processor": "PDFProcessor"
        }
        
        summary_path = self.output_dir / "pdf_processing_summary.json"
        with open(summary_path, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Summary saved to {summary_path}")


if __name__ == "__main__":
    # Test the processor
    from pathlib import Path
    
    base_dir = Path(__file__).parent.parent.parent
    pdf_dir = base_dir / "data" / "pdfs"
    output_dir = base_dir / "data" / "processed" / "metadata"
    
    processor = PDFProcessor(pdf_dir, output_dir)
    results = processor.process_all_pdfs()
    
    print(f"\nProcessed {len(results)} PDF files")
    for result in results:
        print(f"  - {result['metadata']['filename']}: {result['metadata']['pages_with_text']} pages")