
from fastapi.openapi.utils import get_openapi
from fastapi import FastAPI, Request
from starling.routers import compute, charts

app = FastAPI()

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
            title="Custom title",
            version="2.5.0",
            summary="This is a very custom OpenAPI schema",
            description="Here's a longer description of the custom **OpenAPI** schema",
            routes=app.routes,
    )
    openapi_schema["info"]["x-logo"] = {
        "url": "https://fastapi.tiangolo.com/img/logo-margin/logo-teal.png"
    }
    app.openapi_schema = openapi_schema
    return app.openapi_schema

@app.get("/")
async def root():
    return {"message": "starling"}



app.openapi = custom_openapi
app.include_router(compute.router)
app.include_router(charts.router)