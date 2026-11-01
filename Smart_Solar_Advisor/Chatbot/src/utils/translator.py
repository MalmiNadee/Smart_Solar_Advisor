from deep_translator import GoogleTranslator
from langdetect import detect, DetectorFactory
import logging
import re

# Set seed for consistent language detection
DetectorFactory.seed = 0

logger = logging.getLogger(__name__)

class LanguageTranslator:
    def __init__(self):
        self.sinhala_to_english = GoogleTranslator(source='si', target='en')
        self.english_to_sinhala = GoogleTranslator(source='en', target='si')
    
    def is_sinhala(self, text: str) -> bool:
        """Check if text contains Sinhala characters"""
        # Sinhala Unicode range: U+0D80 to U+0DFF
        sinhala_pattern = re.compile(r'[\u0D80-\u0DFF]')
        return bool(sinhala_pattern.search(text))
    
    def detect_language(self, text: str) -> str:
        """Detect if text is in Sinhala or English"""
        # First check for Sinhala characters (most reliable)
        if self.is_sinhala(text):
            return 'sinhala'
        
        # If no Sinhala characters, try langdetect
        try:
            lang = detect(text)
            if lang == 'si':
                return 'sinhala'
            return 'english'
        except Exception as e:
            logger.warning(f"Language detection failed: {str(e)}, defaulting to English")
            return 'english'
    
    def translate_to_english(self, text: str) -> str:
        """Translate Sinhala text to English for search"""
        try:
            if self.detect_language(text) == 'sinhala':
                translated = self.sinhala_to_english.translate(text)
                logger.info(f"Translated query: {text} -> {translated}")
                return translated
            return text
        except Exception as e:
            logger.error(f"Translation error: {str(e)}")
            return text
    
    def translate_to_sinhala(self, text: str) -> str:
        """Translate English answer to Sinhala"""
        try:
            # Translate the full text in a single request to avoid
            # making one HTTP call per sentence (which blocks Streamlit).
            # Google Translate handles up to ~5000 chars per request.
            MAX_CHARS = 4500
            if len(text) <= MAX_CHARS:
                return self.english_to_sinhala.translate(text)

            # Only split when the text genuinely exceeds the limit.
            paragraphs = text.split('\n\n')
            translated_paragraphs = []
            for para in paragraphs:
                if not para.strip():
                    continue
                try:
                    translated_paragraphs.append(self.english_to_sinhala.translate(para))
                except Exception as e:
                    logger.warning(f"Failed to translate paragraph: {str(e)}")
                    translated_paragraphs.append(para)
            return '\n\n'.join(translated_paragraphs)
        except Exception as e:
            logger.error(f"Translation error: {str(e)}")
            return text