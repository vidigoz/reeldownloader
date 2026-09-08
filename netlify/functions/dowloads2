// netlify/functions/download.js
//
// Recibe la URL de un reel/post público de Instagram y extrae la URL directa
// del video (la que Instagram sirve desde su CDN, sin marca de agua).
//
// Estrategia:
//   1. Intenta la página normal del post y busca las etiquetas og:video.
//   2. Si Instagram devolvió un muro de login (o no encontró video), intenta
//      la versión /embed/ del mismo post — Instagram la sirve pública casi
//      siempre, con el video incrustado directo en un <video> o en JSON.
//
// GET /.netlify/functions/download?url=https://www.instagram.com/reel/XXXX/

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1";

function decodeEntities(str) {
  return str
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractMeta(html, property) {
  const re = new RegExp(`<meta property="${property}" content="([^"]+)"`, "i");
  const match = html.match(re);
  return match ? decodeEntities(match[1]) : null;
}

// Busca "video_url":"..." dentro de cualquier JSON incrustado en la página
// (útil en la vista /embed/, donde a veces no hay etiquetas og: pero sí un
// bloque de JSON con los datos del post).
function extractJsonVideoUrl(html) {
  const match = html.match(/"video_url":\s*"([^"]+)"/);
  return match ? decodeEntities(match[1]) : null;
}

// Busca un <video ... src="..."> directo, que es como suele venir la vista embed.
function extractVideoTag(html) {
  const match = html.match(/<video[^>]+src="([^"]+)"/i);
  return match ? decodeEntities(match[1]) : null;
}

function looksLikeLoginWall(html) {
  return (
    /Log in to Instagram/i.test(html) ||
    /loginForm/i.test(html) ||
    (/instagram/i.test(html) && !/og:video|video_url|<video/i.test(html))
  );
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": MOBILE_UA,
      "Accept-Language": "es-MX,es;q=0.9,en;q=0.8",
    },
    redirect: "follow",
  });
  return { ok: res.ok, status: res.status, html: res.ok ? await res.text() : "" };
}

function toEmbedUrl(url) {
  const clean = url.split("?")[0].replace(/\/?$/, "/");
  return clean + "embed/";
}

function findVideo(html) {
  return (
    extractMeta(html, "og:video:secure_url") ||
    extractMeta(html, "og:video") ||
    extractJsonVideoUrl(html) ||
    extractVideoTag(html)
  );
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }

  const targetUrl = event.queryStringParameters && event.queryStringParameters.url;

  if (!targetUrl || !/^https?:\/\/(www\.)?instagram\.com\//i.test(targetUrl)) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Pega un link válido de instagram.com" }),
    };
  }

  try {
    // Intento 1: página normal del post
    const main = await fetchHtml(targetUrl);

    if (!main.ok) {
      return {
        statusCode: 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: `Instagram respondió con estado ${main.status}. Puede que el post sea privado o que el link esté mal.`,
        }),
      };
    }

    let videoUrl = findVideo(main.html);
    let title = extractMeta(main.html, "og:title");
    let thumbnail = extractMeta(main.html, "og:image");

    // Intento 2: vista /embed/ si el primero no dio video o topó con login
    if (!videoUrl || looksLikeLoginWall(main.html)) {
      try {
        const embed = await fetchHtml(toEmbedUrl(targetUrl));
        if (embed.ok) {
          const embedVideo = findVideo(embed.html);
          if (embedVideo) {
            videoUrl = embedVideo;
            title = title || extractMeta(embed.html, "og:title");
            thumbnail = thumbnail || extractMeta(embed.html, "og:image");
          }
        }
      } catch (_) {
        // si falla el embed, seguimos con lo que haya del intento 1
      }
    }

    if (!videoUrl) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error:
            "No se encontró video en ese link. Puede ser un post privado, un carrusel de fotos, o Instagram está bloqueando el acceso sin sesión iniciada en este momento.",
        }),
      };
    }

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({
        videoUrl,
        title: title || "reel",
        thumbnail: thumbnail || null,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Error al procesar el link: " + err.message }),
    };
  }
};
