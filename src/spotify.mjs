import fetch from 'node-fetch';

const { CLIENT_ID, CLIENT_SECRET, CLIENT_SCOPES, CLIENT_AUTHORIZATION } = process.env;

const API_URL_SEARCH = 'https://api.spotify.com/v1/search';
const API_URL_PLAYLIST = 'https://api.spotify.com/v1/playlists';

const callApi = async (url, { method = 'GET', body } = { method: 'GET' }) => {
  const response = await fetch(url, {
    method,
    body,
    headers: {
      Authorization: `Bearer ${CLIENT_AUTHORIZATION}`,
    },
  });

  if (![200, 201].includes(response.status)) {
    console.error('Something went wrong in "callApi"', response.status, response.statusText);
    return null;
  }
  return response.json();
};
class Spotify {
  constructor() {
    this.authToken = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    this.accessToken = null;
  }

  authenticate() {
    return new Promise((resolve, reject) => {
      try {
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');

        fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            Authorization: `Basic ${this.authToken}`,
          },
          body: params,
        }).then(async (response) => {
          const { access_token: accessToken } = await response.json();
          this.accessToken = accessToken;
          resolve();
        });
      } catch (e) {
        console.error('Cannot authenticate with Spotify', e);
        reject(e);
      }
    });
  }

  static getAuthorizedUrl() {
    const params = new URLSearchParams();
    params.append('scope', CLIENT_SCOPES);
    params.append('client_id', CLIENT_ID);
    params.append('show_dialog', false);
    params.append('redirect_uri', encodeURI('http://localhost:3000/callback'));
    params.append('response_type', 'token');

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  static findSong(limiterFn, { artist, track }) {
    const params = new URLSearchParams();
    params.append('q', `artist:${artist} track:${track}`);
    params.append('type', 'track');
    params.append('market', 'DE');

    return limiterFn(() =>
      callApi(`${API_URL_SEARCH}?${params.toString()}`).then((data) => {
        const [song] = data?.tracks?.items || [];
        return song;
      }),
    );
  }

  static async findPlaylist(playlist, owner) {
    const params = new URLSearchParams();
    params.append('q', playlist);
    params.append('type', 'playlist');
    const { playlists } = await callApi(`${API_URL_SEARCH}?${params.toString().replace('+', '%20')}`);
    return playlists.items.find(({ owner: { id } }) => id === owner);
  }

  static async addSongsToPlaylist(songIds, playlistId) {
    const params = new URLSearchParams();
    params.append('uris', songIds.join(','));

    await callApi(`${API_URL_PLAYLIST}/${playlistId}/tracks`, {
      body: JSON.stringify({
        tracks: songIds.map((uri) => ({ uri })),
      }),
      method: 'DELETE',
    });

    await callApi(`${API_URL_PLAYLIST}/${playlistId}/tracks?${params.toString()}`, {
      method: 'POST',
    });

    return true;
  }

  async getAllPlaylistsForUser({ nextUrl, playlists = [] }) {
    const url = !nextUrl ? `https://api.spotify.com/v1/me/playlists` : nextUrl;

    if (!url) return playlists;

    const data = await callApi(url);

    const aggregatedPlaylists = [...playlists, ...data?.items];

    if (data.next) return this.getAllPlaylistsForUser({ nextUrl: data.next, playlists: aggregatedPlaylists });

    return aggregatedPlaylists;
  }
}

export default Spotify;
