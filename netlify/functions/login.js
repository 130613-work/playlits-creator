exports.handler = async function(event, context) {
  // Configuración
  const clientId = "7c17b5f396fe41df8ec41e87c6324d10";
  const redirectUri = process.env.REDIRECT_URI || "http://127.0.0.1:8888/callback";
  // Agregamos 'playlist-modify-public' y 'playlist-modify-private' para CREAR
  const scopes = "user-read-private user-read-email playlist-read-private playlist-modify-public playlist-modify-private ugc-image-upload";
  // Construir la URL de Spotify
  const url = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  // Redirigir al usuario a Spotify
  return {
    statusCode: 302,
    headers: {
      Location: url
    }
  };
};