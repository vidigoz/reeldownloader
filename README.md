# bajador de reels

Página propia para bajar reels de Instagram sin marca de agua ni anuncios.
Solo funciona con posts/reels **públicos**.

## Cómo funciona

- `index.html` — la interfaz (pegar link, botón, resultado).
- `netlify/functions/download.js` — función serverless que descarga el HTML
  del reel y extrae la URL directa del video desde las etiquetas `og:video`.
- `netlify.toml` — conecta `/api/download` con la función.

No usa APIs de terceros ni servicios externos: solo le pide la página a
Instagram directamente, igual que haría tu navegador.

## Cómo subirlo a Netlify

Netlify necesita correr la función serverless, así que **no sirve arrastrar
la carpeta al drag-and-drop de Netlify** (eso solo sube sitios estáticos sin
funciones). Dos formas de hacerlo:

### Opción A — Netlify CLI (más rápido, sin GitHub)

```bash
npm install -g netlify-cli
cd reel-downloader
netlify login
netlify deploy --prod
```

Cuando te pregunte el "publish directory", pon `.` (la carpeta actual).
Netlify detecta `netlify.toml` solo y despliega la función.

### Opción B — Conectar un repo de GitHub

1. Sube esta carpeta a un repo nuevo en GitHub.
2. En Netlify: **Add new site → Import an existing project → GitHub** →
   selecciona el repo.
3. Build command: (vacío). Publish directory: `.`
4. Deploy. Netlify lee `netlify.toml` y publica la función sola.

## Notas

- Si Instagram deja de devolver la etiqueta `og:video` para algún link
  (cambian su estructura cada tanto), el error te lo va a decir en la página.
- El botón "Guardar video" apunta directo al CDN de Meta. En algunos
  navegadores el atributo `download` no fuerza la descarga si el archivo es
  de otro dominio — en ese caso, clic derecho → "Guardar video como…".
- Es para uso personal. El scraping de Instagram no está permitido por sus
  Términos de Servicio, aunque el riesgo real para uso personal y bajo
  volumen es mínimo.
