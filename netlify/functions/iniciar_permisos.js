const querystring = require('querystring');

exports.handler = async function(event, context) {
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const redirect_uri = process.env.REDIRECT_URI; 

  // Permisos para playlist y FOTOS
  const scope = 'playlist-modify-public playlist-modify-private ugc-image-upload';

  // 👇 AQUÍ ESTABA EL ERROR: La dirección correcta es esta:
  const authUrl = 'https://accounts.spotify.com/authorize?' +
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
