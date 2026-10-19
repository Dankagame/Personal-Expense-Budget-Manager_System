from fastapi import FastAPI

app = FastAPI(title="Retain API")


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "Retain API is running"}


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}