from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from config import settings
from routers.admin_budgets import router as admin_budgets_router
from routers.admin_expenses import router as admin_expenses_router
from routers.admin_users import router as admin_users_router
from routers.auth import router as auth_router
from routers.budgets import router as budgets_router
from routers.categories import router as categories_router
from routers.dashboard import router as dashboard_router
from routers.expenses import router as expenses_router
from routers.users import router as users_router

app = FastAPI(title="Retain API")

allowed_origins = [
    origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Accept", "Authorization", "Content-Type"],
)


@app.exception_handler(Exception)
async def unhandled_error(request: Request, error: Exception) -> JSONResponse:
    response = JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )
    origin = request.headers.get("origin")
    if origin in allowed_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Vary"] = "Origin"
    return response


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "Retain API is running"}


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth_router)
app.include_router(users_router)
app.include_router(admin_users_router)
app.include_router(budgets_router)
app.include_router(admin_budgets_router)
app.include_router(categories_router)
app.include_router(expenses_router)
app.include_router(admin_expenses_router)
app.include_router(dashboard_router)
