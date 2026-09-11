import os
from langchain_core.messages import HumanMessage
# Assuming Groq for fast, free inference (or swap with ChatOllama for local)
from langchain_groq import ChatGroq

def get_llm():
    # If using Groq (Free Tier):
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY is not set. Please set it in your .env file.")
    
    # We use GPT OSS 120B as it is universally available on Groq and supports structured outputs
    return ChatGroq(temperature=0, model_name="openai/gpt-oss-120b", groq_api_key=api_key)

class GeoVerseAgent:
    def __init__(self):
        try:
            self.llm = get_llm()
            self.is_ready = True
        except ValueError as e:
            self.llm = None
            self.is_ready = False
            self.error_msg = str(e)
            
    def process_query(self, query: str) -> dict:
        if not self.is_ready:
            # MOCK MODE: If no API key is provided, return a beautifully formatted mock response 
            # to allow for UI testing and frontend development.
            import time
            time.sleep(1.5) # Simulate network latency
            
            mock_report = """# 🌍 Spatial Analysis Report

Based on your query: *"{}"*

### 1. Planning & Data Retrieval
The Planning Agent successfully orchestrated the workflow. The following datasets were retrieved via Google Earth Engine:
- **Sentinel-2 MultiSpectral Instrument (MSI)** (Level-2A)
- **OpenStreetMap (OSM)** Vector Road Networks

### 2. Geospatial Analysis
Our Analysis Agents performed a **Random Forest Classification** to detect urban sprawl and vegetation changes. 

> **Key Finding:** There is a **14.2% increase** in urban built-up area and a corresponding **8.5% decrease** in dense vegetation over the specified timeframe.

### 3. Validation
✅ **Validation Passed:** The detected changes are consistent with the spatial resolution of the Sentinel-2 imagery (10m).

### 💡 Recommendations
- **Urban Planning:** Consider implementing green corridors to mitigate the heat island effect caused by the 14.2% increase in concrete surfaces.
- **Further Analysis:** Run a hydrological model to see if this new urban sprawl affects local flood plains.

*Note: This is a simulated response because the Groq API Key was not found in `.env`.*
""".format(query)

            return {
                "reply": mock_report,
                "map_layers": [
                    {
                        "name": "Simulated NDVI Layer",
                        "url": "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                    }
                ]
            }
            
        # Import agents inside the class or module
        from agents.planning import PlanningAgent
        from agents.data_retrieval import DataRetrievalAgent
        from agents.analysis import AnalysisAgent
        from agents.validation import ValidationAgent
        from agents.decision_support import DecisionSupportAgent
        import json
        import re
        
        try:
            planning_agent = PlanningAgent(self.llm)
            data_agent = DataRetrievalAgent(self.llm)
            analysis_agent = AnalysisAgent(self.llm)
            validation_agent = ValidationAgent(self.llm)
            decision_agent = DecisionSupportAgent(self.llm)
            
            # Step 1: Planning
            plan_json = planning_agent.create_plan(query)
            
            # Fast-path for non-spatial queries (e.g., greetings, general chat)
            try:
                plan_dict = json.loads(plan_json)
                if not plan_dict.get("is_spatial_query", True):
                    response = self.llm.invoke([HumanMessage(content=query)])
                    return {
                        "reply": response.content,
                        "map_layers": []
                    }
            except Exception:
                pass # Proceed normally if JSON parsing fails
            
            # Step 2: Data Retrieval (Now returns a dict with 'summary' and 'map_layers')
            data_result = data_agent.retrieve_data(plan_json)
            data_summary = data_result.get("summary", "")
            map_layers = data_result.get("map_layers", [])
            
            # Step 3: Analysis
            analysis_result = analysis_agent.analyze(plan_json, data_summary)
            
            # Step 4: Validation
            validation_result = validation_agent.validate(plan_json, data_summary, analysis_result)
            
            # Step 5: Final Decision Support Report
            final_report = decision_agent.generate_report(plan_json, data_summary, analysis_result, validation_result)
            
            return {
                "reply": final_report,
                "map_layers": map_layers
            }
        except Exception as e:
            return {
                "reply": f"An error occurred during agent orchestration: {str(e)}",
                "map_layers": []
            }
