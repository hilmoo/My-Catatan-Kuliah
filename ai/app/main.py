from fastapi import FastAPI
from starlette.types import Lifespan

from app.api import lifespan
from app.api.router import api_router


def create_app(
    lifespan_handler: Lifespan,
) -> FastAPI:
    app = FastAPI(
        title="AI Inference Service — belut ternate",
        version="0.1.0",
        lifespan=lifespan_handler,
    )

    app.include_router(api_router)

    return app


app = create_app(lifespan_handler=lifespan)
