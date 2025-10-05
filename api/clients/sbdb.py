from functools import lru_cache

import requests


class SBDBClient:
    BASE_URL = "https://ssd-api.jpl.nasa.gov/sbdb.api"

    def __init__(self):
        pass

    @lru_cache()
    def get(self, key: str):
        url = f"{self.BASE_URL}?sstr={key}"
        response = requests.get(url).json()
        if "message" in response and response["message"] == "specified object was not found":
            return None

        return response
