# Despliegue de VYNTRA en GitHub + Render (y opcionalmente Vercel)
## 0. Antes de subir (en su computadora)
1. `cd frontend && npm install && npm run build` → debe terminar sin errores.
2. `cd backend && pytest -v` → las pruebas deben pasar.
## 1. GitHub
    cd vyntra
    git init && git add . && git commit -m "VYNTRA HT-01"
    git branch -M main
    git remote add origin https://github.com/USUARIO/vyntra-ht01.git
    git push -u origin main
Trabajo en equipo (3 personas): una rama por persona (`git checkout -b nombre/tarea`) y Pull Request a `main`. El CI (`.github/workflows/ci.yml`) corre pruebas y build.
## 2. Render — todo en uno (opción recomendada)
1. En Render: **New → Blueprint** → elija el repositorio. Render lee `render.yaml` y crea: base de datos `vyntra-db`, API `vyntra-api` y sitio web `vyntra-web`.
2. Complete `ADMIN_PASSWORD`, `EST_PASSWORD` e `INS_PASSWORD` (contraseñas iniciales).
3. Espere a que terminen los 3 despliegues (el primero tarda varios minutos).
4. **Verifique la URL real de la API** (ej. `https://vyntra-api.onrender.com`). Si Render le asignó otro nombre, vaya a `vyntra-web` → Environment → edite `VITE_API_URL` con esa URL y haga **Manual Deploy → Clear build cache & deploy**.
5. Abra la URL de `vyntra-web` y entre con las credenciales.
## 3. Alternativa: frontend en Vercel
**Add New → Project** → mismo repositorio → **Root Directory: `frontend`** → variable `VITE_API_URL` = URL de la API en Render. La API ya acepta orígenes `*.vercel.app` (variable `CORS_REGEX`); para restringir, defina `CORS` con la URL exacta y quite `CORS_REGEX`.
## 4. Variables importantes
| Variable | Dónde | Para qué |
|---|---|---|
| DATABASE_URL | API | PostgreSQL (la inyecta Render) |
| JWT_SECRET | API | Firma de sesiones (Render la genera) |
| ADMIN_PASSWORD / EST_PASSWORD / INS_PASSWORD | API | Contraseñas iniciales |
| CORS / CORS_REGEX | API | Orígenes permitidos |
| MAX_UPLOAD_MB | API | Tamaño máximo de CSV (por defecto 5) |
| VITE_API_URL | Frontend | URL de la API |
| VITE_DEMO_LOGIN | Frontend | `false` oculta las tarjetas con credenciales de demostración |
## 5. Límites del plan gratuito de Render
- La API "duerme" tras unos minutos sin uso: la primera carga puede tardar. Ábrala antes de exponer.
- La base de datos gratuita puede tener vencimiento; para uso prolongado, use un plan de pago.
- El disco es temporal: los CSV importados pueden perderse al reiniciar (los datasets de ejemplo se regeneran solos).
## 6. Si algo falla
- **El login dice «Servicio no disponible»:** revise `VITE_API_URL` y que la API esté «Live».
- **Error de CORS en la consola del navegador:** revise `CORS_REGEX` / `CORS` en la API.
- **El build del frontend falla:** ejecute `npm run build` en local y corrija el error que muestre.
- **Antes de exponer:** `VITE_DEMO_LOGIN=false` si la página será pública y cambie todas las contraseñas.
