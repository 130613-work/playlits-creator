const axios = require('axios');
const querystring = require('querystring');

exports.handler = async function(event, context) {
  const { code } = event.queryStringParameters || {};

  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirect_uri = process.env.REDIRECT_URI;

  const frontend_url = 'https://zippy-sprinkles-8c1f3e.netlify.app';

  if (!code) {
    return { statusCode: 400, body: "Falta el código de autorización" };
  }

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
    const { access_token, refresh_token } = response.data;

    return {
      statusCode: 302,
      headers: {
        Location: `${frontend_url}/#access_token=${access_token}&refresh_token=${refresh_token}`
      }
    };

  } catch (error) {
    console.log("ERROR CALLBACK:", error.response ? error.response.data : error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error obteniendo el token de Spotify",
        error: error.response ? error.response.data : error.message
      })
    };
  }
};
