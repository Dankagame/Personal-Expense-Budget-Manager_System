
import os

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from database import SessionLocal
from models import Role, User
from security import hash_password


ADMIN_EMAIL = "admin123@gmail.com"


def main() -> None:
    password = os.environ.get("RETAIN_ADMIN_PASSWORD")
    if not password or not 8 <= len(password) <= 128:
        raise SystemExit("Set RETAIN_ADMIN_PASSWORD to a password of 8–128 characters.")

    with SessionLocal() as db:
        admin_role = db.scalar(select(Role).where(Role.name == "admin"))
        if admin_role is None:
            raise SystemExit("Admin role is missing. Run the database migrations first.")

        existing = db.scalar(select(User).where(User.email == ADMIN_EMAIL))
        if existing is not None:
            if admin_role in existing.roles:
                print(f"Admin account already exists: {ADMIN_EMAIL}")
                return
            raise SystemExit(f"{ADMIN_EMAIL} already belongs to a non-admin account.")

        db.add(
            User(
                full_name="Admin",
                email=ADMIN_EMAIL,
                hashed_password=hash_password(password),
                roles=[admin_role],
            )
        )
        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            raise SystemExit("Admin account could not be created; check for a duplicate email.") from exc

    print(f"Admin account created: {ADMIN_EMAIL}")


if __name__ == "__main__":
    main()
