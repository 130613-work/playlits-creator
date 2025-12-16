const axios = require('axios');
const querystring = require('querystring');

exports.handler = async function(event, context) {
  const { code } = event.queryStringParameters || {};
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirect_uri = process.env.REDIRECT_URI;

  if (!code) return { statusCode: 400, body: "Falta el código" };

  try {
    const authOptions = {
      method: 'post',
      url: 'https://accounts.spotify.com/api/token',
      data: querystring.stringify({
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      }),
      headers: {
        'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };

    const response = await axios(authOptions);
    const { refresh_token } = response.data; // ¡Aquí está la joya!

    // EN LUGAR DE REDIRIGIR, MOSTRAMOS EL TOKEN EN PANTALLA GIGANTE
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: `
        <html>
          <body style="font-family: sans-serif; padding: 40px; word-break: break-all;">
            <h1>🔑 TU LLAVE MAESTRA (Refresh Token)</h1>
            <p>Copia el siguiente código largo y guárdalo muy bien:</p>
            <div style="background: #f4f4f4; padding: 20px; border: 2px solid #333; font-size: 1.2rem;">
              ${refresh_token}
            </div>
            <p>Ahora ve a Netlify y crea la variable <b>MI_REFRESH_TOKEN_SECRETO</b> con este valor.</p>
          </body>
        </html>
      `
    };

  } catch (error) {
    return { statusCode: 500, body: JSON.stringify(error) };
  }
};
