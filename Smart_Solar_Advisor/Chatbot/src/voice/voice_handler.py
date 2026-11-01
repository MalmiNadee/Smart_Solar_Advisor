"""
Voice input and output handler with language detection
"""
import streamlit as st
import speech_recognition as sr
from gtts import gTTS
import tempfile
import os
import logging
from typing import Optional, Tuple

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VoiceHandler:
    """Handle voice input and output with language detection"""
    
    def __init__(self):
        """Initialize voice handler"""
        self.recognizer = sr.Recognizer()
        
        # Supported languages for speech recognition
        self.language_codes = {
            'english': 'en-US',
            'sinhala': 'si-LK'
        }
        
        # For gTTS output
        self.tts_codes = {
            'english': 'en',
            'sinhala': 'si'
        }
        
    def detect_language_from_speech(self, audio_data) -> Tuple[Optional[str], Optional[str]]:
        """
        Try to recognize speech in both languages and determine which one worked
        
        Returns:
            Tuple of (detected_language, recognized_text)
        """
        # Try English first
        try:
            text_en = self.recognizer.recognize_google(audio_data, language='en-US')
            if text_en and len(text_en.strip()) > 0:
                logger.info(f"Recognized English: {text_en}")
                return ('english', text_en)
        except sr.UnknownValueError:
            logger.info("Could not recognize as English")
        except sr.RequestError as e:
            logger.error(f"English recognition error: {e}")
        
        # Try Sinhala
        try:
            text_si = self.recognizer.recognize_google(audio_data, language='si-LK')
            if text_si and len(text_si.strip()) > 0:
                logger.info(f"Recognized Sinhala: {text_si}")
                return ('sinhala', text_si)
        except sr.UnknownValueError:
            logger.info("Could not recognize as Sinhala")
        except sr.RequestError as e:
            logger.error(f"Sinhala recognition error: {e}")
        
        return (None, None)
    
    def listen_from_microphone(self, timeout: int = 5, phrase_time_limit: int = 10) -> Tuple[Optional[str], Optional[str]]:
        """
        Listen to microphone input and detect language
        
        Args:
            timeout: Seconds to wait for speech to start
            phrase_time_limit: Maximum seconds for the phrase
            
        Returns:
            Tuple of (detected_language, recognized_text)
        """
        try:
            with sr.Microphone() as source:
                logger.info("Adjusting for ambient noise...")
                self.recognizer.adjust_for_ambient_noise(source, duration=1)
                
                logger.info("Listening... Please speak now!")
                audio_data = self.recognizer.listen(
                    source, 
                    timeout=timeout, 
                    phrase_time_limit=phrase_time_limit
                )
                
                logger.info("Processing speech...")
                return self.detect_language_from_speech(audio_data)
                
        except sr.WaitTimeoutError:
            logger.warning("Listening timed out - no speech detected")
            return (None, None)
        except Exception as e:
            logger.error(f"Error listening to microphone: {str(e)}")
            return (None, None)
    
    def text_to_speech(self, text: str, language: str = 'english') -> Optional[str]:
        """
        Convert text to speech and return audio file path
        
        Args:
            text: Text to convert to speech
            language: Language of the text ('english' or 'sinhala')
            
        Returns:
            Path to temporary audio file or None if failed
        """
        try:
            # Get language code for gTTS
            lang_code = self.tts_codes.get(language, 'en')
            
            # Create gTTS object
            tts = gTTS(text=text, lang=lang_code, slow=False)
            
            # Save to temporary file
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.mp3')
            tts.save(temp_file.name)
            
            logger.info(f"Generated speech audio: {temp_file.name}")
            return temp_file.name
            
        except Exception as e:
            logger.error(f"Error generating speech: {str(e)}")
            return None
    
    def cleanup_audio_file(self, filepath: str):
        """Delete temporary audio file"""
        try:
            if filepath and os.path.exists(filepath):
                os.remove(filepath)
                logger.info(f"Cleaned up audio file: {filepath}")
        except Exception as e:
            logger.error(f"Error cleaning up audio file: {str(e)}")