import jwt
from fastapi import Depends, Header, HTTPException

from db import get_connection

SECRET_KEY = "CHANGE_ME_TO_ENV_VAR_LATER"
ALGORITHM = "HS256"


def get_current_user(authorization: str = Header(default=None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid Authorization header")

    token = authorization.split(" ", 1)[1].strip()

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    conn = get_connection()
    user = conn.execute(
        "SELECT id, email FROM users WHERE email = ?",
        (email,),
    ).fetchone()
    conn.close()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return {"id": user["id"], "email": user["email"]}
