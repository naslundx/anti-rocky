import os

from flask import Flask, request, redirect
from flask_cors import CORS

from clients.sbdb import SBDBClient
from clients.neo import NeoClient

# Setup Clients and API Keys

env = os.environ.get("env", "development").lower()
neo_api_key = os.environ.get("neo_api_key", None)

neo_client = NeoClient(neo_api_key)
sbdb_client = SBDBClient()

# Setup app and Cors

app = Flask(__name__)
CORS(app, origins=["http://www.defending.earth", "https://www.defending.earth"])


# Redirect to www if we're in prod
@app.route("/", methods=["GET"])
def index():
    if env == "production":
        host = request.headers['Host'].lower()
        if host.startswith('defending.earth'):
            return redirect("http://www.defending.earth", code=302)

    return "Hello Space", 200


# List objects
@app.route("/objects/", methods=["GET"])
def list_objects():
    return neo_client.list(), 200


# Detailed object
@app.route("/objects/<neo_id>/", methods=["GET"])
def get_object(neo_id: str):
    neo_data = sbdb_client.get(neo_id)
    if neo_data is None:
        return "", 404
    else:
        return neo_data, 200


if __name__ == "__main__":
    PORT = int(os.getenv("PORT")) if os.getenv("PORT") else 8080
    app.run(host="local.defending.earth", port=PORT, debug=True)
