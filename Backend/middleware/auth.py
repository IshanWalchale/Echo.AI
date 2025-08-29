import os
from fastapi import Request, HTTPException
from functools import wraps
import jwt  # PyJWT
from jwt import PyJWTError

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")  # Set this in your .env

def require_auth(func):
    @wraps(func)
    async def wrapper(request: Request, *args, **kwargs):
        auth_header = request.headers.get("authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"])
            request.state.user = payload
        except PyJWTError as e:
            raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
        return await func(request, *args, **kwargs)
    return wrapper 