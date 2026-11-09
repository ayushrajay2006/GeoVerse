from langchain_core.messages import SystemMessage, HumanMessage, ToolMessage
import json
from tools.earth_engine_tools import get_sentinel2_ndvi_map, get_sentinel2_true_color_map
from tools.osm_tools import get_osm_amenity_count
from tools.elevation_tools import get_elevation_data

class DataRetrievalAgent:
    def __init__(self, llm):
        self.tools = [
            get_sentinel2_ndvi_map, 
            get_sentinel2_true_color_map,
            get_osm_amenity_count,
            get_elevation_data
        ]
        self.llm_with_tools = llm.bind_tools(self.tools)
        
        self.system_prompt = SystemMessage(content='''
You are the Data Retrieval Agent for GeoVerse. 
Based on the workflow plan, use your available tools to fetch actual Earth Observation data via Google Earth Engine, OpenStreetMap, or Open-Meteo DEM.
- If the plan involves vegetation, urban sprawl, or NDVI, use `get_sentinel2_ndvi_map`.
- If it asks for visual imagery, use `get_sentinel2_true_color_map`.
- If it asks for amenities (schools, hospitals, buildings), use `get_osm_amenity_count`.
- If it involves flood risk or terrain, use `get_elevation_data`.
IMPORTANT: You MUST extract the latitude and longitude from the user's location (e.g., Hyderabad is approx lat: 17.38, lon: 78.48).
Use a recent 3-month date range (e.g., '2023-01-01' to '2023-03-01').
After retrieving the data, provide a structured summary of what was retrieved.
''')

    def retrieve_data(self, plan_json: str) -> dict:
        prompt = f"Here is the workflow plan:\n{plan_json}\n\nPlease execute the required tools to retrieve the data."
        messages = [self.system_prompt, HumanMessage(content=prompt)]
        
        ai_msg = self.llm_with_tools.invoke(messages)
        messages.append(ai_msg)
        
        map_layers = []
        
        # Execute tools if requested by the LLM
        if hasattr(ai_msg, 'tool_calls') and ai_msg.tool_calls:
            for tool_call in ai_msg.tool_calls:
                selected_tool = next((t for t in self.tools if t.name == tool_call['name']), None)
                if selected_tool:
                    tool_result = selected_tool.invoke(tool_call['args'])
                    messages.append(ToolMessage(content=json.dumps(tool_result), tool_call_id=tool_call['id']))
                    
                    if isinstance(tool_result, dict) and "tile_url" in tool_result:
                        map_layers.append({
                            "name": tool_result.get("layer_name", "Sentinel-2 Layer"),
                            "url": tool_result["tile_url"]
                        })
            
            # Get the final summary after tool execution
            final_msg = self.llm_with_tools.invoke(messages)
            summary = final_msg.content
        else:
            summary = ai_msg.content
            
        return {
            "summary": summary,
            "map_layers": map_layers
        }
