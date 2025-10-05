import geopandas as gpd
from shapely.geometry import Point


LAND_DATA = gpd.read_file("ne_110m_land.shp")


def is_on_land(lat, lon):
    point = Point(lon, lat)
    return LAND_DATA.contains(point).any()


def calculate_impact(data, lat ,lon):
    diameter = float(data["estimated_diameter"]["meters"]["estimated_diameter_max"])
    on_land = is_on_land(lat, lon)

    scale = 100 if on_land else 30

    return {
        "casualties": 0,
        "other": "Take cover",
        "circles": [
            {"lat": lat, "lon": lon, "radius": diameter*7*scale, "note": "less danger", "color": "yellow"},
            {"lat": lat, "lon": lon, "radius": diameter*3*scale, "note": "DANGER DANGER", "color": "red"},
        ]
    }
