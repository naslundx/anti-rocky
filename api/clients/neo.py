import logging

import requests

class NeoClient:
    BASE_URL = "https://api.nasa.gov/neo/rest/v1/feed?api_key=%s"

    def __init__(self, api_key):
        if api_key is None:
            logging.warning("NeoClient requires a valid API key")
        self.api_key = api_key

    @property
    def url(self):
        return self.BASE_URL % self.api_key

    def list(self, start_date=None, end_date=None):
        response = requests.get(self.url).json()
        neo = response["near_earth_objects"]
        computed_neo_objects = []
        for _, neo_objects in neo.items():
            for neo_object in neo_objects:
                computed_neo_objects.append({
                    "name": neo_object["name"],
                    "id": neo_object["id"],
                })
        return computed_neo_objects
