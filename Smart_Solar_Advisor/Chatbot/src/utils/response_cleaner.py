"""Utility functions to clean and improve chatbot responses"""
import re
from typing import List, Dict

def clean_response(response: str) -> str:
    """
    Clean the response by removing citations, URLs, and unnecessary formatting.
    
    Args:
        response: Raw response text
        
    Returns:
        Cleaned response text
    """
    # Remove citations like [1], [2], [1,2,3]
    response = re.sub(r'\[[\d,\s]+\]', '', response)
    response = re.sub(r'\[\d+\]', '', response)
    
    # Remove URLs
    response = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', response)
    
    # Remove "Available :" patterns
    response = re.sub(r'\[online\]\s*Available\s*:', '', response, flags=re.IGNORECASE)
    
    # Remove file references like "file.pdf [23]"
    response = re.sub(r'[\w\-]+\.pdf\s*\[\d+\]', '', response)
    
    # Remove duplicate whitespace
    response = re.sub(r'\s+', ' ', response).strip()
    
    # Remove duplicate sentences
    sentences = response.split('. ')
    unique_sentences = []
    seen = set()
    
    for sentence in sentences:
        sentence_key = sentence.strip().lower()[:50]  # First 50 chars as key
        if sentence_key and sentence_key not in seen:
            seen.add(sentence_key)
            unique_sentences.append(sentence.strip())
    
    response = '. '.join(unique_sentences)
    
    return response

def clean_context(chunks: List[Dict]) -> str:
    """
    Clean and consolidate retrieved chunks for better context.
    
    Args:
        chunks: List of chunk dictionaries
        
    Returns:
        Cleaned and consolidated context string
    """
    cleaned_texts = []
    seen_texts = set()
    
    for chunk in chunks:
        text = chunk.get('text', '') if isinstance(chunk, dict) else str(chunk)
        
        # Remove citations and references
        text = re.sub(r'\[[\d,\s]+\]', '', text)
        text = re.sub(r'\[\d+\]', '', text)
        
        # Remove URLs
        text = re.sub(r'http[s]?://\S+', '', text)
        
        # Remove "Available :" patterns
        text = re.sub(r'\[online\]\s*Available\s*:', '', text, flags=re.IGNORECASE)
        
        # Remove duplicate whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Create fingerprint (first 100 chars)
        fingerprint = text[:100].lower()
        
        # Only add if meaningful content and not duplicate
        if len(text) > 50 and fingerprint not in seen_texts:
            seen_texts.add(fingerprint)
            cleaned_texts.append(text)
    
    # Limit to top 3 chunks for concise answers
    return '\n\n'.join(cleaned_texts[:3])