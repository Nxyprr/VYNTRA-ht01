import io, os, uuid, time, json, html, logging, datetime as dt
import numpy as np, pandas as pd
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from pydantic import BaseModel
from .db import Base, engine as dbe, Session, User, Dataset, Practice, Execution, Audit, Unit, Progress, Setting, audit, now
from .security import hash_pw, check_pw, token, current, roles
from . import engine as ml
logging.basicConfig(level=logging.INFO, format="%(message)s"); log = logging.getLogger("vyntra")
STORAGE = os.getenv("STORAGE", "./storage"); os.makedirs(STORAGE, exist_ok=True)
DELAY = float(os.getenv("STAGE_DELAY", "0.4")); DEFAULTS = {"max_upload_mb": "5", "retention_days": "90"}
app = FastAPI(title="VYNTRA API", version="1.2.0")
app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in (os.getenv("CORS") or "http://localhost:5173").split(",") if o.strip()], allow_origin_regex=os.getenv("CORS_REGEX") or None, allow_methods=["*"], allow_headers=["*"])
HITS = {}
@app.middleware("http")
async def guard(request: Request, call_next):
    rid = request.headers.get("x-request-id") or uuid.uuid4().hex[:12]; path = request.url.path
    login_ = path == "/auth/login"; limit = 10 if login_ else int(os.getenv("RATE_LIMIT", "240"))
    k = (request.client.host if request.client else "?", login_); t = time.time(); h = [x for x in HITS.get(k, []) if t - x < 60]
    if len(h) >= limit: return JSONResponse({"detail": "Demasiadas solicitudes. Intente de nuevo en un minuto."}, status_code=429)
    h.append(t); HITS[k] = h; resp = await call_next(request); resp.headers["X-Request-ID"] = rid
    log.info(json.dumps({"rid": rid, "method": request.method, "path": path, "status": resp.status_code})); return resp
def setting(k):
    with Session() as s: r = s.get(Setting, k); return r.value if r else DEFAULTS[k]
def profile(df):
    cols = []
    for c in df.columns:
        sr = df[c]; num = ml.is_num(sr)
        x = {"name": str(c), "type": "numérico" if num else "categórico", "nulls": int(sr.isna().sum()), "distinct": int(sr.nunique())}
        if num and sr.notna().any():
            q1, q3 = sr.quantile(.25), sr.quantile(.75); iq = q3 - q1; sd = sr.std()
            x.update(min=round(float(sr.min()), 2), max=round(float(sr.max()), 2), mean=round(float(sr.mean()), 2), std=0 if pd.isna(sd) else round(float(sd), 2),
                     outliers=int(((sr < q1 - 1.5*iq) | (sr > q3 + 1.5*iq)).sum()))
        elif not num: x["top"] = [[str(a), int(b)] for a, b in sr.value_counts().head(3).items()]
        cols.append(x)
    dup = int(df.duplicated().sum()); const = [c["name"] for c in cols if c["distinct"] < 2]; nulls = sum(c["nulls"] for c in cols); out = sum(c.get("outliers", 0) for c in cols)
    warn = ([f"{nulls} valores faltantes"] if nulls else []) + ([f"{dup} filas duplicadas"] if dup else []) + ([f"Columnas constantes: {', '.join(const)}"] if const else []) + ([f"{out} valores atípicos potenciales (no se corrigen en silencio)"] if out else [])
    return {"columns": cols, "duplicates": dup, "warnings": warn, "preview": df.head(8).fillna("").astype(str).values.tolist()}
def add_ds(s, df, name, source, owner):
    key = uuid.uuid4().hex + ".csv"; df.to_csv(os.path.join(STORAGE, key), index=False); p = profile(df)
    d = Dataset(name=name, source=source, file_key=key, owner_id=owner, row_count=len(df), column_count=df.shape[1], status="valido_con_advertencias" if p["warnings"] else "valido", profile=p)
    s.add(d); s.commit(); return d
def load(d):
    f = os.path.join(STORAGE, d.file_key)
    if not os.path.exists(f):
        m = dict(synth()).get(d.name)
        if m is None: raise HTTPException(410, "El archivo del dataset ya no está disponible. Vuelva a importarlo.")
        m.to_csv(f, index=False)
    return pd.read_csv(f)
ds_out = lambda d: {"id": d.id, "name": d.name, "source": d.source, "rows": d.row_count, "cols": d.column_count, "status": d.status, "profile": d.profile, "enabled": d.enabled, "owner_id": d.owner_id, "created_at": d.created_at.isoformat()}
def synth():
    r = np.random.default_rng(7); n = 90
    a = r.uniform(1500, 8000, n).round(); d = r.uniform(0, 60, n).round(); t = r.integers(0, 15, n); sc = d*1.2 - a/150 - t*1.5 + r.normal(0, 6, n)
    cls = pd.DataFrame({"ingreso": a, "deuda_pct": d, "antiguedad": t, "riesgo": np.where(sc > 8, "Alto", np.where(sc > -12, "Medio", "Bajo"))})
    p = r.uniform(1, 20, n).round(1); q = r.uniform(10, 50, n).round(1); tt = r.integers(1, 10, n)
    reg = pd.DataFrame({"publicidad": p, "precio": q, "tiendas": tt, "ventas": (50 + 12*p - 3*q + 4*tt + r.normal(0, 10, n)).round(1)})
    c = np.array([[3, 40], [12, 120], [25, 300]])[np.arange(n) % 3]
    uns = pd.DataFrame({"frecuencia": (c[:, 0] + r.normal(0, 2, n)).round(1), "gasto": (c[:, 1] + r.normal(0, 20, n)).round(1)})
    return [("Solicitudes (sintético)", cls), ("Ventas (sintético)", reg), ("Clientes (sintético)", uns)]
UNITS = [("Inteligencia Artificial", "Campo que desarrolla sistemas capaces de realizar tareas asociadas con capacidades inteligentes. Tiene límites: depende de los datos y del diseño.", "¿De qué dependen los sistemas de IA?", ["Solo de la computadora", "De los datos y del diseño", "De la suerte"], 1),
 ("Machine Learning", "Enfoque que aprende patrones a partir de datos: datos, entrenamiento y predicción.", "¿Qué aprende un modelo de ML?", ["Patrones a partir de datos", "Reglas escritas a mano", "Nada"], 0),
 ("Datos e información", "Un dato es un valor aislado (150). La información es el dato organizado en un contexto (Ventas del mes: S/ 15 000).", "¿Cuál es información?", ["150", "Ventas del mes: S/ 15 000", "S/"], 1),
 ("Aprendizaje supervisado", "Usa ejemplos con etiqueta o variable objetivo conocida.", "Predecir fraude con transacciones etiquetadas es:", ["Supervisado", "No supervisado", "Ninguno"], 0),
 ("Aprendizaje no supervisado", "Busca estructura o grupos sin etiqueta objetivo.", "Agrupar clientes por comportamiento es:", ["Supervisado", "No supervisado", "Regresión"], 1),
 ("Clasificación", "Predice una categoría o clase, por ejemplo riesgo bajo, medio o alto.", "¿Qué predice la clasificación?", ["Un número continuo", "Una categoría", "Grupos sin etiquetas"], 1),
 ("Regresión", "Estima un valor numérico continuo, por ejemplo las ventas del próximo mes.", "Estimar ventas futuras es:", ["Clasificación", "Agrupamiento", "Regresión"], 2)]
@app.on_event("startup")
def boot():
    Base.metadata.create_all(dbe)
    with Session() as s:
        # Crear o actualizar las cuentas demo sin borrar otros usuarios ni datos.
        cuentas_demo = [
            ("estudiante", os.getenv("EST_PASSWORD", "Est2026!"), "Estudiante"),
            ("instructor", os.getenv("INS_PASSWORD", "Ins2026!"), "Instructor"),
            ("admin", os.getenv("ADMIN_PASSWORD", "Adm2026!"), "Administrador"),
        ]

        for username, password, role in cuentas_demo:
            usuario = s.query(User).filter_by(username=username).first()
            if usuario:
                usuario.password_hash = hash_pw(password)
                usuario.role = role
                usuario.active = True
            else:
                s.add(User(
                    username=username,
                    password_hash=hash_pw(password),
                    role=role,
                    active=True
                ))
        s.commit()

        if not s.query(Dataset).count():
            for n, df in synth():
                add_ds(s, df, n, "sintetico", None)

        if not s.query(Unit).count():
            for t, b, q, o, a in UNITS:
                s.add(Unit(title=t, body=b, question=q, options=o, answer=a))
            s.commit()
class Login(BaseModel): username: str; password: str
@app.post("/auth/login")
def login(b: Login):
    with Session() as s: u = s.query(User).filter_by(username=b.username.strip().lower()).first()
    if not u or not check_pw(b.password, u.password_hash):
        audit(b.username, "login", "user", None, "denegado"); raise HTTPException(401, "Usuario o contraseña incorrectos.")
    if not u.active:
        audit(u.username, "login", "user", u.id, "cuenta inactiva"); raise HTTPException(403, "Cuenta inactiva o bloqueada. Contacte a soporte.")
    audit(u.username, "login", "user", u.id); return {"token": token(u), "username": u.username, "role": u.role}
@app.post("/auth/logout")
def logout(u=Depends(current)): audit(u.username, "logout", "user", u.id); return {"ok": True}
@app.get("/learning")
def learning(u=Depends(current)):
    with Session() as s:
        done = {p.unit_id for p in s.query(Progress).filter_by(user_id=u.id)}
        return [{"id": x.id, "title": x.title, "body": x.body, "question": x.question, "options": x.options, "done": x.id in done} for x in s.query(Unit).order_by(Unit.id)]
class Ans(BaseModel): choice: int
@app.post("/learning/{uid}/answer")
def answer(uid: int, b: Ans, u=Depends(roles("Estudiante"))):
    with Session() as s:
        x = s.get(Unit, uid)
        if not x: raise HTTPException(404, "Unidad no encontrada.")
        ok = b.choice == x.answer
        if ok and not s.query(Progress).filter_by(user_id=u.id, unit_id=uid).count(): s.add(Progress(user_id=u.id, unit_id=uid)); s.commit(); audit(u.username, "unidad_revisada", "unit", uid)
        return {"correct": ok}
@app.get("/datasets")
def datasets(u=Depends(current)):
    with Session() as s:
        q = s.query(Dataset)
        if u.role == "Estudiante": q = q.filter(Dataset.enabled.is_(True), (Dataset.owner_id.is_(None)) | (Dataset.owner_id == u.id))
        return [ds_out(d) for d in q.order_by(Dataset.id).all()]
@app.post("/datasets/upload")
async def upload(file: UploadFile = File(...), sep: str = Form(","), encoding: str = Form("utf-8"), u=Depends(current)):
    if not (file.filename or "").lower().endswith(".csv"): raise HTTPException(400, "Formato no permitido. Solo se aceptan archivos .csv.")
    if sep not in (",", ";", "\t", "|") or encoding not in ("utf-8", "latin-1"): raise HTTPException(400, "Separador o codificación no soportados.")
    raw = await file.read(); mx = int(setting("max_upload_mb")) * 1048576
    if len(raw) > mx: raise HTTPException(413, f"El archivo supera {mx // 1048576} MB.")
    enc = "utf-8-sig" if encoding == "utf-8" else encoding
    try: head = [h.strip() for h in raw.decode(enc).splitlines()[0].split(sep)]; df = pd.read_csv(io.BytesIO(raw), sep=sep, encoding=enc)
    except Exception: raise HTTPException(400, "Archivo ilegible o vacío. Revise separador y codificación.")
    if df.empty: raise HTTPException(400, "El archivo necesita al menos una fila de datos.")
    if any(not h for h in head) or len(set(head)) != len(head): raise HTTPException(400, "Los encabezados deben ser únicos y no estar vacíos.")
    with Session() as s: d = add_ds(s, df, file.filename, "csv", u.id)
    audit(u.username, "importar_dataset", "dataset", d.id); return ds_out(d)
@app.delete("/datasets/{did}")
def del_ds(did: int, u=Depends(current)):
    with Session() as s:
        d = s.get(Dataset, did)
        if not d or (d.owner_id != u.id and u.role != "Administrador"): raise HTTPException(404, "Dataset no encontrado.")
        if s.query(Practice).filter_by(dataset_id=did).count(): raise HTTPException(409, "El dataset está en uso por prácticas registradas.")
        try: os.remove(os.path.join(STORAGE, d.file_key))
        except OSError: pass
        s.delete(d); s.commit(); audit(u.username, "eliminar_dataset", "dataset", did); return {"ok": True}
class PracticeIn(BaseModel): title: str; objective: str; dataset_id: int; approach: str; target: str | None = None; features: list[str] = []
@app.post("/practices")
def new_practice(b: PracticeIn, u=Depends(roles("Estudiante", "Instructor"))):
    if b.approach not in ("clf", "reg", "uns"): raise HTTPException(422, "Enfoque no válido.")
    if not b.objective.strip(): raise HTTPException(422, "Escriba el objetivo de la práctica.")
    with Session() as s:
        d = s.get(Dataset, b.dataset_id)
        if not d or not d.enabled or (d.owner_id not in (None, u.id) and u.role == "Estudiante"): raise HTTPException(404, "Dataset no disponible.")
        err = ml.check(load(d), b.approach, b.target, b.features)
        if err: raise HTTPException(422, err)
        p = Practice(title=b.title or "Práctica", objective=b.objective, approach=b.approach, target=b.target, dataset_id=d.id, created_by=u.id, features=b.features)
        s.add(p); s.commit(); audit(u.username, "crear_practica", "practice", p.id); return {"id": p.id}
def ex_out(s, e):
    p = s.get(Practice, e.practice_id)
    return {"id": e.id, "code": f"EX-{e.id:04d}", "title": p.title, "objective": p.objective, "approach": p.approach, "target": p.target, "features": p.features or [],
            "dataset": s.get(Dataset, p.dataset_id).name, "user": s.get(User, e.user_id).username, "status": e.status, "stage": e.stage, "engine_type": e.engine_type,
            "engine_version": e.engine_version, "started_at": e.started_at.isoformat(), "finished_at": e.finished_at.isoformat() if e.finished_at else None,
            "result": e.result, "error": e.error, "reviewed": e.reviewed}
def get_ex(s, eid, u):
    e = s.get(Execution, eid)
    if not e or (u.role == "Estudiante" and e.user_id != u.id): raise HTTPException(404, "Ejecución no encontrada.")
    return e
STAGES = ["Validando", "Preparando", "Procesando", "Evaluando", "Finalizando"]
def work(eid):
    def st(x):
        with Session() as s:
            e = s.get(Execution, eid)
            if e.status == "cancelada": return False
            e.status = "en_proceso"; e.stage = x; s.commit()
        time.sleep(DELAY); return True
    out = None
    for x in STAGES[:3]:
        if not st(x): return
    with Session() as s:
        e = s.get(Execution, eid); p = s.get(Practice, e.practice_id)
        try: out = ml.run(load(s.get(Dataset, p.dataset_id)), p.approach, p.target, p.features or None)
        except Exception: out = None
    for x in STAGES[3:]:
        if not st(x): return
    with Session() as s:
        e = s.get(Execution, eid)
        if e.status == "cancelada": return
        if out is None: e.status = "fallida"; e.error = "ERR-ENG-01"; e.result = {"warnings": []}
        else: e.result = out; e.status = "con_advertencias" if out["warnings"] else "completada"
        e.stage = ""; e.finished_at = now(); s.commit(); audit(s.get(User, e.user_id).username, "ejecutar", "execution", eid, e.status)
@app.post("/practices/{pid}/run")
def run(pid: int, bg: BackgroundTasks, u=Depends(current)):
    with Session() as s:
        p = s.get(Practice, pid)
        if not p or p.created_by != u.id: raise HTTPException(404, "Práctica no encontrada.")
        if s.query(Execution).filter(Execution.practice_id == pid, Execution.status.in_(["en_cola", "en_proceso"])).count(): raise HTTPException(409, "Ya hay una ejecución en curso para esta práctica.")
        e = Execution(practice_id=pid, user_id=u.id, status="en_cola", engine_type="ml-real", engine_version=ml.VERSION, started_at=now(), result={})
        s.add(e); s.commit(); audit(u.username, "encolar", "execution", e.id, "en_cola"); bg.add_task(work, e.id); return ex_out(s, e)
@app.post("/executions/{eid}/cancel")
def cancel(eid: int, u=Depends(current)):
    with Session() as s:
        e = get_ex(s, eid, u)
        if e.status not in ("en_cola", "en_proceso"): raise HTTPException(409, "La ejecución ya terminó.")
        e.status = "cancelada"; e.stage = ""; e.finished_at = now(); s.commit(); audit(u.username, "cancelar", "execution", eid, "cancelada"); return ex_out(s, e)
@app.get("/executions")
def executions(status: str = "", approach: str = "", dataset: str = "", user: str = "", desde: str = "", hasta: str = "", u=Depends(current)):
    with Session() as s:
        q = s.query(Execution).order_by(Execution.id.desc())
        if u.role == "Estudiante": q = q.filter_by(user_id=u.id)
        out = [ex_out(s, e) for e in q.all()]
    f = lambda x: (not status or x["status"] == status) and (not approach or x["approach"] == approach) and (not dataset or dataset.lower() in x["dataset"].lower()) and (not user or user.lower() in x["user"].lower()) and (not desde or x["started_at"][:10] >= desde) and (not hasta or x["started_at"][:10] <= hasta)
    return [x for x in out if f(x)]
@app.get("/executions/{eid}")
def one(eid: int, u=Depends(current)):
    with Session() as s: return ex_out(s, get_ex(s, eid, u))
@app.post("/executions/{eid}/review")
def review(eid: int, u=Depends(roles("Instructor", "Administrador"))):
    with Session() as s:
        e = get_ex(s, eid, u); e.reviewed = True; s.commit(); audit(u.username, "revisar", "execution", eid); return ex_out(s, e)
@app.get("/executions/{eid}/report", response_class=HTMLResponse)
def report(eid: int, u=Depends(current)):
    with Session() as s: x = ex_out(s, get_ex(s, eid, u))
    r = x["result"] or {}; m = r.get("metrics", {}); esc = lambda v: html.escape(str(v))
    rows = "".join(f"<tr><td>{esc(k)}</td><td>{esc(v)}</td></tr>" for k, v in m.items() if k != "matriz_confusion")
    cm = m.get("matriz_confusion"); mat = ""
    if cm: mat = "<h3>Matriz de confusión</h3><table><tr><th></th>" + "".join(f"<th>{esc(l)}</th>" for l in cm["labels"]) + "</tr>" + "".join(f"<tr><td>{esc(cm['labels'][i])}</td>" + "".join(f"<td>{v}</td>" for v in row) + "</tr>" for i, row in enumerate(cm["matrix"])) + "</table>"
    typ = "MODELO ML REAL" if x["engine_type"] == "ml-real" else "DEMOSTRACIÓN"
    audit(u.username, "exportar_reporte", "execution", eid)
    return f"""<!doctype html><meta charset="utf-8"><title>Reporte {x['code']}</title><style>body{{font:14px system-ui;max-width:780px;margin:30px auto;color:#111}}h1{{color:#7a1230}}table{{border-collapse:collapse;width:100%;margin:8px 0}}th,td{{border:1px solid #ccc;padding:6px 8px;text-align:left}}th{{background:#7a1230;color:#fff}}@media print{{button{{display:none}}}}</style>
<button onclick="print()">Imprimir / Guardar PDF</button><h1>VYNTRA · Reporte de práctica {x['code']}</h1>
<table><tr><th>Tipo de ejecución</th><td>{typ} · {esc(x['engine_version'])}</td></tr><tr><th>Método</th><td>{esc(r.get('algorithm','—'))}</td></tr><tr><th>Dataset</th><td>{esc(x['dataset'])}</td></tr><tr><th>Variable objetivo</th><td>{esc(x['target'] or '—')}</td></tr><tr><th>Propósito</th><td>{esc(x['objective'])}</td></tr><tr><th>Usuario</th><td>{esc(x['user'])}</td></tr><tr><th>Fecha</th><td>{esc(x['started_at'])}</td></tr><tr><th>Estado</th><td>{esc(x['status'])}</td></tr><tr><th>Partición</th><td>{esc(r.get('split','—'))}</td></tr></table>
<h3>Métricas</h3><table>{rows or '<tr><td>Sin métricas</td></tr>'}</table>{mat}<h3>Advertencias y limitaciones</h3><ul>{''.join(f'<li>{esc(w)}</li>' for w in r.get('warnings', []))}<li>Resultado orientativo: depende del dataset y de la partición usada.</li></ul>"""
class NewUser(BaseModel): username: str; password: str; role: str
@app.get("/admin/users")
def users(u=Depends(roles("Administrador"))):
    with Session() as s: return [{"id": x.id, "username": x.username, "role": x.role, "active": x.active} for x in s.query(User).all()]
@app.post("/admin/users")
def new_user(b: NewUser, a=Depends(roles("Administrador"))):
    n = b.username.strip().lower()
    if len(n) < 3 or len(b.password) < 8 or b.role not in ("Estudiante", "Instructor", "Administrador"): raise HTTPException(422, "Usuario (3+), contraseña (8+) y rol válido son obligatorios.")
    with Session() as s:
        if s.query(User).filter_by(username=n).count(): raise HTTPException(409, "El usuario ya existe.")
        s.add(User(username=n, password_hash=hash_pw(b.password), role=b.role, active=True)); s.commit()
    audit(a.username, "crear_usuario", "user", None); return {"ok": True}
class UserPatch(BaseModel): role: str | None = None; active: bool | None = None
@app.patch("/admin/users/{uid}")
def patch_user(uid: int, b: UserPatch, a=Depends(roles("Administrador"))):
    with Session() as s:
        x = s.get(User, uid)
        if not x: raise HTTPException(404, "Usuario no encontrado.")
        if b.role in ("Estudiante", "Instructor", "Administrador"): x.role = b.role
        if b.active is not None: x.active = b.active
        s.commit(); audit(a.username, "editar_usuario", "user", uid); return {"ok": True}
class EnIn(BaseModel): enabled: bool
@app.patch("/admin/datasets/{did}")
def en_ds(did: int, b: EnIn, a=Depends(roles("Administrador"))):
    with Session() as s:
        d = s.get(Dataset, did)
        if not d: raise HTTPException(404, "Dataset no encontrado.")
        d.enabled = b.enabled; s.commit(); audit(a.username, "habilitar_dataset", "dataset", did, "si" if b.enabled else "no"); return {"ok": True}
class UnitIn(BaseModel): title: str; body: str
@app.put("/admin/units/{uid}")
def edit_unit(uid: int, b: UnitIn, a=Depends(roles("Administrador"))):
    with Session() as s:
        x = s.get(Unit, uid)
        if not x: raise HTTPException(404, "Unidad no encontrada.")
        x.title, x.body = b.title[:120], b.body[:1000]; s.commit(); audit(a.username, "editar_contenido", "unit", uid); return {"ok": True}
class SetIn(BaseModel): key: str; value: str
@app.get("/admin/settings")
def get_settings(a=Depends(roles("Administrador"))): return {k: setting(k) for k in DEFAULTS}
@app.put("/admin/settings")
def put_setting(b: SetIn, a=Depends(roles("Administrador"))):
    if b.key not in DEFAULTS or not b.value.isdigit() or int(b.value) < 1: raise HTTPException(422, "Parámetro o valor no válido.")
    with Session() as s:
        r = s.get(Setting, b.key)
        if r: r.value = b.value
        else: s.add(Setting(key=b.key, value=b.value))
        s.commit()
    audit(a.username, "editar_parametro", "setting", None, b.key); return {"ok": True}
@app.post("/admin/purge")
def purge(a=Depends(roles("Administrador"))):
    lim = now() - dt.timedelta(days=int(setting("retention_days"))); n = 0
    with Session() as s:
        for d in s.query(Dataset).filter(Dataset.owner_id.isnot(None), Dataset.created_at < lim).all():
            if s.query(Practice).filter_by(dataset_id=d.id).count(): continue
            try: os.remove(os.path.join(STORAGE, d.file_key))
            except OSError: pass
            s.delete(d); n += 1
        s.commit()
    audit(a.username, "depurar_archivos", "dataset", None, str(n)); return {"deleted": n}
@app.get("/admin/audit")
def audit_log(u=Depends(roles("Administrador"))):
    with Session() as s: return [{"at": x.at.isoformat(), "actor": x.actor, "action": x.action, "entity": f"{x.entity} {x.entity_id or ''}", "result": x.result} for x in s.query(Audit).order_by(Audit.id.desc()).limit(150)]
WD = ["L", "M", "X", "J", "V", "S", "D"]; APPR = {"clf": "Clasificación", "reg": "Regresión", "uns": "Agrupamiento"}
@app.get("/stats")
def stats(u=Depends(current)):
    today = now().date(); days = [today - dt.timedelta(days=i) for i in range(6, -1, -1)]
    cnt = lambda L: [sum(1 for e in L if e.started_at.date() == d) for d in days]
    st = lambda L: [[n, sum(e.status == k for e in L)] for n, k in (("Completadas", "completada"), ("Con advertencias", "con_advertencias"), ("Fallidas", "fallida"), ("Canceladas", "cancelada"))]
    feed = lambda rows: [{"at": a.at.isoformat(), "actor": a.actor, "action": a.action, "result": a.result} for a in rows]
    with Session() as s:
        ex = s.query(Execution).all(); us = s.query(User).all(); ul = s.query(Unit).order_by(Unit.id).all(); prog = s.query(Progress).all()
        P = {p.id: p for p in s.query(Practice)}; D = {d.id: d for d in s.query(Dataset)}; name = {x.id: x.username for x in us}
        ap = lambda e: APPR[P[e.practice_id].approach]; dn = lambda e: D[P[e.practice_id].dataset_id].name
        row = lambda e: {"id": e.id, "code": f"EX-{e.id:04d}", "user": name[e.user_id], "dataset": dn(e), "approach": ap(e), "status": e.status}
        out = {"units_total": len(ul), "week_labels": [WD[d.weekday()] for d in days]}
        if u.role == "Estudiante":
            mine = [e for e in ex if e.user_id == u.id]; done = [p for p in prog if p.user_id == u.id]; last = max(mine, key=lambda e: e.id) if mine else None
            m = (last.result or {}).get("metrics", {}) if last else {}
            out.update(kind="student", runs=len(mine), completed=sum(e.status in ("completada", "con_advertencias") for e in mine), units_done=len(done), week=cnt(mine), by_status=st(mine),
                       datasets=s.query(Dataset).filter(Dataset.enabled.is_(True), (Dataset.owner_id.is_(None)) | (Dataset.owner_id == u.id)).count(),
                       journey=[len(done) > 0, s.query(Dataset).filter_by(owner_id=u.id).count() > 0 or len(mine) > 0, len(mine) > 0, any(e.status in ("completada", "con_advertencias") for e in mine), any(e.reviewed for e in mine)],
                       last_metric=next(([k, v] for k, v in m.items() if not isinstance(v, (dict, list))), None), recent=[row(e) for e in sorted(mine, key=lambda e: -e.id)[:5]],
                       feed=feed(s.query(Audit).filter_by(actor=u.username).order_by(Audit.id.desc()).limit(6)))
        elif u.role == "Instructor":
            sts = [x for x in us if x.role == "Estudiante"]; sid = {x.id for x in sts}; cut = now() - dt.timedelta(days=30); n = max(len(sts), 1)
            pend = sorted([e for e in ex if not e.reviewed and e.status in ("completada", "con_advertencias")], key=lambda e: -e.id)
            tbl = []
            for x in sts:
                r = [e for e in ex if e.user_id == x.id]
                tbl.append({"user": x.username, "runs": len(r), "units": sum(p.user_id == x.id for p in prog), "last": max((e.started_at for e in r), default=None) and max(e.started_at for e in r).isoformat()})
            out.update(kind="instructor", students=len(sts), active=len({e.user_id for e in ex if e.user_id in sid and e.started_at >= cut}), pending_n=len(pend), executions=len(ex),
                       avg_progress=round(100 * sum(p.user_id in sid for p in prog) / max(n * len(ul), 1)), by_approach=[[v, sum(P[e.practice_id].approach == k for e in ex)] for k, v in APPR.items()],
                       units=[{"t": x.title, "p": round(100 * len({p.user_id for p in prog if p.unit_id == x.id and p.user_id in sid}) / n)} for x in ul],
                       heat=[sum(1 for e in ex if e.started_at.date() == today - dt.timedelta(days=i)) for i in range(27, -1, -1)], pending=[row(e) for e in pend[:6]], table=tbl,
                       week=cnt(ex), feed=feed(s.query(Audit).order_by(Audit.id.desc()).limit(6)))
        else:
            try: size = sum(os.path.getsize(os.path.join(STORAGE, f)) for f in os.listdir(STORAGE))
            except OSError: size = 0
            out.update(kind="admin", users=len(us), active_users=sum(x.active for x in us), by_role=[[r, sum(x.role == r for x in us)] for r in ("Estudiante", "Instructor", "Administrador")],
                       datasets=len(D), datasets_enabled=sum(d.enabled for d in D.values()), executions=len(ex), failed=sum(e.status == "fallida" for e in ex), queue=sum(e.status in ("en_cola", "en_proceso") for e in ex),
                       denied=s.query(Audit).filter(Audit.result.in_(["denegado", "cuenta inactiva"])).count(), storage_mb=round(size / 1048576, 2), db_ok=True, engine=ml.VERSION,
                       week=cnt(ex), by_status=st(ex), feed=feed(s.query(Audit).order_by(Audit.id.desc()).limit(8)))
        return out
