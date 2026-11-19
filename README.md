# VYNTRA · HT-01 — Plataforma Inteligente de Análisis y Explicación de IA
Sistema web empresarial (React + TypeScript · FastAPI · PostgreSQL · scikit-learn) construido según **DOC-IA-HT01-001** y **MAN-IA-HT01-002**. Diseño en negro, vino y blanco, con íconos y animaciones.

## Módulos (según los documentos)
Dashboard · Fundamentos IA · Centro de datos · Laboratorio ML · Pipeline · Resultados · Historial · Administración · Guía de demo.

## Tres perfiles, tres experiencias
| Perfil | Qué ve y qué hace |
|---|---|
| **Estudiante** | Aprende (unidades, flujo ML, retos), importa y explora datasets, ejecuta prácticas, sigue su pipeline, consulta sus resultados e historial. |
| **Instructor** | Fundamentos en modo consulta (avance de la cohorte), crea prácticas, monitorea pipelines, revisa resultados de los estudiantes y marca prácticas como revisadas. |
| **Administrador** | Gestiona usuarios y roles, contenidos de Fundamentos, datasets habilitados, parámetros (tamaño de CSV, retención), depuración de archivos y auditoría. |
Los permisos se validan en el servidor (no solo en el menú).

## Ejecutar en local
    cd backend && python -m venv .venv && .venv\Scripts\activate && pip install -r requirements.txt && uvicorn app.main:app --reload
    cd frontend && npm install && npm run dev          # http://localhost:5173
    cd backend && pip install -r requirements-dev.txt && pytest -v     # pruebas
    cd frontend && npm run build                       # verificar que compila antes de publicar
Docker (API + PostgreSQL): `docker compose up --build`.

## Publicar: GitHub + Render (y opcionalmente Vercel) → ver docs/DESPLIEGUE.md
## Usuarios iniciales (cámbielos con ADMIN_PASSWORD / EST_PASSWORD / INS_PASSWORD)
estudiante / Est2026! · instructor / Ins2026! · admin / Adm2026!

## Estructura
- `backend/app`: `db.py` (modelos), `security.py` (JWT y roles), `engine.py` (ML real con scikit-learn), `main.py` (API)
- `frontend/src`: `App.tsx` (menú por rol, encabezado, avisos), `dash.tsx` (dashboards), `student.tsx` (Fundamentos, Laboratorio, Historial), `data.tsx`, `pipeline.tsx`, `results.tsx`, `pages.tsx` (Administración, Guía de demo)
- `docs`: manual de usuario, manual técnico, evidencia de pruebas, guion de demo, despliegue

## Pendiente por confirmar con el docente
Lenguaje del motor (el módulo menciona Java), límites y retención oficiales, dataset oficial, roles institucionales.
