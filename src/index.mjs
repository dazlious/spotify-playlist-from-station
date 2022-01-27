import 'dotenv/config';

import getSongs from './getSongs.mjs';
import Spotify from './spotify.mjs';

(async () => {
  try {
    const spotify = new Spotify();

    await spotify.authorize();

    const [song, ...songs] = await getSongs(100);

    const foundSong = await spotify.findSong(song);
    console.log(foundSong);
  } catch (e) {
    console.error(e);
  }
})();
