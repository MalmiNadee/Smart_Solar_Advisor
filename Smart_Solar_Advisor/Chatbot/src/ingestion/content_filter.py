"""
Content Filter - Filter documents to keep only solar-related content
Uses keyword matching and domain-specific patterns
"""

import re
from typing import Dict, List, Tuple
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SolarContentFilter:
    """Filter content to keep only solar-related text"""
    
    # Solar-related keywords (English)
    SOLAR_KEYWORDS = {
        # Core solar terms
        'solar', 'photovoltaic', 'pv', 'renewable energy', 'clean energy',
        'solar panel', 'solar cell', 'solar array', 'solar module',
        'solar system', 'solar power', 'solar energy', 'solar installation',
        
        # Panel types
        'monocrystalline', 'polycrystalline', 'thin-film', 'bifacial',
        'perc', 'half-cut', 'shingled',
        
        # Components
        'inverter', 'charge controller', 'battery storage', 'mounting system',
        'racking', 'solar tracker', 'microinverter', 'string inverter',
        'combiner box', 'disconnect switch', 'mppt',
        
        # Technical terms
        'watt', 'kilowatt', 'kw', 'kwh', 'megawatt', 'mw', 'efficiency',
        'capacity factor', 'irradiance', 'insolation', 'peak sun hours',
        'degradation', 'performance ratio', 'albedo',
        
        # Installation & regulation (Sri Lanka specific)
        'ceb', 'ceylon electricity board', 'net metering', 'grid-tied',
        'off-grid', 'hybrid system', 'rooftop solar', 'ground-mounted',
        'sustainable energy authority', 'sea', 'slsea',
        
        # Financial
        'solar subsidy', 'solar incentive', 'feed-in tariff', 'roi',
        'payback period', 'solar financing', 'solar lease',
        
        # Environmental
        'carbon footprint', 'emissions reduction', 'green energy',
        'sustainability', 'climate change mitigation',
    }
    
    # Sinhala solar keywords (common terms)
    SOLAR_KEYWORDS_SINHALA = {
        'සූර්ය', 'සෞර', 'විදුලිය', 'බලශක්ති', 'පැනල', 'පැනලය',
        'පුනර්ජනනීය', 'පරිසර', 'හරිත', 'බැටරි',
    }
    
    # Keywords that indicate NON-solar content (to exclude)
    EXCLUDE_KEYWORDS = {
        'wind turbine', 'wind power', 'wind energy', 'wind farm',
        'hydroelectric', 'hydro power', 'nuclear power', 'nuclear energy',
        'coal power', 'natural gas', 'fossil fuel', 'oil refinery',
        'geothermal', 'biomass', 
        # Add generic non-solar topics
        'sports', 'entertainment', 'fashion', 'cooking recipe',
        'movie review', 'game', 'music album',
    }
    
    def __init__(self, min_score: float = 0.3, chunk_size: int = 500):
        """
        Initialize content filter
        
        Args:
            min_score: Minimum relevance score (0-1) to keep content
            chunk_size: Size of text chunks to analyze
        """
        self.min_score = min_score
        self.chunk_size = chunk_size
        
        # Compile keyword patterns for faster matching
        self.solar_pattern = self._compile_pattern(
            self.SOLAR_KEYWORDS | self.SOLAR_KEYWORDS_SINHALA
        )
        self.exclude_pattern = self._compile_pattern(self.EXCLUDE_KEYWORDS)
    
    def _compile_pattern(self, keywords: set) -> re.Pattern:
        """Compile keywords into regex pattern"""
        # Escape special regex characters and create word boundary pattern
        escaped_keywords = [re.escape(kw) for kw in keywords]
        pattern = r'\b(' + '|'.join(escaped_keywords) + r')\b'
        return re.compile(pattern, re.IGNORECASE)
    
    def calculate_relevance_score(self, text: str) -> float:
        """
        Calculate how relevant text is to solar domain
        
        Args:
            text: Text to analyze
            
        Returns:
            Relevance score between 0 and 1
        """
        if not text or len(text.strip()) < 50:
            return 0.0
        
        text_lower = text.lower()
        
        # Count solar keyword matches
        solar_matches = len(self.solar_pattern.findall(text))
        
        # Count exclusion keyword matches
        exclude_matches = len(self.exclude_pattern.findall(text))
        
        # Penalize if exclusion keywords found
        if exclude_matches > solar_matches:
            return 0.0
        
        # Calculate word density
        words = text.split()
        word_count = len(words)
        
        if word_count == 0:
            return 0.0
        
        # Score based on keyword density
        keyword_density = solar_matches / word_count
        
        # Normalize score (cap at 1.0)
        score = min(keyword_density * 10, 1.0)
        
        return score
    
    def is_solar_relevant(self, text: str) -> bool:
        """
        Check if text is relevant to solar domain
        
        Args:
            text: Text to check
            
        Returns:
            True if relevant, False otherwise
        """
        score = self.calculate_relevance_score(text)
        return score >= self.min_score
    
    def filter_document(self, text: str, metadata: Dict) -> Tuple[str, Dict, bool]:
        """
        Filter a document to keep only solar-related content
        
        Args:
            text: Document text
            metadata: Document metadata
            
        Returns:
            Tuple of (filtered_text, updated_metadata, is_relevant)
        """
        # Calculate overall document score
        doc_score = self.calculate_relevance_score(text)
        
        # If document is clearly irrelevant, reject it
        if doc_score < self.min_score:
            logger.debug(f"Rejected {metadata.get('filename', 'unknown')}: score {doc_score:.2f}")
            return "", metadata, False
        
        # If document is highly relevant, keep all of it
        if doc_score > 0.7:
            metadata['relevance_score'] = doc_score
            metadata['filtered'] = False
            logger.info(f"✓ Kept entire document {metadata.get('filename', 'unknown')}: score {doc_score:.2f}")
            return text, metadata, True
        
        # For borderline documents, filter paragraph by paragraph
        paragraphs = text.split('\n\n')
        filtered_paragraphs = []
        
        for para in paragraphs:
            if len(para.strip()) < 50:  # Skip very short paragraphs
                continue
            
            para_score = self.calculate_relevance_score(para)
            if para_score >= self.min_score:
                filtered_paragraphs.append(para)
        
        if filtered_paragraphs:
            filtered_text = '\n\n'.join(filtered_paragraphs)
            metadata['relevance_score'] = doc_score
            metadata['filtered'] = True
            metadata['original_length'] = len(text)
            metadata['filtered_length'] = len(filtered_text)
            metadata['reduction_percent'] = round((1 - len(filtered_text) / len(text)) * 100, 2)
            
            logger.info(
                f"✓ Filtered {metadata.get('filename', 'unknown')}: "
                f"score {doc_score:.2f}, kept {len(filtered_text)}/{len(text)} chars "
                f"({metadata['reduction_percent']}% reduction)"
            )
            return filtered_text, metadata, True
        
        # No relevant content found
        logger.debug(f"Rejected {metadata.get('filename', 'unknown')} after paragraph filtering")
        return "", metadata, False
    
    def filter_by_sections(self, text: str, metadata: Dict) -> Tuple[str, Dict, bool]:
        """
        Advanced filtering: Extract only solar-related sections from document
        Works well for mixed-content documents with clear section headers
        
        Args:
            text: Document text
            metadata: Document metadata
            
        Returns:
            Tuple of (filtered_text, updated_metadata, is_relevant)
        """
        # Split by common section markers
        section_patterns = [
            r'\n#{1,6}\s+(.+)\n',  # Markdown headers
            r'\n([A-Z][A-Za-z\s]{3,50})\n',  # Capitalized headers
            r'\n\d+\.\s+(.+)\n',  # Numbered sections
        ]
        
        sections = []
        current_section = {"title": "", "content": ""}
        
        lines = text.split('\n')
        
        for line in lines:
            # Check if line is a header
            is_header = False
            for pattern in section_patterns:
                if re.match(pattern, line):
                    # Save previous section
                    if current_section["content"]:
                        sections.append(current_section)
                    # Start new section
                    current_section = {"title": line.strip(), "content": ""}
                    is_header = True
                    break
            
            if not is_header:
                current_section["content"] += line + '\n'
        
        # Save last section
        if current_section["content"]:
            sections.append(current_section)
        
        # Filter sections
        relevant_sections = []
        for section in sections:
            combined_text = section["title"] + '\n' + section["content"]
            score = self.calculate_relevance_score(combined_text)
            
            if score >= self.min_score:
                relevant_sections.append(combined_text)
        
        if relevant_sections:
            filtered_text = '\n\n'.join(relevant_sections)
            metadata['relevance_score'] = self.calculate_relevance_score(filtered_text)
            metadata['filtered'] = True
            metadata['sections_kept'] = len(relevant_sections)
            metadata['sections_total'] = len(sections)
            
            logger.info(
                f"✓ Section-filtered {metadata.get('filename', 'unknown')}: "
                f"kept {len(relevant_sections)}/{len(sections)} sections"
            )
            return filtered_text, metadata, True
        
        return "", metadata, False
    
    def add_custom_keywords(self, keywords: List[str], language: str = 'english'):
        """
        Add custom domain-specific keywords
        
        Args:
            keywords: List of keywords to add
            language: 'english' or 'sinhala'
        """
        if language == 'english':
            self.SOLAR_KEYWORDS.update(keywords)
        else:
            self.SOLAR_KEYWORDS_SINHALA.update(keywords)
        
        # Recompile pattern
        self.solar_pattern = self._compile_pattern(
            self.SOLAR_KEYWORDS | self.SOLAR_KEYWORDS_SINHALA
        )
        
        logger.info(f"Added {len(keywords)} custom {language} keywords")


if __name__ == "__main__":
    # Test the filter
    filter_obj = SolarContentFilter(min_score=0.3)
    
    # Test text 1: Solar content
    solar_text = """
    Solar panels are an excellent way to generate clean energy. 
    The monocrystalline panels have higher efficiency than polycrystalline.
    In Sri Lanka, CEB offers net metering programs for rooftop solar installations.
    """
    
    # Test text 2: Non-solar content
    non_solar_text = """
    The movie was fantastic with great special effects.
    The actors performed wonderfully in this thriller.
    I would recommend this film to everyone who enjoys action movies.
    """
    
    # Test text 3: Mixed content
    mixed_text = """
    Our company offers various services including:
    - Solar panel installation with CEB approval
    - Wind turbine maintenance
    - General electrical work
    - Plumbing services
    
    For solar systems, we use monocrystalline panels with 25-year warranty.
    Our team can also help with your home renovations and painting.
    """
    
    print("Test 1: Pure Solar Content")
    _, _, relevant = filter_obj.filter_document(solar_text, {"filename": "test1.txt"})
    print(f"Result: {'✓ Relevant' if relevant else '✗ Not Relevant'}\n")
    
    print("Test 2: Non-Solar Content")
    _, _, relevant = filter_obj.filter_document(non_solar_text, {"filename": "test2.txt"})
    print(f"Result: {'✓ Relevant' if relevant else '✗ Not Relevant'}\n")
    
    print("Test 3: Mixed Content")
    filtered, meta, relevant = filter_obj.filter_document(mixed_text, {"filename": "test3.txt"})
    print(f"Result: {'✓ Relevant' if relevant else '✗ Not Relevant'}")
    if relevant:
        print(f"Reduction: {meta.get('reduction_percent', 0)}%")
        print(f"Filtered content:\n{filtered}")