const querystring = require('querystring');

exports.handler = async function(event, context) {
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  // OJO: Asegúrate de que esta variable en Netlify termine en /callback
  const redirect_uri = process.env.REDIRECT_URI; 

  // AQUÍ ESTÁ EL TRUCO: Pedimos permiso explícito para subir imágenes
  const scope = 'playlist-modify-public playlist-modify-private ugc-image-upload';

  const authUrl = 'https://open.spotify.com/playlist/[ID]' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri
    });

  return {
    statusCode: 302,
    headers: { Location: authUrl }
  };
};