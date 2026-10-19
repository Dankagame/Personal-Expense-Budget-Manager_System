from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    db_username: str
    db_password : str
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str
    secret_key: str

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parent / ".env",
        env_file_encoding="utf-8",
    )



settings = Settings()