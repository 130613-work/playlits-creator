const axios = require('axios');
const querystring = require('querystring');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const data = JSON.parse(event.body);
    const { name, description, uris, imageBase64 } = data; // Recibimos la imagen aquí

    // 1. OBTENER TOKEN DE ACCESO (Usando tu Llave Maestra)
    const tokenResponse = await axios.post('https://accounts.spotify.com/api/token', 
      querystring.stringify({
        grant_type: 'refresh_token',
        refresh_token: process.env.MI_REFRESH_TOKEN_SECRETO
      }), {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    const access_token = tokenResponse.data.access_token;

    // 2. OBTENER ID DEL USUARIO
    const userResponse = await axios.get('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    const user_id = userResponse.data.id;

    // 3. CREAR LA PLAYLIST VACÍA
    const createResponse = await axios.post(`https://api.spotify.com/v1/users/${user_id}/playlists`, {
      name: name,
      description: description,
      public: true
    }, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    const playlist_id = createResponse.data.id;

    // 4. AGREGAR CANCIONES
    if (uris && uris.length > 0) {
      await axios.post(`https://api.spotify.com/v1/playlists/${playlist_id}/tracks`, {
        uris: uris
      }, {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
    }

    // ============================================================
    // 5. SUBIR LA FOTO 
    // ============================================================
    if (imageBase64) {
      try {
        await axios({
          method: 'put',
          url: `https://api.spotify.com/v1/playlists/${playlist_id}/images`,
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'image/jpeg'
          },
          data: imageBase64 // Spotify pide el base64 crudo (sin headers)
        });
        console.log("Imagen subida con éxito");
      } catch (imgError) {
        console.error("Error subiendo imagen (pero la playlist se creó):", imgError.response?.data || imgError.message);
        // No fallamos toda la función si falla la imagen, solo lo logueamos
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ id: playlist_id, message: "Playlist creada y foto subida" })
    };

  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
