"""Retrieval-Augmented Generation system modules"""

# Try to import SolarRAGSystem only if langchain is available
try:
    from .rag_system import SolarRAGSystem
    __all__ = ['SolarRAGSystem']
except ImportError:
    # langchain not available, skip SolarRAGSystem
    __all__ = []

# Always make answer_generator available
from .answer_generator import AnswerGenerator
__all__.append('AnswerGenerator')
