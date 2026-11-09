import json
from langchain_core.messages import SystemMessage, HumanMessage
from pydantic import BaseModel, Field
from typing import List

class WorkflowStep(BaseModel):
    action: str = Field(description="The action to perform, e.g., 'retrieve_data', 'analyze', 'visualize'")
    description: str = Field(description="Detailed description of the action")

class SpatialWorkflow(BaseModel):
    is_spatial_query: bool = Field(description="True if the user is asking a geospatial question")
    objective: str = Field(description="The interpreted spatial objective of the user")
    steps: List[WorkflowStep] = Field(description="The sequence of steps to fulfill the objective")
    datasets_needed: List[str] = Field(description="List of datasets required")
    target_region_name: str = Field(default="", description="CRITICAL: The exact name of the city, state, or country mentioned (e.g. 'Hyderabad', 'Kerala'). Return empty string if no region is mentioned.")
    center_lat: float = Field(description="CRITICAL: The exact latitude of the city or region mentioned. You MUST provide a float estimate (e.g. Hyderabad is 17.3850). If no location is mentioned, return 0.0.")
    center_lon: float = Field(description="CRITICAL: The exact longitude of the city or region mentioned. You MUST provide a float estimate (e.g. Hyderabad is 78.4867). If no location is mentioned, return 0.0.")

class PlanningAgent:
    def __init__(self, llm):
        self.llm = llm
        self.system_prompt = SystemMessage(content='''
You are the Planning Agent for GeoVerse, an Agentic GIS-Based Spatial Decision Support System.
Your job is to interpret a user's natural language geospatial query and outline a step-by-step workflow to solve it.

You have access to the "TECTONIC" Architecture stack of Free/Open Datasets:
- Satellite: Sentinel-1 SAR, Sentinel-2, Landsat (via Google Earth Engine/Copernicus)
- Water & Hydrology: CWC / NWIC, USGS Water Data, JRC Global Surface Water
- Weather/Rainfall: IMD, Open-Meteo, NASA POWER, CHIRPS
- Population: WorldPop, GHSL
- Disasters: NASA FIRMS (Fires), NASA EONET, GDACS, USGS Earthquake API
- Infrastructure/POI: OpenStreetMap (Overpass API)
- Terrain/Elevation: SRTM, Copernicus DEM, Open-Meteo DEM
- Land Cover: ESA WorldCover
- Air Quality: OpenAQ

When deciding `datasets_needed`, exclusively select the most relevant datasets from the TECTONIC list above.
Identify the exact analysis steps required (e.g., Random Forest classification, change detection, buffer analysis).
Respond purely with JSON matching the expected structure.
''')

    def create_plan(self, user_query: str) -> str:
        # We enforce JSON output format
        try:
            llm_with_structured_output = self.llm.with_structured_output(SpatialWorkflow)
            result = llm_with_structured_output.invoke([self.system_prompt, HumanMessage(content=user_query)])
            return result.model_dump_json(indent=2)
        except Exception as e:
            # Fallback if with_structured_output fails with the current model
            response = self.llm.invoke([
                self.system_prompt,
                HumanMessage(content=f"Query: {user_query}\n\nRespond strictly with JSON containing: is_spatial_query (boolean), objective, steps (array of action and description), and datasets_needed.")
            ])
            return response.content
