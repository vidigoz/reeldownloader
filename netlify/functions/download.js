// netlify/functions/download.js
//
// Recibe la URL de un reel público de Instagram, descarga el HTML de la
// página y extrae la URL directa del video (la que Instagram sirve desde
// su CDN, sin marca de agua) a partir de las etiquetas og:video / og:title.
//
// GET /.netlify/functions/download?url=https://www.instagram.com/reel/XXXX/

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractMeta(html, property) {
  const re = new RegExp(
    `<meta property="${property}" content="([^"]+)"`,
    "i"
  );
  const match = html.match(re);
  return match ? decodeHtmlEntities(match[1]) : null;
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
    const pageRes = await fetch(targetUrl, {
      headers: {
        // User-Agent de navegador móvil: Instagram sirve HTML server-rendered
        // con las etiquetas og: más consistentemente para bots/crawlers así.
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
        "Accept-Language": "es-MX,es;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    });

    if (!pageRes.ok) {
      return {
        statusCode: 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: `Instagram respondió con estado ${pageRes.status}. Puede que el post sea privado o que el link esté mal.`,
        }),
      };
    }

    const html = await pageRes.text();

    const videoUrl =
      extractMeta(html, "og:video:secure_url") || extractMeta(html, "og:video");

    if (!videoUrl) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error:
            "No se encontró video en ese link. Puede ser un post privado, un carrusel de fotos, o Instagram cambió su estructura interna (pasa seguido).",
        }),
      };
    }

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({
        videoUrl,
        title: extractMeta(html, "og:title") || "reel",
        thumbnail: extractMeta(html, "og:image"),
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
