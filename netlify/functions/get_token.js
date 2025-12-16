const axios = require('axios');
const querystring = require('querystring');

exports.handler = async function(event, context) {
  try {
    const refresh_token = process.env.MI_REFRESH_TOKEN_SECRETO;
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

    // Pedimos un token temporal a Spotify usando tu llave maestra
    const response = await axios({
      method: 'post',
      url: 'https://accounts.spotify.com/api/token',
      data: querystring.stringify({
        grant_type: 'refresh_token',
        refresh_token: refresh_token
      }),
      headers: {
        'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ access_token: response.data.access_token })
    };
  } catch (error) {
    console.error("Error Token:", error);
    return { statusCode: 500, body: "Error obteniendo token" };
  }
};