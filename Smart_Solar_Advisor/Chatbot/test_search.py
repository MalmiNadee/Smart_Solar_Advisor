import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent / "src"))

from config import Config
from embeddings.embeddings_handler import EmbeddingsHandler
from utils.translator import LanguageTranslator

def is_solar_related(text: str, query: str) -> bool:
    """Check if the text is actually related to solar energy"""
    solar_keywords = [
        'solar', 'panel', 'photovoltaic', 'pv', 'energy', 'electricity',
        'renewable', 'inverter', 'battery', 'grid', 'metering', 'ceb',
        'sun', 'irradiance', 'monocrystalline', 'polycrystalline', 
        'efficiency', 'watt', 'kw', 'installation', 'system', 'power',
        'benefit', 'advantage', 'cost', 'price', 'saving', 'rooftop'
    ]
    
    text_lower = text.lower()
    query_lower = query.lower()
    
    # Check if text or query contains solar-related keywords
    has_solar_content = any(keyword in text_lower for keyword in solar_keywords)
    query_is_solar = any(keyword in query_lower for keyword in solar_keywords)
    
    return has_solar_content or query_is_solar

def extract_answer(text: str, query: str) -> str:
    """Extract the most relevant part of the text as an answer"""
    # Split into sections
    sections = text.split('\n\n')
    
    # Find the section most relevant to the query
    query_words = set(query.lower().split())
    
    best_section = text
    max_overlap = 0
    
    for section in sections:
        if len(section.strip()) < 50:  # Skip very short sections
            continue
        section_words = set(section.lower().split())
        overlap = len(query_words & section_words)
        if overlap > max_overlap:
            max_overlap = overlap
            best_section = section
    
    return best_section.strip()

def main():
    """Test search functionality with bilingual support"""
    config = Config()
    
    # Initialize embeddings handler and translator
    embeddings_handler = EmbeddingsHandler(
        model_name=config.EMBEDDING_MODEL,
        db_path=str(config.VECTORDB_DIR)
    )
    
    translator = LanguageTranslator()
    
    # Get collection info
    info = embeddings_handler.get_collection_info()
    print(f"\nVector Database Info:")
    print(f"  Collection: {info['collection_name']}")
    print(f"  Total chunks: {info['total_chunks']}")
    print(f"  Model: {info['model']}")
    
    # Interactive search
    print("\n" + "=" * 60)
    print("Solar Knowledge Search (English & සිංහල)")
    print("=" * 60)
    print("Enter your questions in English or Sinhala (or 'quit' to exit)\n")
    
    while True:
        query = input("Question: ").strip()
        
        if query.lower() in ['quit', 'exit', 'q']:
            break
        
        if not query:
            continue
        
        # Detect language
        query_language = translator.detect_language(query)
        original_query = query
        
        print(f"\n🔄 Detected: {query_language.title()}")
        
        # Translate to English if Sinhala
        if query_language == 'sinhala':
            query = translator.translate_to_english(query)
            print(f"📝 Translated: {original_query} → {query}")
        
        # Search
        results = embeddings_handler.search(query, n_results=5)
        
        # Check if we have results
        distances = results.get('distances', [[]])[0]
        documents = results.get('documents', [[]])[0]
        metadatas = results.get('metadatas', [[]])[0]
        
        if not distances or not documents:
            no_answer = "I don't have any information to answer that question."
            if query_language == 'sinhala':
                no_answer = translator.translate_to_sinhala(no_answer)
            print(f"\n❌ {no_answer}")
            print("Please ask questions related to solar energy, solar panels, or renewable energy.\n")
            print("-" * 60 + "\n")
            continue
        
        # Debug: Show distances
        print(f"\n[Debug] Distance range: {min(distances):.4f} to {max(distances):.4f}")
        
        # For Sinhala queries, be very lenient
        if query_language == 'sinhala':
            # Accept any document with basic solar keywords
            basic_keywords = ['solar', 'panel', 'energy', 'sun', 'renewable', 'power']
            
            found_answer = False
            for i, (doc, distance) in enumerate(zip(documents, distances)):
                if any(keyword in doc.lower() for keyword in basic_keywords):
                    # Extract and translate answer
                    answer = extract_answer(doc, query)
                    
                    print(f"\n💡 Answer (English):\n{answer}\n")
                    
                    # Translate to Sinhala
                    print("🔄 Translating to Sinhala...")
                    sinhala_answer = translator.translate_to_sinhala(answer)
                    print(f"\n💡 පිළිතුර (සිංහල):\n{sinhala_answer}\n")
                    
                    # Show source
                    metadata = metadatas[i]
                    print(f"\n📄 Source: {metadata.get('filename', 'N/A')}")
                    if 'page_number' in metadata:
                        print(f"📖 Page: {metadata['page_number']}")
                    print(f"📊 Distance: {distance:.4f}")
                    
                    found_answer = True
                    break
            
            if not found_answer:
                no_answer = "I don't have relevant solar energy information."
                sinhala_no_answer = translator.translate_to_sinhala(no_answer)
                print(f"\n❌ {sinhala_no_answer}")
        else:
            # English queries - use stricter matching
            found_answer = False
            best_distance = distances[0]
            
            for i, (doc, distance) in enumerate(zip(documents, distances)):
                # Use relative distance
                is_close_enough = (distance <= best_distance * 1.2)
                
                if is_close_enough and is_solar_related(doc, query):
                    # Found a relevant answer
                    print(f"\n💡 Answer:\n")
                    answer = extract_answer(doc, query)
                    print(f"{answer}\n")
                    
                    # Show source
                    metadata = metadatas[i]
                    print(f"\n📄 Source: {metadata.get('filename', 'N/A')}")
                    if 'page_number' in metadata:
                        print(f"📖 Page: {metadata['page_number']}")
                    
                    # Show confidence
                    if i == 0:
                        confidence = "Very High (Top Match)"
                    elif i == 1:
                        confidence = "High (2nd Match)"
                    else:
                        confidence = "Medium (3rd+ Match)"
                    print(f"🎯 Confidence: {confidence}")
                    print(f"📊 Distance: {distance:.4f}")
                    
                    # Show additional related chunks
                    print(f"\n📚 Additional Information:\n")
                    shown_count = 0
                    for j, (other_doc, other_dist) in enumerate(zip(documents, distances)):
                        if j != i and is_solar_related(other_doc, query):
                            if shown_count >= 2:  # Limit to 2 additional chunks
                                break
                            print(f"• {other_doc[:150]}...")
                            other_metadata = metadatas[j]
                            print(f"  📄 Source: {other_metadata.get('filename', 'N/A')}\n")
                            shown_count += 1
                    
                    found_answer = True
                    break
            
            if not found_answer:
                print("\n❌ I don't have enough relevant information about that topic.")
                print("I can only answer questions about:")
                print("  • Solar panel types and efficiency")
                print("  • Solar energy benefits")
                print("  • Solar installation and pricing in Sri Lanka")
                print("  • CEB net metering programs")
                print("  • Solar system components (inverters, batteries, etc.)\n")
        
        print("-" * 60 + "\n")

if __name__ == "__main__":
    main()