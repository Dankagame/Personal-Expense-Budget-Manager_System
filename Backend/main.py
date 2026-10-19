from fastapi import FastAPI
from routers.admin_users import router as admin_users_router
from routers.auth import router as auth_router
from routers.users import router as users_router

app = FastAPI(title="Retain API")


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "Retain API is running"}


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth_router)
app.include_router(users_router)
app.include_router(admin_users_router)