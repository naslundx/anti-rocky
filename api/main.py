import os

from flask import Flask, render_template
from flask_cors import CORS

from clients.firestore import FirestoreMiddleware
from clients.sbdb import SBDBClient
from clients.neo import NeoClient
from orbits import compute_earth_orbit, compute_orbit

# Setup Clients and API Keys

env = os.environ.get("env", "development").lower()
neo_api_key = os.environ.get("neo_api_key", None)

neo_client = NeoClient(neo_api_key)
sbdb_client = SBDBClient()
fs = FirestoreMiddleware()

# Setup app and Cors

app = Flask(__name__)
CORS(app, origins=["http://www.defending.earth", "https://www.defending.earth"])


# Redirect to www if we're in prod
@app.route("/")
def index():
    return render_template("index.html")


# List objects
@app.route("/api/objects/", methods=["GET"])
def list_objects():
    return neo_client.list(), 200


# Detailed object
@app.route("/api/objects/<neo_id>/", methods=["GET"])
def get_object(neo_id: str):
    data = fs.get_or_create(neo_id, sbdb_client.get)

    if data is None:
        return "", 404
    else:
        return data, 200


@app.route("/api/objects/<neo_id>/orbit/", methods=["GET"])
def get_object_orbit(neo_id: str):
    neo_data = sbdb_client.get(neo_id)
    if neo_data is None:
        return "", 404

    return [], 200  # todo
    return compute_orbit(), 200


@app.route("/api/earth/orbit/", methods=["GET"])
def get_earth_orbit():
    return compute_earth_orbit()

@app.route("/api/objects/<neo_id>/impact/", methods=["GET"])
def get_object_impact(neo_id: str):
    return ({"x": 12, "y": 75, "radius": 50000, "note": "DANGER DANGER"}, 200)


if __name__ == "__main__":
    PORT = int(os.getenv("PORT")) if os.getenv("PORT") else 8080
    app.run(host="local.defending.earth", port=PORT, debug=True)
