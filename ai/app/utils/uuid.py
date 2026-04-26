from uuid import UUID


def is_valid_uuidv7(value: str) -> bool:
    try:
        u = UUID(value)
    except ValueError:
        return False
    else:
        return u.version == 7  # noqa: PLR2004
