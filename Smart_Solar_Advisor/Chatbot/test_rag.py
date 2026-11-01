import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent / "src"))

from config import Config
from rag.rag_system import SolarRAGSystem

def main():
    """Test RAG system"""
    print("\n" + "=" * 60)
    print("TESTING RAG SYSTEM")
    print("=" * 60)
    
    # Initialize
    config = Config()
    rag_system = SolarRAGSystem(config)
    
    # Get system info
    info = rag_system.get_system_info()
    print("\nSystem Information:")
    for key, value in info.items():
        print(f"  {key}: {value}")
    
    # Test questions
    test_questions = [
        "What are the benefits of solar energy?",
        "How much does a solar panel system cost?",
        "සූර්ය බලශක්තිය ගැන කියන්න"  # Tell me about solar energy in Sinhala
    ]
    
    print("\n" + "=" * 60)
    print("TESTING QUERIES")
    print("=" * 60)
    
    for question in test_questions:
        print(f"\n{'='*60}")
        print(f"Question: {question}")
        print(f"{'='*60}")
        
        response = rag_system.generate_response(question)
        
        print(f"\nLanguage Detected: {response['language']}")
        print(f"Context Chunks Used: {response['context_used']}")
        print(f"\nAnswer:\n{response['answer']}")
        
        print(f"\nSources:")
        for i, source in enumerate(response['sources'], 1):
            print(f"  {i}. {source['filename']} ({source['source_type']})")
        
        print("\n" + "-" * 60)

if __name__ == "__main__":
    main()