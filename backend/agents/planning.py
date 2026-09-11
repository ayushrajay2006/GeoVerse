import json
from langchain_core.messages import SystemMessage, HumanMessage
from pydantic import BaseModel, Field
from typing import List

class WorkflowStep(BaseModel):
    action: str = Field(description="The action to perform, e.g., 'retrieve_data', 'analyze', 'visualize'")
    description: str = Field(description="Detailed description of the action")

class SpatialWorkflow(BaseModel):
    is_spatial_query: bool = Field(description="True if the user is asking a geospatial question, False if it is a general conversation or greeting")
    objective: str = Field(description="The interpreted spatial objective of the user")
    steps: List[WorkflowStep] = Field(description="The sequence of steps to fulfill the objective")
    datasets_needed: List[str] = Field(description="List of datasets required (e.g., 'Sentinel-2', 'OSM roads')")

class PlanningAgent:
    def __init__(self, llm):
        self.llm = llm
        self.system_prompt = SystemMessage(content='''
You are the Planning Agent for GeoVerse, an Agentic GIS-Based Spatial Decision Support System.
Your job is to interpret a user's natural language geospatial query and outline a step-by-step workflow to solve it.
Identify the main spatial objective, the datasets required (e.g., Sentinel-2, OpenStreetMap, Google Earth Engine layers),
and the exact analysis steps required (e.g., land-use classification, change detection, buffer analysis).
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
