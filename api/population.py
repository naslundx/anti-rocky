import time

import requests
import shapely.geometry
import shapely.ops
import json


def circle_geojson(lon, lat, radius_meters, num_points=32):
    # approximate circle as polygon
    from pyproj import Geod
    geod = Geod(ellps="WGS84")
    # sample points around circle
    azs = list(range(0, 360, int(360 / num_points)))
    pts = []
    for az in azs:
        lon2, lat2, _ = geod.fwd(lon, lat, az, radius_meters)
        pts.append((lon2, lat2))
    # close polygon
    pts.append(pts[0])
    poly = shapely.geometry.Polygon(pts)
    return shapely.geometry.mapping(poly)


def get_population_worldpop(lon, lat, radius_m, year=2020, api_key=None):
    poly_geojson = circle_geojson(lon, lat, radius_m)
    params = {
        "dataset": "wpgppop",
        "year": year,
        "geojson": json.dumps(poly_geojson)
    }
    if api_key:
        params["key"] = api_key
    url = "https://api.worldpop.org/v1/services/stats"
    init_resp = requests.get(url, params=params)
    init_resp.raise_for_status()

    data = init_resp.json()
    task_id = data["taskid"]

    for _ in range(5):
        task_resp = requests.get(f"https://www.api.worldpop.org/v1/tasks/{task_id}").json()
        if task_resp["status"] == "finished":
            break
        time.sleep(1)

    return int(task_resp["data"]["total_population"])
