import os
from langchain_core.messages import HumanMessage
# Assuming Groq for fast, free inference (or swap with ChatOllama for local)
from langchain_groq import ChatGroq

def get_llm():
    # If using Groq (Free Tier):
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY is not set. Please set it in your .env file.")
    
    # We use the flagship openai/gpt-oss-120b which is available and fully supported on Groq
    # Added max_retries=5 to automatically handle 429 Rate Limit (8000 TPM) errors
    return ChatGroq(temperature=0, model_name="openai/gpt-oss-120b", groq_api_key=api_key, max_retries=5)

class GeoVerseAgent:
    def __init__(self):
        try:
            self.llm = get_llm()
            self.is_ready = True
        except ValueError as e:
            self.llm = None
            self.is_ready = False
            self.error_msg = str(e)
            
    def process_query(self, query: str, mode: str = "professional") -> dict:
        if not self.is_ready:
            return {
                "reply": "⚠️ **System Not Ready:** Real execution requires an LLM. Please add your `GROQ_API_KEY` to the `.env` file to run the actual Agentic GIS pipeline.",
                "map_layers": []
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
            final_report = decision_agent.generate_report(plan_json, data_summary, analysis_result, validation_result, mode)
            
            # Extract coordinates for map fly-to
            focus_location = None
            target_region = None
            try:
                plan_data = json.loads(plan_json)
                target_region = plan_data.get("target_region_name")
                lat = plan_data.get("center_lat")
                lon = plan_data.get("center_lon")
                if lat is not None and lon is not None:
                    focus_location = {"lat": float(lat), "lng": float(lon)}
            except:
                pass
            
            return {
                "reply": final_report,
                "map_layers": map_layers,
                "focus_location": focus_location,
                "target_region": target_region
            }
        except Exception as e:
            return {
                "reply": f"An error occurred during agent orchestration: {str(e)}",
                "map_layers": []
            }
