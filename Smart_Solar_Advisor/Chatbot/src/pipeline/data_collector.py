"""
Automated data collection from various solar energy sources
"""
import requests
from bs4 import BeautifulSoup
from pathlib import Path
import json
import logging
from typing import List, Dict
from datetime import datetime
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SolarDataCollector:
    """Collect solar energy data from various online sources"""
    
    def __init__(self, config):
        self.config = config
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        
        # Define solar-related sources specific to Sri Lanka
        self.sources = {
            'ceb_knowledge': [
                'https://ceb.lk/knowledge-hub',
                'https://ceb.lk/solar-power',
            ],
            'pucsl': [
                'https://www.pucsl.gov.lk/english/domestic-solar-power/',
                'https://www.pucsl.gov.lk/english/how-to-setup-a-solar-plant/',
            ],
            'sea': [
                'https://www.energy.gov.lk/',
            ],
            'iesl': [
                'https://www.iesl.lk/slen/',
            ],
            'solar_companies': [
                'https://hayleyssolar.com/',
                'https://hayleyssolar.com/solar-panels-solar-power-systems/',
                'https://hayleyssolar.com/about/',
                'https://hayleyssolar.com/insights/',
                'https://www.dimosolar.com/',
            ]
        }
        
        # Keywords to validate solar-related content
        self.solar_keywords = [
            'solar', 'photovoltaic', 'pv', 'panel', 'renewable', 'energy',
            'electricity', 'inverter', 'battery', 'net metering', 'grid',
            'installation', 'monocrystalline', 'polycrystalline', 'efficiency'
        ]
    
    def is_solar_content(self, text: str) -> bool:
        """Check if content is solar-related"""
        text_lower = text.lower()
        keyword_count = sum(1 for keyword in self.solar_keywords if keyword in text_lower)
        return keyword_count >= 3
    
    def fetch_webpage(self, url: str) -> Dict:
        """Fetch and parse a webpage"""
        try:
            logger.info(f"Fetching: {url}")
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style", "nav", "footer", "header"]):
                script.decompose()
            
            # Get text content
            text = soup.get_text(separator=' ', strip=True)
            
            # Clean up whitespace
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            text = ' '.join(chunk for chunk in chunks if chunk)
            
            # Validate solar content
            if not self.is_solar_content(text):
                logger.warning(f"Non-solar content detected, skipping: {url}")
                return None
            
            return {
                'url': url,
                'title': soup.title.string if soup.title else 'No Title',
                'content': text,
                'fetched_at': datetime.now().isoformat(),
                'word_count': len(text.split())
            }
            
        except Exception as e:
            logger.error(f"Error fetching {url}: {str(e)}")
            return None
    
    def collect_all_sources(self) -> List[Dict]:
        """Collect data from all configured sources"""
        all_data = []
        
        for category, urls in self.sources.items():
            logger.info(f"\n{'='*50}")
            logger.info(f"Collecting from category: {category}")
            logger.info(f"{'='*50}")
            
            for url in urls:
                data = self.fetch_webpage(url)
                if data:
                    data['category'] = category
                    all_data.append(data)
                
                # Be respectful - wait between requests
                time.sleep(2)
        
        return all_data
    
    def save_collected_data(self, data: List[Dict]):
        """Save collected data to files"""
        if not data:
            logger.warning("No data to save")
            return
        
        # Save individual HTML files
        website_dir = self.config.WEBSITE_DIR
        website_dir.mkdir(parents=True, exist_ok=True)
        
        for item in data:
            # Create safe filename
            safe_title = "".join(c for c in item['title'] if c.isalnum() or c in (' ', '-', '_')).strip()
            safe_title = safe_title[:100]  # Limit length
            filename = f"{safe_title}.txt"
            filepath = website_dir / filename
            
            # Save content
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(f"URL: {item['url']}\n")
                f.write(f"Title: {item['title']}\n")
                f.write(f"Category: {item['category']}\n")
                f.write(f"Fetched: {item['fetched_at']}\n")
                f.write(f"{'='*80}\n\n")
                f.write(item['content'])
            
            logger.info(f"Saved: {filename}")
        
        # Save metadata
        metadata_file = self.config.DATA_DIR / "collection_metadata.json"
        metadata = {
            'collection_date': datetime.now().isoformat(),
            'total_sources': len(data),
            'categories': list(self.sources.keys()),
            'sources': [{'url': item['url'], 'title': item['title'], 'category': item['category']} for item in data]
        }
        
        with open(metadata_file, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"\n✅ Collected {len(data)} sources")
        logger.info(f"📁 Saved to: {website_dir}")