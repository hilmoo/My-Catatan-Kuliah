"""Base58 ↔ UUID conversion matching the Go backend's uuidx package."""

import uuid

# Bitcoin Base58 alphabet (same as btcutil/base58 used by Go backend)
_ALPHABET = b"123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
_BASE = len(_ALPHABET)


def base58_to_uuid(encoded: str) -> uuid.UUID:
    """Decode a Base58-encoded string back to a UUID."""
    num = 0
    for char in encoded.encode():
        num = num * _BASE + _ALPHABET.index(char)

    b = num.to_bytes(16, byteorder="big")
    return uuid.UUID(bytes=b)
