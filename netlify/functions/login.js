const querystring = require('querystring');

exports.handler = async function(event, context) {
  const client_id = process.env.SPOTIFY_CLIENT_ID; 
  const redirect_uri = process.env.REDIRECT_URI; 
  const scope = 'user-read-private user-read-email playlist-modify-public playlist-modify-private ugc-image-upload';
  const state = Math.random().toString(36).substring(7);

  const query = querystring.stringify({
    response_type: 'code',
    client_id: client_id,
    scope: scope,
    redirect_uri: redirect_uri,
    state: state
  });

  return {
    statusCode: 302,
    headers: {
      Location: 'https://accounts.spotify.com/authorize?' + query
    }
  };
};
