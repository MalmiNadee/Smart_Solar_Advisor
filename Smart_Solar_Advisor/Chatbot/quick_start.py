"""
Quick Start Script for Smart Solar Advisor Chatbot
Checks environment and guides you through next steps
"""

import sys
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def print_header(text):
    """Print formatted header"""
    print("\n" + "=" * 60)
    print(f"  {text}")
    print("=" * 60)

def check_api_key():
    """Check if OpenAI API key is configured"""
    api_key = os.getenv("OPENAI_API_KEY", "")
    
    if not api_key or api_key == "your_openai_api_key_here":
        print("❌ OpenAI API key not configured")
        print("\n📝 TO FIX:")
        print("   1. Open the .env file")
        print("   2. Replace 'your_openai_api_key_here' with your actual API key")
        print("   3. Get your key from: https://platform.openai.com/api-keys")
        return False
    else:
        print("✅ OpenAI API key configured")
        return True

def check_data_sources():
    """Check if data sources are available"""
    base_dir = Path(__file__).parent
    pdf_dir = base_dir / "data" / "pdfs"
    web_dir = base_dir / "data" / "websites"
    dataset_dir = base_dir / "data" / "datasets"
    
    pdf_count = len(list(pdf_dir.glob("*.pdf"))) if pdf_dir.exists() else 0
    web_count = len(list(web_dir.glob("*.html"))) + len(list(web_dir.glob("*.txt"))) if web_dir.exists() else 0
    dataset_count = len(list(dataset_dir.glob("*.csv"))) + len(list(dataset_dir.glob("*.json"))) if dataset_dir.exists() else 0
    
    total = pdf_count + web_count + dataset_count
    
    if total == 0:
        print("⚠️  No data sources found")
        print("\n📝 TO FIX:")
        print("   Add your solar domain data to these folders:")
        print(f"   - PDFs: {pdf_dir}")
        print(f"   - Websites: {web_dir}")
        print(f"   - Datasets: {dataset_dir}")
        return False
    else:
        print(f"✅ Data sources found: {total} files")
        print(f"   - PDFs: {pdf_count}")
        print(f"   - Websites: {web_count}")
        print(f"   - Datasets: {dataset_count}")
        return True

def show_next_steps():
    """Show next development steps"""
    print_header("NEXT STEPS")
    
    print("\n📋 Development Roadmap:\n")
    
    steps = [
        ("1. Data Processing", "Create the data ingestion pipeline to process your PDFs, websites, and datasets"),
        ("2. Embeddings", "Generate multilingual embeddings and store them in ChromaDB"),
        ("3. RAG System", "Build the retrieval and generation system with domain-specific prompts"),
        ("4. Voice I/O", "Add speech-to-text and text-to-speech capabilities"),
        ("5. UI", "Create the Streamlit interface for user interaction"),
    ]
    
    for title, description in steps:
        print(f"   {title}")
        print(f"      → {description}\n")

def main():
    """Run quick start checks"""
    print_header("SMART SOLAR ADVISOR - QUICK START")
    
    print("\n🔍 Checking your setup...\n")
    
    # Check 1: API Key
    api_ok = check_api_key()
    
    # Check 2: Data Sources
    print()
    data_ok = check_data_sources()
    
    # Summary
    print_header("SETUP STATUS")
    
    if api_ok and data_ok:
        print("\n🎉 Great! Your environment is ready to start development!")
        show_next_steps()
    elif api_ok and not data_ok:
        print("\n⚠️  Environment is ready, but you need to add data sources")
        print("   Add PDFs, websites, or datasets to the data/ folder")
        show_next_steps()
    elif not api_ok and data_ok:
        print("\n⚠️  Data sources ready, but API key needs configuration")
        print("   Add your OpenAI API key to the .env file")
    else:
        print("\n📝 Setup incomplete - follow the instructions above")
        print("\n💡 Once you've added the API key and data sources,")
        print("   run this script again: python quick_start.py")
    
    print("\n📚 For detailed instructions, see:")
    print("   - SETUP_GUIDE.md")
    print("   - README.md")
    print()

if __name__ == "__main__":
    main()