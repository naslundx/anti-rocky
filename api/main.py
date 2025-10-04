import os

from flask import Flask, request, redirect
from clients.neo import NeoClient

env = os.environ.get("env", "development").lower()
neo_api_key = os.environ.get("neo_api_key", None)

neo_client = NeoClient(neo_api_key)

app = Flask(__name__)


@app.route("/", methods=["GET"])
def index():
    if env == "production":
        host = request.headers['Host'].lower()
        if host.startswith('defending.earth'):
            return redirect("http://www.defending.earth", code=302)

    return "Hello Space", 200

@app.route("/objects/", methods=["GET"])
def list_objects():
    return neo_client.list(), 200


if __name__ == "__main__":
    PORT = int(os.getenv("PORT")) if os.getenv("PORT") else 8080
    # This is used when running locally. Gunicorn is used to run the
    # application on Cloud Run. See entrypoint in Dockerfile.
    app.run(host="local.defending.earth", port=PORT, debug=True)
