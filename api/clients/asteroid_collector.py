from .neo import NeoClient
from .sbdb import SBDBClient


class AsteroidCollector:
    def __init__(self, neo_api_key: str):
        self.neo_client = NeoClient(neo_api_key)
        self.sbdb_client = SBDBClient()

    def get(self, key):
        sbdb_data = self.sbdb_client.get(key)
        neo_data = self.neo_client.get(key)

        return {
            "sbdb": sbdb_data,
            "neo": neo_data,
        }

    def list(self):
        return self.neo_client.list()

    @staticmethod
    def get_merge(obj: dict):
        new_obj = {}
        for key, value in obj.items():
            new_obj.update(value)

        return new_obj
