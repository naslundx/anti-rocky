import os

from flask import Flask, render_template
from flask_cors import CORS

from clients.firestore import FirestoreMiddleware
from clients.asteroid_collector import AsteroidCollector
from orbits import compute_earth_orbit, compute_orbit
import astropy.units as u

# Setup Clients and API Keys

env = os.environ.get("env", "development").lower()
neo_api_key = os.environ.get("neo_api_key", None)

asteroid_collector = AsteroidCollector(neo_api_key)
fs = FirestoreMiddleware()

# Setup app and Cors

app = Flask(__name__)
CORS(app, origins=["http://www.defending.earth", "https://www.defending.earth"])


# Redirect to www if we're in prod
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/", methods=["GET"])
def get_api():
    return "Hello, Space!"


# List objects
@app.route("/api/objects/", methods=["GET"])
def list_objects():
    return asteroid_collector.list(), 200


# Detailed object
@app.route("/api/objects/<key>/", methods=["GET"])
def get_object(key: str):

    data = fs.get_or_create(key, asteroid_collector.get)

    if data is None:
        return "", 404
    else:
        return asteroid_collector.get_merge(data), 200


@app.route("/api/objects/<key>/orbit/", methods=["GET"])
def get_object_orbit(key: str):
    data = fs.get_or_create(key, asteroid_collector.get)
    if data is None:
        return "", 404
    neo_data = asteroid_collector.get_merge(data)

    data = {
        "e": float(neo_data["orbit"]["elements"][0]["value"]),
        "a": float(neo_data["orbit"]["elements"][1]["value"]) * u.AU,
        "i": float(neo_data["orbit"]["elements"][3]["value"]) * u.deg,
        "raan": float(neo_data["orbit"]["elements"][4]["value"]) * u.deg,
        "argp": float(neo_data["orbit"]["elements"][5]["value"]) * u.deg,
        "M0": float(neo_data["orbit"]["elements"][6]["value"]) * u.deg,
        "epoch0": "2020-01-01T00:00:00",
    }
    orbit = compute_orbit(data)

    return orbit, 200


@app.route("/api/earth/orbit/", methods=["GET"])
def get_earth_orbit():
    return compute_earth_orbit()


@app.route("/api/objects/<key>/impact/", methods=["GET"])
def get_object_impact(key: str):
    return ([
        {"x": 12, "y": 75, "radius": 80000, "note": "DANGER DANGER", "color": "red"},
        {"x": 14, "y": 100, "radius": 500000, "note": "lite mindre DANGER", "color": "blue"},
    ], 200)


if __name__ == "__main__":
    PORT = int(os.getenv("PORT")) if os.getenv("PORT") else 8080
    app.run(host="127.0.0.1", port=PORT, debug=True)
