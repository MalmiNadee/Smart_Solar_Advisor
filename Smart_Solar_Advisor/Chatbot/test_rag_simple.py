import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent / "src"))

from config import Config
from embeddings.embeddings_handler import EmbeddingsHandler

def is_solar_related(text: str, query: str) -> bool:
    """Check if the text is actually related to solar energy"""
    solar_keywords = [
        'solar', 'panel', 'photovoltaic', 'pv', 'energy', 'electricity',
        'renewable', 'inverter', 'battery', 'grid', 'metering', 'ceb',
        'sun', 'irradiance', 'monocrystalline', 'polycrystalline', 
        'efficiency', 'watt', 'kw', 'installation', 'system'
    ]
    
    text_lower = text.lower()
    query_lower = query.lower()
    
    has_solar_content = any(keyword in text_lower for keyword in solar_keywords)
    query_is_solar = any(keyword in query_lower for keyword in solar_keywords)
    
    return has_solar_content and query_is_solar

def generate_answer_from_chunks(query: str, documents: list, metadatas: list) -> dict:
    """Generate a comprehensive answer by combining multiple relevant chunks"""
    
    # Filter only solar-related documents
    solar_docs = []
    solar_meta = []
    
    for doc, meta in zip(documents, metadatas):
        if is_solar_related(doc, query):
            solar_docs.append(doc)
            solar_meta.append(meta)
    
    if not solar_docs:
        return {
            "answer": "❌ I don't have enough relevant information about that topic in my solar energy database.",
            "sources": [],
            "chunks_used": 0
        }
    
    # Combine the most relevant chunks into a cohesive answer
    answer_parts = []
    sources = []
    
    # Use up to 3 most relevant chunks
    for i, (doc, meta) in enumerate(zip(solar_docs[:3], solar_meta[:3])):
        # Extract relevant sections
        sections = doc.split('\n\n')
        query_words = set(query.lower().split())
        
        # Find most relevant section
        best_section = doc
        max_overlap = 0
        
        for section in sections:
            if len(section.strip()) < 50:
                continue
            section_words = set(section.lower().split())
            overlap = len(query_words & section_words)
            if overlap > max_overlap:
                max_overlap = overlap
                best_section = section
        
        if best_section.strip():
            answer_parts.append(best_section.strip())
        
        # Track sources
        source_info = {
            "filename": meta.get('filename', 'Unknown'),
            "source_type": meta.get('source_type', 'Unknown')
        }
        if 'page_number' in meta:
            source_info['page'] = meta['page_number']
        
        sources.append(source_info)
    
    # Combine answer parts
    final_answer = "\n\n".join(answer_parts)
    
    return {
        "answer": final_answer,
        "sources": sources,
        "chunks_used": len(answer_parts)
    }

def main():
    """Test simplified RAG system without LLM"""
    print("\n" + "=" * 60)
    print("TESTING SIMPLE RAG SYSTEM (No LLM)")
    print("=" * 60)
    
    config = Config()
    
    # Initialize embeddings handler
    embeddings_handler = EmbeddingsHandler(
        model_name=config.EMBEDDING_MODEL,
        db_path=str(config.VECTORDB_DIR)
    )
    
    # Get system info
    info = embeddings_handler.get_collection_info()
    print("\nSystem Information:")
    print(f"  Collection: {info['collection_name']}")
    print(f"  Total chunks: {info['total_chunks']}")
    print(f"  Model: {info['model']}")
    
    # Test questions
    test_questions = [
        "What are the benefits of solar energy?",
        "How much does a solar panel system cost?",
        "What is net metering?",
        "Tell me about monocrystalline vs polycrystalline panels",
        "What services do you offer?",
    ]
    
    print("\n" + "=" * 60)
    print("TESTING QUERIES")
    print("=" * 60)
    
    for question in test_questions:
        print(f"\n{'='*60}")
        print(f"Question: {question}")
        print(f"{'='*60}")
        
        # Search for relevant chunks
        results = embeddings_handler.search(question, n_results=5)
        
        # Generate answer from chunks
        response = generate_answer_from_chunks(
            question,
            results['documents'][0],
            results['metadatas'][0]
        )
        
        print(f"\nChunks Used: {response['chunks_used']}")
        print(f"\n💡 Answer:\n")
        print(response['answer'])
        
        if response['sources']:
            print(f"\n📚 Sources:")
            for i, source in enumerate(response['sources'], 1):
                source_str = f"  {i}. {source['filename']} ({source['source_type']})"
                if 'page' in source:
                    source_str += f" - Page {source['page']}"
                print(source_str)
        
        print("\n" + "-" * 60)
    
    # Interactive mode
    print("\n" + "=" * 60)
    print("INTERACTIVE MODE")
    print("=" * 60)
    print("Enter your questions (or 'quit' to exit)\n")
    
    while True:
        query = input("Question: ").strip()
        
        if query.lower() in ['quit', 'exit', 'q']:
            break
        
        if not query:
            continue
        
        # Search and generate answer
        results = embeddings_handler.search(query, n_results=5)
        response = generate_answer_from_chunks(
            query,
            results['documents'][0],
            results['metadatas'][0]
        )
        
        print(f"\n💡 Answer:\n")
        print(response['answer'])
        
        if response['sources']:
            print(f"\n📚 Sources:")
            for i, source in enumerate(response['sources'], 1):
                source_str = f"  {i}. {source['filename']} ({source['source_type']})"
                if 'page' in source:
                    source_str += f" - Page {source['page']}"
                print(source_str)
        
        print("\n" + "-" * 60 + "\n")

if __name__ == "__main__":
    main()