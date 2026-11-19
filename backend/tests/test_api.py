import os, tempfile
d = tempfile.mkdtemp()
os.environ.update(DATABASE_URL=f"sqlite:///{d}/t.db", STORAGE=d, STAGE_DELAY="0", RATE_LIMIT="1000")
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db import Session, Execution, User
@pytest.fixture(scope="module")
def c():
    with TestClient(app) as cl: yield cl
def tok(c, u, p): return {"Authorization": "Bearer " + c.post("/auth/login", json={"username": u, "password": p}).json()["token"]}
@pytest.fixture(scope="module")
def E(c): return tok(c, "estudiante", "Est2026!")
def dsid(c, h, n): return next(x for x in c.get("/datasets", headers=h).json() if x["name"].startswith(n))["id"]
def up(c, h, name, data, **f): return c.post("/datasets/upload", headers=h, files={"file": (name, data)}, data=f)
def prac(c, h, i, ap, t=None, **k): return c.post("/practices", headers=h, json={"title": "t", "objective": "o", "dataset_id": i, "approach": ap, "target": t, **k})
def run(c, h, pid):
    r = c.post(f"/practices/{pid}/run", headers=h); assert r.status_code == 200
    return c.get(f"/executions/{r.json()['id']}", headers=h).json()
def test_pa01_pa02_login(c):
    assert c.post("/auth/login", json={"username": "estudiante", "password": "mal"}).status_code == 401
    assert c.post("/auth/login", json={"username": "estudiante", "password": "Est2026!"}).status_code == 200
def test_cuenta_inactiva(c, E):
    A = tok(c, "admin", "Adm2026!"); c.post("/admin/users", headers=A, json={"username": "bloq", "password": "Clave2026!", "role": "Estudiante"})
    uid = next(x["id"] for x in c.get("/admin/users", headers=A).json() if x["username"] == "bloq")
    c.patch(f"/admin/users/{uid}", headers=A, json={"active": False})
    assert c.post("/auth/login", json={"username": "bloq", "password": "Clave2026!"}).status_code == 403
def test_cp01_csv_valido(c, E):
    r = up(c, E, "ok.csv", "a,b\n1,2\n3,4\n"); assert r.status_code == 200 and r.json()["rows"] == 2
def test_cp02_formato_no_permitido(c, E): assert up(c, E, "x.exe", "MZ").status_code == 400
def test_cp03_sin_encabezados_validos(c, E):
    assert up(c, E, "d.csv", "a,a\n1,2\n").status_code == 400
    assert up(c, E, "v.csv", "").status_code == 400
def test_cp04_faltantes(c, E):
    r = up(c, E, "f.csv", "a,b\n1,\n2,3\n4,5\n").json(); assert any("faltantes" in w for w in r["profile"]["warnings"])
def test_cp05_clasificacion(c, E):
    i = dsid(c, E, "Solicitudes"); p = prac(c, E, i, "clf", "riesgo"); assert p.status_code == 200
    assert run(c, E, p.json()["id"])["status"] in ("completada", "con_advertencias")
    assert prac(c, E, i, "clf", "ingreso").status_code == 422
def test_cp06_regresion(c, E):
    p = prac(c, E, dsid(c, E, "Ventas"), "reg", "ventas"); assert "R2" in run(c, E, p.json()["id"])["result"]["metrics"]
def test_cp07_no_supervisado(c, E):
    p = prac(c, E, dsid(c, E, "Clientes"), "uns"); assert "silhouette" in run(c, E, p.json()["id"])["result"]["metrics"]
def test_cp08_doble_envio(c, E):
    p = prac(c, E, dsid(c, E, "Ventas"), "reg", "ventas").json()["id"]
    with Session() as s:
        s.add(Execution(practice_id=p, user_id=s.query(User).filter_by(username="estudiante").first().id, status="en_proceso", engine_type="ml-real", engine_version="x", started_at=__import__("datetime").datetime.utcnow(), result={})); s.commit()
    assert c.post(f"/practices/{p}/run", headers=E).status_code == 409
def test_cp09_permisos(c, E): assert c.get("/admin/users", headers=E).status_code == 403
def test_cp10_transparencia_y_reporte(c, E):
    x = c.get("/executions", headers=E).json()[-1]; assert x["engine_type"] == "ml-real"
    assert "MODELO ML REAL" in c.get(f"/executions/{x['id']}/report", headers=E).text
def test_estudiante_solo_ve_lo_suyo_y_aprendizaje(c, E):
    u = c.get("/learning", headers=E).json(); assert len(u) == 7
    assert c.post(f"/learning/{u[0]['id']}/answer", headers=E, json={"choice": 1}).json()["correct"] is True
def test_stats_por_rol(c, E):
    s = c.get("/stats", headers=E).json(); assert s["kind"] == "student" and s["runs"] >= 1 and len(s["week"]) == 7
    I = tok(c, "instructor", "Ins2026!"); assert c.get("/stats", headers=I).json()["kind"] == "instructor"
    A = tok(c, "admin", "Adm2026!"); a = c.get("/stats", headers=A).json(); assert a["kind"] == "admin" and a["users"] >= 3
