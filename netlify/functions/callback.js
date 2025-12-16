const axios = require('axios');
const querystring = require('querystring');

exports.handler = async function(event, context) {
  const { code } = event.queryStringParameters || {};
  if (!code) return { statusCode: 400, body: "Falta el código" };

  try {
    const response = await axios({
      method: 'post',
      url: 'https://accounts.spotify.com/api/token',
      data: querystring.stringify({
        code: code,
        redirect_uri: process.env.REDIRECT_URI,
        grant_type: 'authorization_code'
      }),
      headers: {
        'Authorization': 'Basic ' + Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    // ESTO ES LO QUE NECESITAS COPIAR
    const nueva_llave = response.data.refresh_token;

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: `
        <div style="font-family:sans-serif; padding:40px; text-align:center;">
            <h1 style="color:#8A2BE2;">¡NUEVA LLAVE MAESTRA! 🔑</h1>
            <p>Esta llave TIENE permiso para subir fotos. Cópiala toda:</p>
            <textarea style="width:100%; height:150px; font-size:14px; padding:10px;">${nueva_llave}</textarea>
            <p>Ahora ve a Netlify y actualiza la variable <b>MI_REFRESH_TOKEN_SECRETO</b> con esto.</p>
        </div>
      `
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify(error.response ? error.response.data : error.message) };
  }
};