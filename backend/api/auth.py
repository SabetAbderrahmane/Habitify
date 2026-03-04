from datetime import datetime, timedelta
from typing import Dict

import jwt
from fastapi import APIRouter, HTTPException
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr

router = APIRouter(tags=["auth"])

# NOTE: for demo only. We'll move to SQLite later.
users_db: Dict[str, str] = {}

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
SECRET_KEY = "CHANGE_ME_TO_ENV_VAR_LATER"
ALGORITHM = "HS256"


class UserIn(BaseModel):
    email: EmailStr
    password: str


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)


def create_access_token(email: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=12)
    payload = {"sub": email, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


@router.post("/signup")
async def signup(user: UserIn):
    if user.email in users_db:
        raise HTTPException(status_code=400, detail="Email already registered")

    if len(user.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    users_db[user.email] = hash_password(user.password)
    return {"message": "User created successfully"}


@router.post("/login")
async def login(user: UserIn):
    hashed = users_db.get(user.email)
    if not hashed or not verify_password(user.password, hashed):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    token = create_access_token(user.email)
    return {"access_token": token, "token_type": "bearer"}
