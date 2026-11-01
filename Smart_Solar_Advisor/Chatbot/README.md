# Smart Solar Advisor Chatbot

A domain-specific chatbot powered by RAG (Retrieval-Augmented Generation) for solar energy consultation in Sri Lanka.

## Features

- 🤖 **RAG-Powered**: Retrieval-Augmented Generation for accurate, context-aware responses
- 🌏 **Cross-lingual**: Supports both Sinhala and English
- 📚 **Multi-source Knowledge**: Processes PDFs, websites, and datasets
- 🎤 **Voice I/O**: Speak in Sinhala or English, get responses in the same language
- 🇱🇰 **Sri Lanka Focused**: Tailored for local solar regulations, incentives, and conditions

## Environment Setup Complete! ✅

Your development environment is now set up with:

- ✅ Python 3.12.3
- ✅ Virtual environment (`.venv`)
- ✅ All required packages installed
- ✅ Project folder structure created
- ✅ Configuration files ready

## Project Structure

```
Chatbot/
├── .env                    # Environment variables (API keys)
├── .env.example            # Example environment file
├── .gitignore              # Git ignore rules
├── config.py               # Configuration settings
├── requirements.txt        # Python dependencies
├── verify_installation.py  # Package verification script
│
├── data/                   # Data sources
│   ├── pdfs/              # PDF documents
│   ├── websites/          # Website HTML/text files
│   ├── datasets/          # CSV/JSON datasets
│   └── processed/         # Processed data (auto-generated)
│       ├── chunks/
│       └── metadata/
│
├── src/                    # Source code
│   ├── ingestion/         # Data processing pipeline
│   ├── embeddings/        # Embedding generation
│   ├── rag/              # RAG system
│   └── voice/            # Voice handling
│
├── vectordb/              # Vector database storage
└── models/                # Fine-tuned models
```

## Next Steps

### 1. Add Your Data Sources

Place your solar domain data in the appropriate folders:

- **PDFs**: `data/pdfs/` (e.g., solar regulations, technical specs)
- **Websites**: `data/websites/` (e.g., scraped HTML files)
- **Datasets**: `data/datasets/` (e.g., pricing data, installation records)

### 2. Ready to Code!

You can now start implementing the chatbot components:

1. **Data Processing Pipeline** - Extract and process your data sources
2. **Embedding Generation** - Create vector embeddings
3. **RAG System** - Build the retrieval and generation system
4. **Voice Capabilities** - Add speech input/output
5. **UI Development** - Create the Streamlit interface

## Running the Application

### Run Scripts

```bash
# Navigate to project
cd C:\Users\vihan\OneDrive\Desktop\Projects\SmartSolarAdvisor_25-26J-527\Chatbot

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Process data (after adding files to data/ folders)
python run_pipeline.py

# Test search
python test_search.py

#Get & Process data automatically from sources
python pipeline_runner.py

# Run web app (Pipeline run scheduled in app_simple.py)
python -m streamlit run app_simple.py

# Stop app
Ctrl + C
```

## Development Tips

- Always activate the virtual environment before working
- Keep your `.env` file secure (never commit it to Git)
- Add your data sources to the respective `data/` folders
- Test each component individually before integration

## Technologies Used

- **LangChain**: LLM application framework
- **ChromaDB**: Vector database for embeddings
- **Sentence Transformers**: Multilingual embeddings
- **OpenAI GPT**: Language model
- **Streamlit**: Web UI framework
- **PyPDF2**: PDF text extraction
- **BeautifulSoup**: Web scraping
- **gTTS**: Text-to-speech
- **SpeechRecognition**: Speech-to-text

---

**Ready to build your Solar AI Assistant! 🌞**
