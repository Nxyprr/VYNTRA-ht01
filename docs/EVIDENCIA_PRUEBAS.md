# Evidencia de pruebas (E-05)
Ejecutar: `cd backend && pip install -r requirements.txt -r requirements-dev.txt && pytest -v`
| ID | Escenario | Prueba automatizada |
|---|---|---|
| CP-01 | CSV válido | test_cp01_csv_valido |
| CP-02 | Formato no permitido | test_cp02_formato_no_permitido |
| CP-03 | CSV sin encabezados válidos | test_cp03_sin_encabezados_validos |
| CP-04 | Valores faltantes | test_cp04_faltantes |
| CP-05 | Clasificación (y rechazo de objetivo incompatible) | test_cp05_clasificacion |
| CP-06 | Regresión | test_cp06_regresion |
| CP-07 | No supervisado | test_cp07_no_supervisado |
| CP-08 | Doble envío | test_cp08_doble_envio |
| CP-09 | Permisos | test_cp09_permisos |
| CP-10 | Transparencia del motor y reporte | test_cp10_transparencia_y_reporte |
| PA-01/02 | Login válido/inválido | test_pa01_pa02_login |
| — | Cuenta inactiva; aprendizaje | test_cuenta_inactiva; test_estudiante_solo_ve_lo_suyo_y_aprendizaje |
**Estado**: pruebas escritas; los resultados deben registrarse tras ejecutarlas en su entorno (no se adjuntan resultados no ejecutados).
