"""
Dataset Processor - Process CSV and JSON datasets
Processes all datasets from data/datasets/ directory
"""

from pathlib import Path
import pandas as pd
import json
from datetime import datetime
from typing import List, Dict
import logging

from .content_filter import SolarContentFilter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DatasetProcessor:
    """Process datasets from data/datasets/ directory"""
    
    def __init__(self, dataset_dir: Path, output_dir: Path, enable_filtering: bool = True, min_score: float = 0.3):
        """
        Initialize dataset processor
        
        Args:
            dataset_dir: Directory containing CSV/JSON files
            output_dir: Directory to save metadata
            enable_filtering: Enable solar content filtering
            min_score: Minimum relevance score for filtering
        """
        self.dataset_dir = dataset_dir
        self.output_dir = output_dir
        self.processed_files = []
        self.enable_filtering = enable_filtering
        
        # Initialize content filter
        if enable_filtering:
            self.content_filter = SolarContentFilter(min_score=min_score)
            logger.info(f"Dataset Processor: Solar content filtering ENABLED (min_score={min_score})")
        else:
            self.content_filter = None
            logger.info("Dataset Processor: Content filtering DISABLED")
        
        # Ensure directories exist
        self.dataset_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def process_csv(self, csv_path: Path) -> Dict:
        """
        Process CSV file
        
        Args:
            csv_path: Path to CSV file
            
        Returns:
            Dictionary containing content and metadata
        """
        try:
            df = pd.read_csv(csv_path)
            
            # Convert DataFrame to text format for embedding
            # Each row becomes a descriptive text entry
            text_entries = []
            for idx, row in df.iterrows():
                # Create a readable text representation
                row_text = " | ".join([f"{col}: {val}" for col, val in row.items() if pd.notna(val)])
                text_entries.append(row_text)
            
            combined_text = "\n".join(text_entries)
            
            # Create metadata
            metadata = {
                "filename": csv_path.name,
                "filepath": str(csv_path.absolute()),
                "rows": len(df),
                "columns": list(df.columns),
                "column_count": len(df.columns),
                "processed_date": datetime.now().isoformat(),
                "source_type": "csv_dataset",
                "file_size": csv_path.stat().st_size
            }
            
            logger.info(f"✓ Processed CSV: {csv_path.name} ({len(df)} rows × {len(df.columns)} cols)")
            
            return {
                "content": combined_text,
                "metadata": metadata,
                "dataframe": df  # Keep original for advanced processing
            }
            
        except Exception as e:
            logger.error(f"✗ Error processing {csv_path.name}: {str(e)}")
            return None
    
    def process_json(self, json_path: Path) -> Dict:
        """
        Process JSON file
        
        Args:
            json_path: Path to JSON file
            
        Returns:
            Dictionary containing content and metadata
        """
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Convert JSON to readable text
            if isinstance(data, list):
                # List of objects
                text_entries = []
                for item in data:
                    if isinstance(item, dict):
                        item_text = " | ".join([f"{k}: {v}" for k, v in item.items()])
                        text_entries.append(item_text)
                    else:
                        text_entries.append(str(item))
                combined_text = "\n".join(text_entries)
                item_count = len(data)
            elif isinstance(data, dict):
                # Single object or nested structure
                combined_text = json.dumps(data, indent=2, ensure_ascii=False)
                item_count = len(data.keys())
            else:
                combined_text = str(data)
                item_count = 1
            
            # Create metadata
            metadata = {
                "filename": json_path.name,
                "filepath": str(json_path.absolute()),
                "item_count": item_count,
                "processed_date": datetime.now().isoformat(),
                "source_type": "json_dataset",
                "file_size": json_path.stat().st_size,
                "data_type": type(data).__name__
            }
            
            logger.info(f"✓ Processed JSON: {json_path.name} ({item_count} items)")
            
            return {
                "content": combined_text,
                "metadata": metadata,
                "raw_data": data  # Keep original for advanced processing
            }
            
        except Exception as e:
            logger.error(f"✗ Error processing {json_path.name}: {str(e)}")
            return None
    
    def process_excel(self, excel_path: Path) -> Dict:
        """
        Process Excel file (XLSX)
        
        Args:
            excel_path: Path to Excel file
            
        Returns:
            Dictionary containing content and metadata
        """
        try:
            # Read all sheets
            excel_file = pd.ExcelFile(excel_path)
            all_text_entries = []
            sheet_info = []
            
            for sheet_name in excel_file.sheet_names:
                df = pd.read_excel(excel_path, sheet_name=sheet_name)
                
                # Add sheet header
                all_text_entries.append(f"=== Sheet: {sheet_name} ===")
                
                # Convert rows to text
                for idx, row in df.iterrows():
                    row_text = " | ".join([f"{col}: {val}" for col, val in row.items() if pd.notna(val)])
                    all_text_entries.append(row_text)
                
                sheet_info.append({
                    "name": sheet_name,
                    "rows": len(df),
                    "columns": len(df.columns)
                })
            
            combined_text = "\n".join(all_text_entries)
            
            # Create metadata
            metadata = {
                "filename": excel_path.name,
                "filepath": str(excel_path.absolute()),
                "sheets": sheet_info,
                "sheet_count": len(excel_file.sheet_names),
                "processed_date": datetime.now().isoformat(),
                "source_type": "excel_dataset",
                "file_size": excel_path.stat().st_size
            }
            
            logger.info(f"✓ Processed Excel: {excel_path.name} ({len(excel_file.sheet_names)} sheets)")
            
            return {
                "content": combined_text,
                "metadata": metadata
            }
            
        except Exception as e:
            logger.error(f"✗ Error processing {excel_path.name}: {str(e)}")
            return None
    
    def process_all_datasets(self) -> List[Dict]:
        """
        Process all dataset files (CSV, JSON, XLSX)
        
        Returns:
            List of processed documents
        """
        if not self.dataset_dir.exists():
            logger.warning(f"Dataset directory not found: {self.dataset_dir}")
            return []
        
        csv_files = list(self.dataset_dir.glob("*.csv"))
        json_files = list(self.dataset_dir.glob("*.json"))
        excel_files = list(self.dataset_dir.glob("*.xlsx"))
        
        if not csv_files and not json_files and not excel_files:
            logger.warning(f"No dataset files found in {self.dataset_dir}")
            return []
        
        logger.info(f"Found {len(csv_files)} CSV, {len(json_files)} JSON, {len(excel_files)} Excel files")
        
        processed_data = []
        
        # Process CSV files
        for csv_file in csv_files:
            result = self.process_csv(csv_file)
            if result:
                processed_data.append(result)
                self.processed_files.append(csv_file.name)
        
        # Process JSON files
        for json_file in json_files:
            result = self.process_json(json_file)
            if result:
                processed_data.append(result)
                self.processed_files.append(json_file.name)
        
        # Process Excel files
        for excel_file in excel_files:
            result = self.process_excel(excel_file)
            if result:
                processed_data.append(result)
                self.processed_files.append(excel_file.name)
        
        # Save processing summary
        self._save_processing_summary()
        
        logger.info(f"Successfully processed {len(processed_data)} dataset files")
        
        return processed_data
    
    def _save_processing_summary(self):
        """Save processing summary"""
        summary = {
            "processed_date": datetime.now().isoformat(),
            "total_files": len(self.processed_files),
            "files": self.processed_files,
            "processor": "DatasetProcessor"
        }
        
        summary_path = self.output_dir / "dataset_processing_summary.json"
        with open(summary_path, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Summary saved to {summary_path}")


if __name__ == "__main__":
    # Test the processor
    from pathlib import Path
    
    base_dir = Path(__file__).parent.parent.parent
    dataset_dir = base_dir / "data" / "datasets"
    output_dir = base_dir / "data" / "processed" / "metadata"
    
    processor = DatasetProcessor(dataset_dir, output_dir)
    results = processor.process_all_datasets()
    
    print(f"\nProcessed {len(results)} dataset files")
    for result in results:
        print(f"  - {result['metadata']['filename']}: {result['metadata']['source_type']}")