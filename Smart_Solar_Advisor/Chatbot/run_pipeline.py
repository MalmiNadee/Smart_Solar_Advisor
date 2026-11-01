"""
Run Pipeline - Execute the complete data processing pipeline
This is the main entry point for processing all data sources
"""

import sys
from pathlib import Path

# Add src to path
sys.path.append(str(Path(__file__).parent / "src"))

from config import Config
from ingestion.data_pipeline import DataPipeline
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


def main():
    """Run the complete data processing pipeline"""
    try:
        # Initialize configuration
        print("\n" + "=" * 70)
        print("SOLAR CHATBOT - DATA PROCESSING PIPELINE")
        print("=" * 70 + "\n")
        
        config = Config()
        
        # Validate configuration (if validate method exists)
        print("Validating configuration...")
        try:
            config.validate()
            print("✓ Configuration valid\n")
        except AttributeError:
            print("⚠ Config validation method not found, skipping...\n")
        
        # Create and run pipeline
        pipeline = DataPipeline(config)
        results = pipeline.run_full_pipeline()
        
        # Display final summary
        print("\n" + "=" * 70)
        print("PIPELINE SUMMARY")
        print("=" * 70)
        print(f"Documents processed: {len(results['documents'])}")
        print(f"Chunks created: {len(results['chunks'])}")
        print(f"Vector DB items: {results['collection_info']['total_chunks']}")
        print(f"Processed data location: {config.PROCESSED_DIR}")
        print(f"Vector DB location: {config.VECTORDB_DIR}")
        print("=" * 70)
        
        # Test search functionality
        print("\n" + "=" * 70)
        print("TESTING SEARCH FUNCTIONALITY")
        print("=" * 70)
        
        test_query = "What are the benefits of solar energy?"
        print(f"\nTest Query: '{test_query}'")
        
        search_results = pipeline.search(test_query, n_results=3)
        
        print(f"\nTop {len(search_results['documents'][0])} Results:")
        for i, doc in enumerate(search_results['documents'][0], 1):
            print(f"\n{i}. {doc[:200]}...")
            print(f"   Source: {search_results['metadatas'][0][i-1].get('filename', 'N/A')}")
        
        print("\n" + "=" * 70)
        print("✓ Pipeline completed successfully!")
        print("=" * 70 + "\n")
        
    except Exception as e:
        print(f"\n✗ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()