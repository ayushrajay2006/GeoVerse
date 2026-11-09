import requests
from langchain_core.tools import tool

@tool
def get_osm_amenity_count(lat: float, lon: float, radius: int, amenity_type: str) -> str:
    """
    Queries the free OpenStreetMap (OSM) Overpass API to count the number of specific amenities 
    (e.g., 'hospital', 'school', 'restaurant') within a given radius (in meters) of a location.
    Does not require an API key.
    """
    try:
        # Overpass QL query
        query = f"""
        [out:json];
        (
          node["amenity"="{amenity_type}"](around:{radius},{lat},{lon});
          way["amenity"="{amenity_type}"](around:{radius},{lat},{lon});
          relation["amenity"="{amenity_type}"](around:{radius},{lat},{lon});
        );
        out count;
        """
        response = requests.get("http://overpass-api.de/api/interpreter", params={'data': query})
        response.raise_for_status()
        data = response.json()
        
        # The 'out count' returns elements with tags count
        count = data.get("elements", [{}])[0].get("tags", {}).get("nodes", 0) + \
                data.get("elements", [{}])[0].get("tags", {}).get("ways", 0) + \
                data.get("elements", [{}])[0].get("tags", {}).get("relations", 0)
                
        return f"Found {count} {amenity_type}(s) within a {radius}m radius of {lat}, {lon} using OpenStreetMap."
    except Exception as e:
        return f"Failed to query OpenStreetMap: {str(e)}"
