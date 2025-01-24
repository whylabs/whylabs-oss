import base64
import hashlib


def short_sha256_base64(data: str, length=6):
    # Compute the SHA-256 hash
    sha256_hash = hashlib.sha256(data.encode()).digest()
    # Encode the hash using Base64
    base64_hash = base64.urlsafe_b64encode(sha256_hash).decode("utf-8")
    # Return the short version
    return base64_hash[:length]
