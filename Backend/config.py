from pathlib import Path
from typing import Self

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str | None = None
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    db_username: str = ""
    db_password: str = ""
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = ""
    secret_key: str = Field(min_length=32)

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parent / ".env",
        env_file_encoding="utf-8",
    )

    @model_validator(mode="after")
    def require_database_configuration(self) -> Self:
        if not self.database_url and (not self.db_username or not self.db_name):
            raise ValueError("Set DATABASE_URL or both DB_USERNAME and DB_NAME")
        return self


settings = Settings()
