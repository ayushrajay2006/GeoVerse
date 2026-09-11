import ee
from langchain_core.tools import tool

@tool
def get_sentinel2_ndvi_map(lat: float, lon: float, start_date: str, end_date: str) -> dict:
    """
    Fetches Sentinel-2 satellite imagery for a given location and date range, 
    computes the NDVI (Normalized Difference Vegetation Index), and returns a map tile URL.
    Args:
        lat: Latitude of the target area.
        lon: Longitude of the target area.
        start_date: Start date in YYYY-MM-DD format.
        end_date: End date in YYYY-MM-DD format.
    """
    try:
        ee.Initialize()
    except Exception as e:
        return {"error": "Google Earth Engine is not authenticated. Please run 'earthengine authenticate' in the terminal."}

    try:
        point = ee.Geometry.Point([lon, lat])
        
        # Load Sentinel-2 surface reflectance data.
        s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED') \
            .filterBounds(point) \
            .filterDate(start_date, end_date) \
            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
            
        if s2.size().getInfo() == 0:
            return {"error": "No Sentinel-2 imagery found for this location and date range with low cloud cover."}
            
        # Create a median composite
        image = s2.median()
        
        # Compute NDVI: (NIR - RED) / (NIR + RED) -> (B8 - B4) / (B8 + B4)
        ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
        
        # Get map tile URL
        vis_params = {
            'min': -0.1,
            'max': 0.8,
            'palette': ['blue', 'white', 'green']
        }
        
        map_id_dict = ee.Image(ndvi).getMapId(vis_params)
        tile_url = map_id_dict['tile_fetcher'].url_format
        
        return {
            "success": True,
            "layer_name": f"NDVI ({start_date} to {end_date})",
            "tile_url": tile_url,
            "center": [lat, lon]
        }
    except Exception as e:
        return {"error": str(e)}

@tool
def get_sentinel2_true_color_map(lat: float, lon: float, start_date: str, end_date: str) -> dict:
    """
    Fetches a true-color Sentinel-2 satellite image composite for a given location and date range
    and returns a map tile URL.
    Args:
        lat: Latitude of the target area.
        lon: Longitude of the target area.
        start_date: Start date in YYYY-MM-DD format.
        end_date: End date in YYYY-MM-DD format.
    """
    try:
        ee.Initialize()
    except Exception as e:
        return {"error": "Google Earth Engine is not authenticated."}

    try:
        point = ee.Geometry.Point([lon, lat])
        
        s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED') \
            .filterBounds(point) \
            .filterDate(start_date, end_date) \
            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
            
        image = s2.median()
        
        vis_params = {
            'bands': ['B4', 'B3', 'B2'],
            'min': 0,
            'max': 3000,
            'gamma': 1.4
        }
        
        map_id_dict = ee.Image(image).getMapId(vis_params)
        tile_url = map_id_dict['tile_fetcher'].url_format
        
        return {
            "success": True,
            "layer_name": f"True Color RGB ({start_date} to {end_date})",
            "tile_url": tile_url,
            "center": [lat, lon]
        }
    except Exception as e:
        return {"error": str(e)}
