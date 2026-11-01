"""
Generate structured datasets for solar information
"""
import json
from pathlib import Path
import logging
from typing import Dict, List

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatasetGenerator:
    """Generate structured solar datasets"""
    
    def __init__(self, config):
        self.config = config
    
    def generate_solar_benefits_dataset(self) -> List[Dict]:
        """Generate solar benefits question-answer pairs"""
        benefits_data = [
            {
                "question": "What are the main benefits of solar energy?",
                "answer": "Solar energy offers several key benefits: 1) Reduces electricity bills by 50-90%, 2) Environmentally friendly with zero emissions, 3) Low maintenance costs, 4) Increases property value, 5) Energy independence from grid outages, 6) Government incentives available in Sri Lanka, 7) Long lifespan of 25+ years.",
                "category": "benefits",
                "language": "english"
            },
            {
                "question": "How much can I save on electricity bills with solar panels?",
                "answer": "In Sri Lanka, homeowners typically save 50-90% on electricity bills. A typical 5kW system can save LKR 5,000-15,000 per month depending on energy consumption and sunlight exposure.",
                "category": "savings",
                "language": "english"
            },
            {
                "question": "Are solar panels environmentally friendly?",
                "answer": "Yes, solar panels are highly environmentally friendly. They produce zero emissions during operation, reduce carbon footprint significantly, and help combat climate change. A typical residential solar system offsets 3-4 tons of CO2 annually.",
                "category": "environment",
                "language": "english"
            },
            {
                "question": "What is the lifespan of solar panels?",
                "answer": "Quality solar panels typically last 25-30 years with minimal degradation. Most manufacturers provide 25-year performance warranties. After 25 years, panels still operate at 80-85% efficiency.",
                "category": "durability",
                "language": "english"
            },
            {
                "question": "Do solar panels work on cloudy days?",
                "answer": "Yes, solar panels work on cloudy days but at reduced efficiency (10-25% of normal output). Sri Lanka's tropical climate ensures good solar generation year-round despite occasional clouds.",
                "category": "performance",
                "language": "english"
            }
        ]
        
        return benefits_data
    
    def generate_solar_costs_dataset(self) -> List[Dict]:
        """Generate solar cost information"""
        costs_data = [
            {
                "question": "How much does a residential solar system cost in Sri Lanka?",
                "answer": "In Sri Lanka, a typical residential solar system costs: 3kW system: LKR 600,000-900,000, 5kW system: LKR 1,000,000-1,500,000, 10kW system: LKR 2,000,000-3,000,000. Prices include panels, inverter, installation, and net metering setup.",
                "category": "pricing",
                "language": "english"
            },
            {
                "question": "What is the payback period for solar panels in Sri Lanka?",
                "answer": "The payback period for solar systems in Sri Lanka is typically 5-7 years. With rising electricity costs and available incentives, some systems pay back in as little as 4-5 years.",
                "category": "roi",
                "language": "english"
            },
            {
                "question": "Are there financing options for solar panels?",
                "answer": "Yes, several banks in Sri Lanka offer solar financing: Bank of Ceylon, Commercial Bank, Sampath Bank provide loans at 8-12% interest. Some solar companies offer in-house financing. Government subsidies may also be available.",
                "category": "financing",
                "language": "english"
            },
            {
                "question": "What maintenance costs should I expect?",
                "answer": "Solar panels require minimal maintenance. Annual costs: Panel cleaning: LKR 5,000-10,000/year, Inverter replacement (after 10-15 years): LKR 100,000-200,000. Overall maintenance is very low compared to savings.",
                "category": "maintenance",
                "language": "english"
            }
        ]
        
        return costs_data
    
    def generate_technical_dataset(self) -> List[Dict]:
        """Generate technical information dataset"""
        technical_data = [
            {
                "question": "What is the difference between monocrystalline and polycrystalline panels?",
                "answer": "Monocrystalline panels: 18-22% efficiency, black appearance, more expensive, better for limited space. Polycrystalline panels: 15-17% efficiency, blue appearance, more affordable, good for larger roofs. Both last 25+ years.",
                "category": "panel_types",
                "language": "english"
            },
            {
                "question": "What is net metering?",
                "answer": "Net metering allows you to sell excess solar energy back to CEB. Your meter runs backward when exporting power. You get credits at the same rate you buy electricity. This maximizes savings and ROI in Sri Lanka.",
                "category": "net_metering",
                "language": "english"
            },
            {
                "question": "What size solar system do I need for my home?",
                "answer": "Calculate based on monthly consumption: 200-300 units/month: 3kW system, 300-500 units/month: 5kW system, 500-800 units/month: 7-10kW system. A solar expert can design the optimal size for your needs.",
                "category": "sizing",
                "language": "english"
            },
            {
                "question": "Do I need batteries with my solar system?",
                "answer": "Batteries are optional for grid-tied systems. On-grid with net metering: Batteries not required, saves costs. Off-grid systems: Batteries essential. Hybrid systems: Batteries provide backup power during outages. Battery costs add LKR 200,000-500,000.",
                "category": "batteries",
                "language": "english"
            }
        ]
        
        return technical_data
    
    def save_datasets(self):
        """Generate and save all datasets"""
        dataset_dir = self.config.DATASET_DIR
        dataset_dir.mkdir(parents=True, exist_ok=True)
        
        datasets = {
            'solar_benefits.json': self.generate_solar_benefits_dataset(),
            'solar_costs.json': self.generate_solar_costs_dataset(),
            'solar_technical.json': self.generate_technical_dataset()
        }
        
        for filename, data in datasets.items():
            filepath = dataset_dir / filename
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            logger.info(f"✅ Generated: {filename} ({len(data)} entries)")
        
        logger.info(f"\n📁 All datasets saved to: {dataset_dir}")