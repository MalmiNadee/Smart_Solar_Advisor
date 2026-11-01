"""
Text Chunker - Split documents into smaller chunks for embedding
Simple implementation without external dependencies
"""

import re
import json
import uuid
from pathlib import Path
from typing import List, Dict
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TextChunker:
    """Split text into smaller chunks for processing"""
    
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        """
        Initialize text chunker
        
        Args:
            chunk_size: Maximum size of each chunk in characters
            chunk_overlap: Number of characters to overlap between chunks
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        
        # Ensure overlap is less than chunk size
        if self.chunk_overlap >= self.chunk_size:
            self.chunk_overlap = self.chunk_size // 4
            logger.warning(f"Overlap too large, adjusted to {self.chunk_overlap}")
    
    def split_text(self, text: str) -> List[str]:
        """
        Split text into chunks with overlap
        
        Args:
            text: Text to split
            
        Returns:
            List of text chunks
        """
        if not text:
            return []
        
        text = text.strip()
        
        # If text is smaller than chunk size, return as single chunk
        if len(text) <= self.chunk_size:
            return [text]
        
        chunks = []
        start = 0
        text_length = len(text)
        
        while start < text_length:
            # Calculate end position
            end = min(start + self.chunk_size, text_length)
            
            # If this is not the last chunk, try to break at sentence boundary
            if end < text_length:
                # Look for sentence endings in the last part of the chunk
                search_start = max(start, end - 200)  # Look back up to 200 chars
                chunk_segment = text[search_start:min(end + 100, text_length)]
                
                # Find sentence boundaries
                sentence_endings = []
                for pattern in ['. ', '.\n', '? ', '! ', '\n\n']:
                    pos = chunk_segment.rfind(pattern)
                    if pos != -1:
                        sentence_endings.append(search_start + pos + len(pattern))
                
                # Use the last sentence boundary if found
                if sentence_endings:
                    best_end = max(sentence_endings)
                    if best_end > start + self.chunk_size // 2:  # Only if it's reasonable
                        end = best_end
                else:
                    # No sentence boundary, try word boundary
                    chunk_text = text[start:end]
                    last_space = chunk_text.rfind(' ')
                    if last_space > self.chunk_size // 2:
                        end = start + last_space
            
            # Extract chunk
            chunk = text[start:end].strip()
            
            # Only add non-empty chunks
            if chunk and len(chunk) > 10:  # Skip very small chunks
                chunks.append(chunk)
            
            # Calculate next start position with overlap
            # Make sure we always move forward
            next_start = end - self.chunk_overlap
            
            # Ensure we're making progress
            if next_start <= start:
                next_start = end
            
            # If we've processed everything, break
            if end >= text_length:
                break
            
            start = next_start
            
            # Safety check: prevent infinite loops
            if len(chunks) > 1000:
                logger.error("Too many chunks generated, stopping to prevent memory issues")
                break
        
        return chunks
    
    def chunk_documents(self, documents: List[Dict]) -> List[Dict]:
        """
        Chunk multiple documents
        
        Args:
            documents: List of document dictionaries with 'text' and 'metadata'
            
        Returns:
            List of chunked documents with updated metadata
        """
        chunked_docs = []
        
        for i, doc in enumerate(documents):
            text = doc.get('text', '')
            metadata = doc.get('metadata', {})
            
            if not text or len(text.strip()) < 10:
                logger.warning(f"Skipping document {i+1}: empty or too short")
                continue
            
            logger.info(f"Chunking document {i+1}/{len(documents)}: {metadata.get('filename', 'unknown')} ({len(text)} chars)")
            
            try:
                # Split text into chunks
                chunks = self.split_text(text)
                
                logger.info(f"  → Created {len(chunks)} chunks")
                
                # Create document for each chunk with unique ID
                for j, chunk in enumerate(chunks):
                    chunk_id = str(uuid.uuid4())  # Generate unique ID
                    
                    chunked_doc = {
                        'chunk_id': chunk_id,  # Add unique ID
                        'text': chunk,
                        'metadata': {
                            **metadata,
                            'chunk_index': j,
                            'total_chunks': len(chunks),
                            'chunk_size': len(chunk),
                            'chunk_id': chunk_id  # Also in metadata for consistency
                        }
                    }
                    chunked_docs.append(chunked_doc)
            
            except Exception as e:
                logger.error(f"Error chunking document {i+1}: {str(e)}")
                # Continue with next document
                continue
        
        logger.info(f"✓ Created {len(chunked_docs)} total chunks from {len(documents)} documents")
        
        return chunked_docs
    
    def get_chunking_stats(self, chunks: List[Dict]) -> Dict:
        """
        Calculate statistics about the chunks
        
        Args:
            chunks: List of chunk dictionaries with 'text' and 'metadata'
            
        Returns:
            Dictionary with chunking statistics
        """
        if not chunks:
            return {
                'total_chunks': 0,
                'avg_chunk_size': 0,
                'min_chunk_size': 0,
                'max_chunk_size': 0,
                'total_characters': 0
            }
        
        chunk_sizes = [len(chunk['text']) for chunk in chunks]
        
        stats = {
            'total_chunks': len(chunks),
            'avg_chunk_size': round(sum(chunk_sizes) / len(chunk_sizes)),
            'min_chunk_size': min(chunk_sizes),
            'max_chunk_size': max(chunk_sizes),
            'total_characters': sum(chunk_sizes)
        }
        
        return stats
    
    def save_chunks(self, chunks: List[Dict], output_dir: Path):
        """
        Save chunks to JSON file
        
        Args:
            chunks: List of chunk dictionaries
            output_dir: Directory to save chunks file
        """
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        output_file = output_dir / "text_chunks.json"
        
        # Prepare data for saving
        data = {
            'total_chunks': len(chunks),
            'chunk_size': self.chunk_size,
            'chunk_overlap': self.chunk_overlap,
            'chunks': chunks
        }
        
        # Save to JSON
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        logger.info(f"✓ Saved {len(chunks)} chunks to {output_file}")
    
    def load_chunks(self, chunks_file: Path) -> List[Dict]:
        """
        Load chunks from JSON file
        
        Args:
            chunks_file: Path to chunks JSON file
            
        Returns:
            List of chunk dictionaries
        """
        chunks_file = Path(chunks_file)
        
        if not chunks_file.exists():
            logger.error(f"Chunks file not found: {chunks_file}")
            return []
        
        with open(chunks_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        chunks = data.get('chunks', [])
        
        # Add chunk_id if missing (for backward compatibility)
        for chunk in chunks:
            if 'chunk_id' not in chunk:
                chunk['chunk_id'] = str(uuid.uuid4())
                if 'metadata' in chunk:
                    chunk['metadata']['chunk_id'] = chunk['chunk_id']
        
        logger.info(f"✓ Loaded {len(chunks)} chunks from {chunks_file}")
        
        return chunks
    
    def smart_chunk_by_sections(self, text: str, metadata: Dict) -> List[Dict]:
        """
        Smart chunking that preserves section structure
        Better for documents with clear sections/headers
        
        Args:
            text: Text to chunk
            metadata: Document metadata
            
        Returns:
            List of chunks with metadata
        """
        # Detect sections based on headers
        section_patterns = [
            r'\n#{1,6}\s+(.+)\n',  # Markdown headers
            r'\n([A-Z][A-Za-z\s]{3,50})\n',  # Capitalized headers
            r'\n\d+\.\s+(.+)\n',  # Numbered sections
        ]
        
        # Split into sections
        sections = []
        current_section = ""
        
        for line in text.split('\n'):
            is_header = any(re.match(pattern, '\n' + line + '\n') for pattern in section_patterns)
            
            if is_header and current_section:
                # Save previous section
                if current_section.strip():
                    sections.append(current_section.strip())
                current_section = line + '\n'
            else:
                current_section += line + '\n'
        
        # Save last section
        if current_section.strip():
            sections.append(current_section.strip())
        
        # Now chunk large sections
        chunks = []
        for i, section in enumerate(sections):
            chunk_id = str(uuid.uuid4())
            
            if len(section) <= self.chunk_size:
                # Section fits in one chunk
                chunks.append({
                    'chunk_id': chunk_id,
                    'text': section,
                    'metadata': {
                        **metadata,
                        'chunk_id': chunk_id,
                        'chunk_index': len(chunks),
                        'section_index': i,
                        'is_complete_section': True
                    }
                })
            else:
                # Split large section
                section_chunks = self.split_text(section)
                for j, chunk in enumerate(section_chunks):
                    section_chunk_id = str(uuid.uuid4())
                    chunks.append({
                        'chunk_id': section_chunk_id,
                        'text': chunk,
                        'metadata': {
                            **metadata,
                            'chunk_id': section_chunk_id,
                            'chunk_index': len(chunks),
                            'section_index': i,
                            'section_chunk': j,
                            'is_complete_section': False
                        }
                    })
        
        return chunks


if __name__ == "__main__":
    # Test the chunker
    chunker = TextChunker(chunk_size=500, chunk_overlap=100)
    
    test_text = """
# Solar Energy Benefits

Solar energy is a clean, renewable source of power. In Sri Lanka, 
solar installations are becoming increasingly popular due to high 
electricity costs and abundant sunshine.

## Economic Benefits

Installing solar panels can reduce your electricity bill by 40-70%. 
The typical payback period is 4-6 years. After that, you enjoy 
free electricity for 15-20 years.

## Environmental Benefits

Solar energy reduces carbon emissions and helps combat climate change. 
Each kilowatt of solar power prevents approximately 1.5 tons of CO2 
emissions per year.

## CEB Net Metering

The Ceylon Electricity Board offers net metering programs. This allows 
you to sell excess energy back to the grid and receive credits on 
your electricity bill.
""" * 3  # Repeat to make it longer
    
    print("Testing Basic Chunking:")
    print(f"Input text length: {len(test_text)} characters")
    
    try:
        chunks = chunker.split_text(test_text)
        print(f"✓ Created {len(chunks)} chunks")
        
        for i, chunk in enumerate(chunks[:3]):  # Show first 3
            print(f"\nChunk {i+1} ({len(chunk)} chars):")
            preview = chunk[:150].replace('\n', ' ')
            print(f"  {preview}...")
    except Exception as e:
        print(f"✗ Error: {str(e)}")
    
    print("\n" + "=" * 60)
    print("Testing Document Chunking:")
    
    docs = [
        {
            'text': test_text,
            'metadata': {'filename': 'test.txt', 'source_type': 'website'}
        }
    ]
    
    try:
        chunked = chunker.chunk_documents(docs)
        print(f"✓ Created {len(chunked)} document chunks")
        
        # Check chunk IDs
        print(f"\nFirst chunk ID: {chunked[0]['chunk_id']}")
        print(f"Chunk has 'chunk_id' field: {'chunk_id' in chunked[0]}")
        
        # Test statistics
        stats = chunker.get_chunking_stats(chunked)
        print(f"\nChunking Statistics:")
        print(f"  Total chunks: {stats['total_chunks']}")
        print(f"  Avg chunk size: {stats['avg_chunk_size']} chars")
        print(f"  Min chunk size: {stats['min_chunk_size']} chars")
        print(f"  Max chunk size: {stats['max_chunk_size']} chars")
        print(f"  Total characters: {stats['total_characters']} chars")
        
        # Test save/load
        print("\nTesting Save/Load:")
        from pathlib import Path
        test_dir = Path("test_output")
        chunker.save_chunks(chunked, test_dir)
        loaded = chunker.load_chunks(test_dir / "text_chunks.json")
        print(f"✓ Loaded {len(loaded)} chunks")
        print(f"Loaded chunk has ID: {'chunk_id' in loaded[0]}")
        
        # Cleanup
        import shutil
        if test_dir.exists():
            shutil.rmtree(test_dir)
            print("✓ Cleaned up test files")
        
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        import traceback
        traceback.print_exc()