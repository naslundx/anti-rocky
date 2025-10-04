import os

from flask import Flask, request, redirect

env = os.environ.get("env", "development").lower()

app = Flask(__name__)


@app.route("/", methods=["GET"])
def index():
    if env == "production":
        app.logger.info("Running production mode")
        app.logger.info(f"Host: {request.headers['Host']}")
        if 'www.defending.earth' not in request.headers['Host'].lower():
            return redirect("http://www.defending.earth", code=302)

    return "Hello Space", 200


if __name__ == "__main__":
    PORT = int(os.getenv("PORT")) if os.getenv("PORT") else 8080
    # This is used when running locally. Gunicorn is used to run the
    # application on Cloud Run. See entrypoint in Dockerfile.
    app.run(host="local.defending.earth", port=PORT, debug=True)
