import os
from datetime import date, datetime

from flask import Flask, render_template, request
from flask.json.provider import DefaultJSONProvider
from flask_cors import CORS

from impacts import calculate_impact
from clients.firestore import FirestoreMiddleware
from clients.asteroid_collector import AsteroidCollector
from clients.mission_design import MissionDesignClient
from orbits import compute_earth_orbit, compute_orbit
import astropy.units as u
from astropy.time import Time


# Setup Clients and API Keys

env = os.environ.get("env", "development").lower()
neo_api_key = os.environ.get("neo_api_key", None)

asteroid_collector = AsteroidCollector(neo_api_key)
mission_design = MissionDesignClient()
fs = FirestoreMiddleware()


class UpdatedJSONProvider(DefaultJSONProvider):
    def default(self, o):
        if isinstance(o, date) or isinstance(o, datetime):
            return o.isoformat()
        return super().default(o)



# Setup app and Cors

app = Flask(__name__)
app.json = UpdatedJSONProvider(app)
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

    return asteroid_collector.get_merge(data), 200


# Detailed object
@app.route("/api/objects/<key>/missions/", methods=["GET"])
def get_missions(key: str):
    start_date = request.args.get('start_date', date.today().isoformat())
    end_date = request.args.get('end_date')
    data = mission_design.get_from_id(key, start_date, end_date)

    return data, 200


@app.route("/api/objects/<key>/orbit/", methods=["GET"])
def get_object_orbit(key: str):
    data = fs.get_or_create(key, asteroid_collector.get)
    if data is None:
        return "", 404
    neo_data = asteroid_collector.get_merge(data)

    start_date = request.args.get('start_date', '2020-01-01')
    steps = int(request.args.get('steps', '100'))
    orbit = neo_data["orbit"]["elements"]

    data = {
        "e": float(orbit[0]["value"]),
        "a": float(orbit[1]["value"]) * u.AU,
        "i": float(orbit[3]["value"]) * u.deg,
        "raan": float(orbit[4]["value"]) * u.deg,
        "argp": float(orbit[5]["value"]) * u.deg,
        "M0": float(orbit[6]["value"]) * u.deg,
        "epoch0": Time(float(neo_data["orbit"]["epoch"]), format='jd'),
    }
    orbit = compute_orbit(data, start=f"{start_date}T00:00:00", steps=steps)

    return orbit, 200


@app.route("/api/earth/orbit/", methods=["GET"])
def get_earth_orbit():
    start_date = request.args.get('start_date', '2020-01-01')
    steps = int(request.args.get('steps', '366'))

    return compute_earth_orbit(start=f"{start_date}T00:00:00", steps=steps), 200


@app.route("/api/objects/<key>/impact/", methods=["GET"])
def get_object_impact(key: str):
    lat = float(request.args.get('lat', 0))
    lon = float(request.args.get('lon', 0))

    data = fs.get_or_create(key, asteroid_collector.get)
    if data is None:
        return "", 404
    neo_data = asteroid_collector.get_merge(data)

    impact = calculate_impact(neo_data, lat, lon)

    return (impact, 200)


if __name__ == "__main__":
    PORT = int(os.getenv("PORT")) if os.getenv("PORT") else 8080
    app.run(host="127.0.0.1", port=PORT, debug=True)
