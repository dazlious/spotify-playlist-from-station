import getSongs from './getSongs.mjs';

(async () => {
  try {
    const songs = await getSongs(100);

    console.log(songs);
  } catch (e) {
    console.error(e);
  }
})();
