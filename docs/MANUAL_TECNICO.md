# Manual técnico · VYNTRA HT-01 (E-07)
**Stack:** React + TypeScript (Vite) · FastAPI · SQLAlchemy · PostgreSQL (SQLite en desarrollo) · scikit-learn.
**Capas:** presentación (`frontend/src`) · API y aplicación (`backend/app/main.py`) · dominio y persistencia (`db.py`) · seguridad (`security.py`) · motor ML desacoplado (`engine.py`).
## Roles y permisos (validados en servidor)
Estudiante: contenidos, datasets, crear/ejecutar prácticas propias, resultados e historial propios. Instructor: crear prácticas, ver y revisar ejecuciones de estudiantes. Administrador: usuarios, roles, contenidos, datasets habilitados, parámetros, auditoría.
## Endpoints principales
`POST /auth/login|logout` · `GET /stats` (dashboard por rol) · `GET/POST /learning` · `GET/POST/DELETE /datasets` · `POST /practices` · `POST /practices/{id}/run` · `GET /executions` (filtros) · `GET /executions/{id}` · `POST /executions/{id}/cancel|review` · `GET /executions/{id}/report` · `/admin/users|datasets|units|settings|purge|audit`.
## Ejecución de una práctica
`en_cola → en_proceso (Validando, Preparando, Procesando, Evaluando, Finalizando) → completada | con_advertencias | fallida | cancelada`. Un worker en segundo plano procesa la cola; el cliente consulta el estado. Evita duplicados (409). Para mayor volumen, sustituir el worker por una cola (Celery/RQ) sin cambiar el contrato.
## Modelo de datos
users, datasets, practices, executions, audit_events, units, progress, settings.
## Seguridad
JWT (8 h), PBKDF2, autorización por rol en servidor, validación de archivos, límite de solicitudes (429), registros JSON con `X-Request-ID`, auditoría de eventos.
## Variables de entorno
`DATABASE_URL`, `JWT_SECRET`, `CORS`, `CORS_REGEX`, `STORAGE`, `RATE_LIMIT`, `STAGE_DELAY`, `MAX_UPLOAD_MB`, `ADMIN_PASSWORD`, `EST_PASSWORD`, `INS_PASSWORD`; frontend: `VITE_API_URL`, `VITE_DEMO_LOGIN`.
## Despliegue
Ver `docs/DESPLIEGUE.md` (GitHub + Render, o Render + Vercel).
