# MOVA

MOVA es una aplicacion web interna para coordinar servicios logisticos entre clientes y transportistas, con landing publica, panel administrativo, Google Sheets como persistencia y Google Apps Script como API serverless.

## Frontend

```bash
npm install
npm run dev
npm run typecheck
npm run test
npm run build
```

Variables publicas:

```bash
NEXT_PUBLIC_APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
NEXT_PUBLIC_MOVA_DEMO_MODE=false
NEXT_PUBLIC_MOVA_CONTACT_WHATSAPP=
NEXT_PUBLIC_MOVA_CONTACT_EMAIL=
NEXT_PUBLIC_MOVA_CONTACT_LABEL=Solicitar presupuesto
```

Si `NEXT_PUBLIC_APPS_SCRIPT_URL` no esta configurada, el frontend usa modo demo local con `localStorage` para poder navegar y probar UI. Produccion debe usar Apps Script y Google Sheets.

## Deploy en Render Static Site

La app se despliega como **Static Site**. El frontend queda exportado en `out/` y se comunica directamente con Apps Script.

Configuracion recomendada:

- Type: `Static Site`
- Branch: `main`
- Build Command: `npm ci && npm run build`
- Publish Directory: `out`
- Node version: Render toma `.node-version`

Variables de entorno en Render:

```bash
NEXT_PUBLIC_APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
NEXT_PUBLIC_MOVA_DEMO_MODE=false
NEXT_PUBLIC_MOVA_CONTACT_WHATSAPP=
NEXT_PUBLIC_MOVA_CONTACT_EMAIL=
NEXT_PUBLIC_MOVA_CONTACT_LABEL=Solicitar presupuesto
```

Despues de cambiar cualquier `NEXT_PUBLIC_*` en Render hay que redeployar, porque Next las incorpora durante el build.

## Apps Script

1. Crear una Google Sheet vacia.
2. Crear un proyecto de Google Apps Script.
3. Copiar los archivos de `apps-script/` al proyecto. Si se copian manualmente, respetar los nombres para mantener orden.
4. Configurar Script Properties.
5. Ejecutar `movaInitSheets()` una vez para crear hojas y encabezados.
6. Desplegar como Web App con acceso segun tu operacion.
7. Copiar la URL del Web App en `NEXT_PUBLIC_APPS_SCRIPT_URL`.

Hojas creadas:

- `Clients`
- `Transports`
- `Services`
- `Payments`
- `ServiceNotes`
- `Meta`

Script Properties requeridas:

- `SPREADSHEET_ID`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_SALT`
- `ADMIN_PASSWORD_HASH`
- `GROQ_API_KEY`

Script Properties opcionales:

- `SESSION_TTL_HOURS` por defecto `12`
- `GROQ_MODEL` por defecto `openai/gpt-oss-20b`, recomendado para Structured Outputs estricto
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_FOLDER` por defecto `mova`

Para generar el hash del admin en Apps Script, ejecutar:

```js
movaGeneratePasswordHash("tu_password", "tu_salt_largo")
```

Guardar el resultado en `ADMIN_PASSWORD_HASH` y el salt usado en `ADMIN_PASSWORD_SALT`. No guardar la password real.

Despues de modificar cualquier archivo `.gs`, crear un deployment nuevo del Web App o actualizar el deployment existente. Si el frontend recibe HTML en vez de JSON, casi siempre la URL configurada no es la URL `/exec` del deployment activo.

Para habilitar subida de imagen desde Clientes y Transportes, configurar las cuatro propiedades de Cloudinary. El navegador comprime la imagen, la manda a Apps Script, Apps Script firma/sube a Cloudinary y Sheets guarda solamente la URL publica.

Si se actualizan `Sheets.gs`, `Groq.gs`, `Cloudinary.gs`, `Code.gs` o `Auth.gs`, hay que redeployar Apps Script. La optimizacion de guardado depende de usar estos scripts nuevos: el frontend ya no refresca todas las hojas despues de cada mutacion, y `Sheets.gs` ya no reinicializa toda la estructura en cada lectura/escritura.

## Flujo implementado

- Landing publica con CTA configurable y acceso admin discreto.
- Login validado por Apps Script, con token temporal guardado en el frontend.
- Clientes y transportes: crear, listar, buscar, ordenar, editar, detalle, ocultar/reactivar y WhatsApp.
- Servicios: crear, seleccionar cliente/transporte, crear cliente/transporte desde modal, editar, detalle, finalizar/cancelar, clasificacion centralizada y contadores.
- Dinero: ARS/USD simultaneos, comision por moneda, precio por km/kg, pagos parciales y saldos.
- Notas: multiples notas por servicio, orden, tamano y franja horizontal.
- IA: textarea, llamada a Apps Script, Groq server-side, JSON normalizado y formulario precompletado sin guardar automaticamente.
- Estadisticas por periodo con monedas separadas.
- Cloudinary preparado via Apps Script para subida base64 sin exponer secrets.
