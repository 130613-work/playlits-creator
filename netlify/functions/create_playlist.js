const axios = require('axios');
const querystring = require('querystring');

exports.handler = async function(event, context) {
  // Solo aceptamos peticiones POST
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const { name, description, uris, imageBase64 } = JSON.parse(event.body);

  try {
    // 1. Obtener Token de Administrador (Igual que arriba)
    const tokenParams = new URLSearchParams();
    tokenParams.append('grant_type', 'refresh_token');
    tokenParams.append('refresh_token', process.env.MI_REFRESH_TOKEN_SECRETO);

    const tokenRes = await axios.post('https://accounts.spotify.com/api/token', tokenParams, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    const token = tokenRes.data.access_token;

    // 2. Obtener TU ID de usuario (para saber dónde crear la playlist)
    const meRes = await axios.get('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${token}` } });
    const myId = meRes.data.id;

    // 3. Crear la Playlist
    const createRes = await axios.post(`https://api.spotify.com/v1/users/${myId}/playlists`, 
      { name: name, description: description, public: true }, 
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const playlistId = createRes.data.id;

    // 4. Agregar canciones (Lote de 100)
    // Tu app limita a 30-50 canciones, así que un solo envío basta.
    if (uris && uris.length > 0) {
        await axios.post(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, 
            { uris: uris.slice(0, 100) }, 
            { headers: { Authorization: `Bearer ${token}` } }
        );
    }

    // 5. Subir Imagen (Si existe)
    if (imageBase64) {
        try {
            await axios.put(`https://api.spotify.com/v1/playlists/${playlistId}/images`, 
                imageBase64, 
                { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/jpeg' } }
            );
        } catch (err) { console.log("Error subiendo imagen:", err.response?.data || err.message); }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ id: playlistId, url: createRes.data.external_urls.spotify })
    };

  } catch (error) {
    console.error("Error creando playlist:", error.response?.data || error.message);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};