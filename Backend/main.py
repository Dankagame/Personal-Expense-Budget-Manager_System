from fastapi import FastAPI
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