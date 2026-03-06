from datetime import datetime, timedelta

import jwt
from fastapi import APIRouter, HTTPException
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr

from db import get_connection

router = APIRouter(tags=["auth"])

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
    if len(user.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    conn = get_connection()
    existing = conn.execute(
        "SELECT id FROM users WHERE email = ?",
        (user.email,),
    ).fetchone()

    if existing:
        conn.close()
        raise HTTPException(status_code=400, detail="Email already registered")

    conn.execute(
        "INSERT INTO users (email, password_hash) VALUES (?, ?)",
        (user.email, hash_password(user.password)),
    )
    conn.commit()
    conn.close()

    return {"message": "User created successfully"}


@router.post("/login")
async def login(user: UserIn):
    conn = get_connection()
    row = conn.execute(
        "SELECT id, email, password_hash FROM users WHERE email = ?",
        (user.email,),
    ).fetchone()
    conn.close()

    if not row or not verify_password(user.password, row["password_hash"]):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    token = create_access_token(row["email"])
    return {"access_token": token, "token_type": "bearer"}
