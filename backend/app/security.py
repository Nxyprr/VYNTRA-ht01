import os, hashlib, hmac, datetime as dt, jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer
from .db import Session, User
SECRET = os.getenv("JWT_SECRET", "cambia-esto-en-produccion")
def hash_pw(p, salt=None):
    salt = salt or os.urandom(16).hex()
    return salt + "$" + hashlib.pbkdf2_hmac("sha256", p.encode(), bytes.fromhex(salt), 120_000).hex()
def check_pw(p, stored): return hmac.compare_digest(hash_pw(p, stored.split("$")[0]), stored)
def token(u): return jwt.encode({"sub": u.username, "exp": dt.datetime.utcnow() + dt.timedelta(hours=8)}, SECRET, "HS256")
bearer = HTTPBearer()
def current(c=Depends(bearer)):
    try: d = jwt.decode(c.credentials, SECRET, ["HS256"])
    except jwt.PyJWTError: raise HTTPException(401, "Sesión inválida o expirada.")
    with Session() as s: u = s.query(User).filter_by(username=d["sub"]).first()
    if not u or not u.active: raise HTTPException(403, "Cuenta inactiva.")
    return u
def roles(*r):
    def dep(u=Depends(current)):
        if u.role not in r: raise HTTPException(403, "Permiso denegado.")
        return u
    return dep
