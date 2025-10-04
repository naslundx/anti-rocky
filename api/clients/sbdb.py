
import requests


class SBDBClient:
    BASE_URL = "https://ssd-api.jpl.nasa.gov/sbdb.api"

    def __init__(self):
        pass

    def get(self, neo_id: str):
        url = f"{self.BASE_URL}?sstr={neo_id}"
        response = requests.get(url).json()
        if "message" in response and response["message"] == "specified object was not found":
            return None

        return response
