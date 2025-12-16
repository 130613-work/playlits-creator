const axios = require('axios');

exports.handler = async function(event, context) {
  // ---------------------------------------------------------
  // 1. PON TUS DATOS REALES AQUÍ ENTRE COMILLAS (¡No los dejes vacíos!)
  // ---------------------------------------------------------
  const clientId = "7c17b5f396fe41df8ec41e87c6324d10"; 
  const clientSecret = "e439742ebbf94271bfcf1f0fa3f669c9"; 
  
  // Esta URL debe ser idéntica a la que pusiste en login.js
  const redirectUri = "http://127.0.0.1:8888/callback"; 
  // ---------------------------------------------------------

  const { code } = event.queryStringParameters;

  if (!code) {
    return { statusCode: 400, body: "Falta el código" };
  }

  // Codificar credenciales para Spotify (Esto es lo que estaba fallando)
  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const response = await axios({
      method: 'post',
      url: 'https://accounts.spotify.com/api/token',
      params: {
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      },
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token } = response.data;

    // Éxito: mandar el token a tu web
    return {
      statusCode: 302,
      headers: {
        Location: `http://localhost:8888/#access_token=${access_token}`      }
    };

  } catch (error) {
    console.log("ERROR SPOTIFY:", error.response ? error.response.data : error.message);
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Error conectando con Spotify",
        error: error.response ? error.response.data : error.message
      })
    };
  }
};