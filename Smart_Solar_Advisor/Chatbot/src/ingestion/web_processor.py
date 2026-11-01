"""
Web Processor - Extract text from HTML and text files
Processes all website data from data/websites/ directory
"""

from pathlib import Path
from bs4 import BeautifulSoup
import json
from datetime import datetime
from typing import List, Dict
import logging

from .content_filter import SolarContentFilter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class WebProcessor:
    """Process website data from data/websites/ directory"""
    
    def __init__(self, web_dir: Path, output_dir: Path, enable_filtering: bool = True, min_score: float = 0.3):
        """
        Initialize web processor
        
        Args:
            web_dir: Directory containing HTML/TXT files
            output_dir: Directory to save metadata
            enable_filtering: Enable solar content filtering
            min_score: Minimum relevance score for filtering
        """
        self.web_dir = web_dir
        self.output_dir = output_dir
        self.processed_files = []
        self.enable_filtering = enable_filtering
        
        # Initialize content filter
        if enable_filtering:
            self.content_filter = SolarContentFilter(min_score=min_score)
            logger.info(f"Web Processor: Solar content filtering ENABLED (min_score={min_score})")
        else:
            self.content_filter = None
            logger.info("Web Processor: Content filtering DISABLED")
        
        # Ensure directories exist
        self.web_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def extract_text_from_html(self, html_path: Path) -> Dict:
        """
        Extract clean text from HTML file
        
        Args:
            html_path: Path to HTML file
            
        Returns:
            Dictionary containing content and metadata
        """
        try:
            with open(html_path, 'r', encoding='utf-8', errors='ignore') as f:
                html_content = f.read()
            
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Remove script, style, and navigation elements
            for script in soup(["script", "style", "nav", "footer", "header", "aside"]):
                script.decompose()
            
            # Extract title
            title = soup.title.string if soup.title else html_path.stem
            
            # Extract main content
            text = soup.get_text(separator='\n', strip=True)
            
            # Clean up extra whitespace
            lines = [line.strip() for line in text.splitlines() if line.strip()]
            clean_text = '\n'.join(lines)
            
            # Apply content filtering if enabled
            if self.enable_filtering and self.content_filter:
                clean_text, filter_metadata, is_relevant = self.content_filter.filter_by_sections(
                    clean_text,
                    {"filename": html_path.name, "title": str(title).strip() if title else html_path.stem}
                )
                
                if not is_relevant:
                    logger.info(f"⊘ Filtered out {html_path.name} - not solar-related")
                    return None
            
            # Create metadata
            metadata = {
                "filename": html_path.name,
                "filepath": str(html_path.absolute()),
                "title": str(title).strip() if title else html_path.stem,
                "processed_date": datetime.now().isoformat(),
                "source_type": "website_html",
                "file_size": html_path.stat().st_size,
                "character_count": len(clean_text)
            }
            
            # Add filtering metadata if applicable
            if self.enable_filtering and self.content_filter:
                metadata.update({
                    "filtered": filter_metadata.get('filtered', False),
                    "relevance_score": filter_metadata.get('relevance_score', 0)
                })
            
            logger.info(f"✓ Extracted text from {html_path.name} ({len(clean_text)} chars)")
            
            return {
                "content": clean_text,
                "metadata": metadata
            }
            
        except Exception as e:
            logger.error(f"✗ Error processing {html_path.name}: {str(e)}")
            return None
    
    def extract_text_from_txt(self, txt_path: Path) -> Dict:
        """
        Extract text from plain text file
        
        Args:
            txt_path: Path to text file
            
        Returns:
            Dictionary containing content and metadata
        """
        try:
            with open(txt_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # Apply content filtering if enabled
            if self.enable_filtering and self.content_filter:
                content, filter_metadata, is_relevant = self.content_filter.filter_document(
                    content,
                    {"filename": txt_path.name}
                )
                
                if not is_relevant:
                    logger.info(f"⊘ Filtered out {txt_path.name} - not solar-related")
                    return None
            
            # Create metadata
            metadata = {
                "filename": txt_path.name,
                "filepath": str(txt_path.absolute()),
                "processed_date": datetime.now().isoformat(),
                "source_type": "website_text",
                "file_size": txt_path.stat().st_size,
                "character_count": len(content)
            }
            
            # Add filtering metadata if applicable
            if self.enable_filtering and self.content_filter:
                metadata.update({
                    "filtered": filter_metadata.get('filtered', False),
                    "relevance_score": filter_metadata.get('relevance_score', 0)
                })
            
            logger.info(f"✓ Loaded {txt_path.name} ({len(content)} chars)")
            
            return {
                "content": content,
                "metadata": metadata
            }
            
        except Exception as e:
            logger.error(f"✗ Error reading {txt_path.name}: {str(e)}")
            return None
    
    def process_all_websites(self) -> List[Dict]:
        """
        Process all website files (HTML and TXT)
        
        Returns:
            List of processed documents
        """
        if not self.web_dir.exists():
            logger.warning(f"Website directory not found: {self.web_dir}")
            return []
        
        html_files = list(self.web_dir.glob("*.html"))
        txt_files = list(self.web_dir.glob("*.txt"))
        
        if not html_files and not txt_files:
            logger.warning(f"No HTML or TXT files found in {self.web_dir}")
            return []
        
        logger.info(f"Found {len(html_files)} HTML and {len(txt_files)} TXT files")
        
        processed_data = []
        
        # Process HTML files
        for html_file in html_files:
            result = self.extract_text_from_html(html_file)
            if result:
                processed_data.append(result)
                self.processed_files.append(html_file.name)
        
        # Process TXT files
        for txt_file in txt_files:
            result = self.extract_text_from_txt(txt_file)
            if result:
                processed_data.append(result)
                self.processed_files.append(txt_file.name)
        
        # Save processing summary
        self._save_processing_summary()
        
        logger.info(f"Successfully processed {len(processed_data)} website files")
        
        return processed_data
    
    def _save_processing_summary(self):
        """Save processing summary"""
        summary = {
            "processed_date": datetime.now().isoformat(),
            "total_files": len(self.processed_files),
            "files": self.processed_files,
            "processor": "WebProcessor"
        }
        
        summary_path = self.output_dir / "web_processing_summary.json"
        with open(summary_path, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Summary saved to {summary_path}")


if __name__ == "__main__":
    # Test the processor
    from pathlib import Path
    
    base_dir = Path(__file__).parent.parent.parent
    web_dir = base_dir / "data" / "websites"
    output_dir = base_dir / "data" / "processed" / "metadata"
    
    processor = WebProcessor(web_dir, output_dir)
    results = processor.process_all_websites()
    
    print(f"\nProcessed {len(results)} website files")
    for result in results:
        print(f"  - {result['metadata']['filename']}: {result['metadata']['character_count']} chars")