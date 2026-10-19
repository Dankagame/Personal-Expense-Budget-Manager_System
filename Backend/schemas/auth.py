from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserSignup(BaseModel):
    full_name : str = Field(min_length=1, max_length=255)
    email: EmailStr
    phone_number: str | None = Field(default=None, max_length = 20)
    password: str = Field(min_length=8 , max_length = 128)


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name : str
    email: EmailStr
    phone_number: str | None
    created_at: datetime


class AccessToken(BaseModel):
    access_token: str
    token_type: str = "bearer"