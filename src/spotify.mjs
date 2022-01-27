import fetch from 'node-fetch';

const { CLIENT_ID, CLIENT_SECRET } = process.env;

class Spotify {
  constructor() {
    this.authToken = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    this.accessToken = null;
  }

  authorize() {
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
        console.error('Cannot authorize with Spotify', e);
        reject(e);
      }
    });
  }

  async findSong({ artist, track }) {
    const params = new URLSearchParams();
    params.append('q', `artist:${artist} track:${track}`);
    params.append('type', 'track');
    params.append('market', 'DE');

    const response = await fetch(`https://api.spotify.com/v1/search?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (response.status !== 200) return null;

    const data = await response.json();

    const [song] = data?.tracks?.items || [];

    return song;
  }
}

export default Spotify;
