import requests
from langchain_core.tools import tool

@tool
def get_elevation_data(lat: float, lon: float) -> str:
    """
    Queries the free Open-Meteo Elevation API to get the Digital Elevation Model (DEM) altitude 
    in meters above sea level for a specific coordinate. Useful for flood risk assessment.
    Does not require an API key.
    """
    try:
        url = f"https://api.open-meteo.com/v1/elevation?latitude={lat}&longitude={lon}"
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        
        elevation = data.get("elevation", [])
        if elevation:
            return f"The elevation at {lat}, {lon} is {elevation[0]} meters above sea level (based on open DEM data)."
        return "Elevation data not found for these coordinates."
    except Exception as e:
        return f"Failed to query Elevation Data: {str(e)}"
