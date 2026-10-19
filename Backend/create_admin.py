from getpass import getpass

from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from database import SessionLocal
from models import Role, User
from security import hash_password


def main() -> None:
    full_name = input("Admin full name: ").strip()
    if not full_name or len(full_name) > 255:
        print("Name must be between 1 and 255 characters.")
        return

    email_input = input("Admin email: ").strip()
    try:
        email = str(TypeAdapter(EmailStr).validate_python(email_input))
    except ValidationError:
        print("Please enter a valid email address.")
        return

    password = getpass("Admin password (8–128 characters): ")
    if not 8 <= len(password) <= 128:
        print("Password must be between 8 and 128 characters.")
        return

    password_confirmation = getpass("Confirm admin password: ")
    if password != password_confirmation:
        print("Passwords do not match.")
        return

    with SessionLocal() as db:
        admin_role = db.scalar(select(Role).where(Role.name == "admin"))
        if admin_role is None:
            raise RuntimeError("The admin role is missing. Check the role migration.")

        existing_user = db.scalar(
            select(User).where(User.email == email)
        )
        if existing_user is not None:
            print("An account with that email already exists; no changes made.")
            return

        admin_user = User(
            full_name=full_name,
            email=email,
            hashed_password=hash_password(password),
            roles=[admin_role],
        )
        db.add(admin_user)

        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            print("The account could not be created; check for a duplicate email.")
            return

        print(f"Admin account created for {email} (user ID: {admin_user.id}).")


if __name__ == "__main__":
    main()