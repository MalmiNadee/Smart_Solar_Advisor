"""
Conversation management for the chatbot
"""
import re
from typing import Dict, List, Optional
from datetime import datetime

class ConversationManager:
    """Manage conversation flow and context"""
    
    def __init__(self):
        """Initialize conversation manager"""
        self.greetings = [
            'hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon',
            'good evening', 'howdy', 'hola', 'namaste',
            'හායි', 'හලෝ', 'ආයුබෝවන්', 'සුභ උදෑසනක්', 'සුභ සන්ධ්‍යාවක්'
        ]
        
        self.farewells = [
            'bye', 'goodbye', 'see you', 'farewell', 'take care', 'later',
            'බායි', 'ගුඩ්බායි', 'යන්නම්', 'ආයෙ හම්බෙමු'
        ]
        
        self.thanks = [
            'thank', 'thanks', 'appreciate', 'grateful',
            'ස්තූතියි', 'ස්තූති', 'ඔබට ස්තූතියි', 'බොහොම ස්තූතියි'
        ]
        
        self.affirmations = [
            'yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'right', 'correct',
            'ඔව්', 'හරි', 'ඔව් ඇත්තටම', 'ඔව් හරි'
        ]
        
        self.negations = [
            'no', 'nope', 'not really', 'nah',
            'නැහැ', 'එපා', 'නෑ'
        ]
        
        self.help_requests = [
            'help', 'assist', 'guide', 'support', 'how to use', 'what can you do',
            'උදව්', 'උදව් කරන්න', 'මට උදව් කරන්න'
        ]
    
    def detect_intent(self, message: str) -> str:
        """
        Detect user intent from message
        
        Returns: greeting, farewell, thanks, help, question, affirmation, negation, chitchat
        """
        message_lower = message.lower().strip()
        
        # Check for greetings
        if any(greeting in message_lower for greeting in self.greetings):
            return 'greeting'
        
        # Check for farewells
        if any(farewell in message_lower for farewell in self.farewells):
            return 'farewell'
        
        # Check for thanks
        if any(thank in message_lower for thank in self.thanks):
            return 'thanks'
        
        # Check for help requests
        if any(help_word in message_lower for help_word in self.help_requests):
            return 'help'
        
        # Check for affirmations
        if any(aff in message_lower for aff in self.affirmations):
            return 'affirmation'
        
        # Check for negations
        if any(neg in message_lower for neg in self.negations):
            return 'negation'
        
        # Check for questions (has question words or ends with ?)
        question_words = ['what', 'why', 'how', 'when', 'where', 'who', 'which', 'can', 'do', 'does', 'is', 'are',
                         'මොකක්ද', 'ඇයි', 'කොහොමද', 'කවදාද', 'කොහෙද', 'කවුද', 'පුළුවන්ද']
        has_question_word = any(word in message_lower for word in question_words)
        ends_with_question = message.strip().endswith('?')
        
        if has_question_word or ends_with_question:
            return 'question'
        
        # Check for chitchat (short informal messages)
        if len(message.split()) <= 5 and not any(char.isdigit() for char in message):
            chitchat_patterns = [
                'how are you', 'how do you do', 'whats up', "what's up",
                'කොහොමද', 'ඔයා කොහොමද', 'මොකද හාල්'
            ]
            if any(pattern in message_lower for pattern in chitchat_patterns):
                return 'chitchat'
        
        # Default to question for solar-related content
        return 'question'
    
    def generate_greeting_response(self, is_sinhala: bool = False) -> str:
        """Generate a greeting response"""
        if is_sinhala:
            return """හායි! මම ඔබේ Smart Solar Advisor! 🌞

මට ඔබට උදව් කළ හැක්කේ:
• සූර්ය බලශක්ති පද්ධති ගැන තොරතුරු
• වියදම් සහ ඉතිරි කිරීම් ගැනය
• ස්ථාපන ක්‍රියාවලිය
• තාක්ෂණික විශේෂාංග
• ශ්‍රී ලංකාවේ බලාගාරික්තිය

සූර්ය බලශක්තිය ගැන ඔබට මොනවා දැනගන්න ඕනේද? 😊"""
        else:
            return """Hi there! I'm your Smart Solar Advisor! 🌞

I can help you with:
• Solar energy system information
• Costs and savings estimates
• Installation process
• Technical specifications
• Net metering in Sri Lanka

What would you like to know about solar energy? 😊"""
    
    def generate_farewell_response(self, is_sinhala: bool = False) -> str:
        """Generate a farewell response"""
        if is_sinhala:
            return """බොහොම ස්තූතියි සූර්ය බලශක්තිය ගැන අදහස් විචාර කිරීම ගැන! 🌞

ඔබට තවත් ප්‍රශ්න ඇත්නම්, ඕනෑම වෙලාවක ආපසු එන්න. හොඳ දවසක්! බායි! 👋"""
        else:
            return """Thank you for exploring solar energy with me! 🌞

Feel free to come back anytime you have more questions. Have a great day! Goodbye! 👋"""
    
    def generate_thanks_response(self, is_sinhala: bool = False) -> str:
        """Generate a thanks response"""
        if is_sinhala:
            return """කමක් නෑ! ඔබට උදව් කිරීමට මට සතුටුයි! 😊

තවත් ප්‍රශ්න තියෙනවද? සූර්ය බලශක්තිය ගැන තවත් මොනවාද දැනගන්න ඕනේ?"""
        else:
            return """You're very welcome! I'm happy to help! 😊

Do you have any other questions? What else would you like to know about solar energy?"""
    
    def generate_help_response(self, is_sinhala: bool = False) -> str:
        """Generate a help response"""
        if is_sinhala:
            return """මට ඔබට සූර්ය බලශක්තිය ගැන සහාය වීමට සතුටුයි! 🌞

**මම පිළිතුරු දෙන්නේ:**
• සූර්ය පැනල පද්ධති ගැන
• වියදම් සහ මිල ගණන්
• ස්ථාපන කිරීම සහ නඩත්තුව
• ශුද්ධ මීටරය
• ශ්‍රී ලංකාවේ දිරි දීමනා
• තාක්ෂණික විස්තර

**උදාහරණ ප්‍රශ්න:**
- "සූර්ය බලශක්තියේ ප්‍රතිලාභ මොනවාද?"
- "සූර්ය පැනල පද්ධතියක මිල කීයද?"
- "ශුද්ධ මීටරය යනු කුමක්ද?"

ඔබේ ප්‍රශ්නය අවශය තරම් විචාරන්න! 😊"""
        else:
            return """I'm here to help you with solar energy information! 🌞

**I can answer questions about:**
• Solar panel systems
• Costs and pricing
• Installation and maintenance
• Net metering
• Government incentives in Sri Lanka
• Technical specifications

**Example questions:**
- "What are the benefits of solar energy?"
- "How much does a solar system cost?"
- "What is net metering?"

Feel free to ask me anything! 😊"""
    
    def generate_chitchat_response(self, message: str, is_sinhala: bool = False) -> str:
        """Generate a chitchat response"""
        message_lower = message.lower()
        
        # How are you responses
        if any(phrase in message_lower for phrase in ['how are you', 'කොහොමද', 'කොහොමද ඉන්නේ']):
            if is_sinhala:
                return """මම හොඳින්! ස්තූතියි අහන්න! 😊

සූර්ය බලශක්තිය ගැන ඔබට උදව් කරන්න මම සූදානම්. ඔබට මොනවා දැනගන්න ඕනේද?"""
            else:
                return """I'm doing great, thank you for asking! 😊

I'm ready to help you learn about solar energy. What would you like to know?"""
        
        # Default chitchat
        if is_sinhala:
            return """මම Smart Solar Advisor, ඔබේ සූර්ය බලශක්ති සහායක! 🌞

සූර්ය පැනල, වියදම්, ස්ථාපනය, හෝ ශ්‍රී ලංකාවේ සූර්ය බලශක්තිය ගැන ප්‍රශ්න අහන්න. මම උදව් කරන්නම්! 😊"""
        else:
            return """I'm the Smart Solar Advisor, your solar energy assistant! 🌞

Ask me questions about solar panels, costs, installation, or solar energy in Sri Lanka. I'm here to help! 😊"""
    
    def generate_affirmation_response(self, context: Optional[str] = None, is_sinhala: bool = False) -> str:
        """Generate response to user affirmation"""
        if is_sinhala:
            return """හොඳයි! තවත් මොනවාද දැනගන්න ඕනේ?

සූර්ය බලශක්තිය ගැන තවත් ප්‍රශ්න අහන්න. 😊"""
        else:
            return """Great! What else would you like to know?

Feel free to ask more questions about solar energy. 😊"""
    
    def generate_fallback_response(self, is_sinhala: bool = False) -> str:
        """Generate fallback response for unclear messages"""
        if is_sinhala:
            return """මට ඔබේ ප්‍රශ්නය හරියටම තේරුණේ නැහැ. 🤔

සූර්ය බලශක්තිය ගැන නිශ්චිත ප්‍රශ්නයක් අහන්න, උදාහරණයක් විදියට:
- "සූර්ය පැනල පද්ධතියක මිල කීයද?"
- "සූර්ය බලශක්තියේ ප්‍රතිලාභ මොනවාද?"
- "ශුද්ධ මීටරය යනු කුමක්ද?"

හෝ "උදව්" ලෙස ටයිප් කරන්න තව තොරතුරු සඳහා! 😊"""
        else:
            return """I'm not quite sure what you're asking. 🤔

Please ask a specific question about solar energy, for example:
- "How much does a solar panel system cost?"
- "What are the benefits of solar energy?"
- "What is net metering?"

Or type "help" for more information! 😊"""