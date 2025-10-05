import logging
import json
import requests


class NeoClient:
    BASE_URL = "https://api.nasa.gov/neo/rest/v1/"

    def __init__(self, api_key):
        if api_key is None:
            logging.warning("NeoClient requires a valid API key")
        self.api_key = api_key
        with open('hazardous_asteroid_list.json') as f:
            self.local_store = json.load(f)

    def url(self, path: str = None):
        pre = self.BASE_URL
        if path is not None:
            pre = pre + path
        return pre + f"?api_key={self.api_key}"

    def list(self, start_date=None, end_date=None, use_api=False):
        if not use_api:
            return self.local_store

        url = self.url("feed")
        if start_date:
            url = url + f"&start_date={start_date}"
        response = requests.get(url).json()
        neo = response["near_earth_objects"]
        computed_neo_objects = []
        for _, neo_objects in neo.items():
            for neo_object in neo_objects:
                # Filter out all non-hazardous
                if not neo_object.get("is_potentially_hazardous_asteroid", True):
                    continue
                computed_neo_objects.append({
                    "name": neo_object["name"],
                    "id": neo_object["id"],
                })
        return computed_neo_objects

    def get(self, key: str):
        url = self.url(f"neo/{key}")
        response = requests.get(url).json()
        return response
