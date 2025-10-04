import math
import time
import logging
from collections.abc import Callable

from google.cloud import firestore


class FirestoreMiddleware:
    ASTEROID_COLLECTION = "asteroids"
    TTL = 60 * 60 * 24

    def __init__(self):
        self.db = firestore.Client()

    def get_or_create(self, key: str, func: Callable[[str], dict]):
        now = int(time.time())
        next_expiration = now + self.TTL
        doc_ref = self.db.collection(self.ASTEROID_COLLECTION).document(key)
        doc = doc_ref.get()
        if doc.exists:
            logging.info(f"Document {key} exists")
            data = doc.to_dict()
            if data.get("expiration", math.inf) > now:
                return doc.get("payload")
            logging.info(f"Document {key} has expired")

        payload = func(key)
        logging.info(f"Creating document {key}")
        doc_ref.set({
            "payload": payload,
            "expiration": next_expiration
        })
        return payload
