import 'dotenv/config';
import pLimit from 'p-limit';
import uniqBy from 'lodash/uniqBy.js';

const radioLimiterFn = pLimit(20);
const limiterFn = pLimit(1);

const { TARGET_PLAYLIST, TARGET_USERNAME } = process.env;

import getSongs from './getSongs.mjs';
import Spotify from './spotify.mjs';

const splitIntoChunks = (array, chunk = 100) =>
  array.map((elem, i) => (i % chunk ? [] : [array.slice(i, i + chunk)])).flat();

const AMOUNT = 20000;

const progress = (i, all) => {
  if (i === all) return '100.00%';
  if (i === 0) return '0.00%';
  const v = (i / all) * 100;
  const float = parseInt(v * 100, 10) / 100;
  return Number.parseFloat(float).toFixed(2);
};

(async () => {
  try {
    const spotify = new Spotify();

    await spotify.authenticate();

    const songsPromise = getSongs(AMOUNT, radioLimiterFn);
    let waitingInterval = setInterval(() => {
      const fs = AMOUNT - (radioLimiterFn.activeCount + radioLimiterFn.pendingCount) * 10;
      process.stdout.write(`\rExtracted Song: ${fs}/${AMOUNT} => ${progress(fs, AMOUNT)}`);
    }, 200);
    const resolvedSongs = (await Promise.all(songsPromise)).flat();
    const songs = uniqBy(resolvedSongs, ({ artist, track }) => `${artist.toLowerCase()}-${track.toLowerCase()}`);
    clearInterval(waitingInterval);
    process.stdout.write(`\nExtracted ${songs.length} songs from radio\n`);

    const playlist = await Spotify.findPlaylist(TARGET_PLAYLIST, TARGET_USERNAME);

    const foundSongsPromise = songs.map((song) => Spotify.findSong(limiterFn, song));
    waitingInterval = setInterval(() => {
      const fs = AMOUNT - (limiterFn.activeCount + limiterFn.pendingCount);
      process.stdout.write(`\rFound Song: ${fs}/${AMOUNT} => ${progress(fs, AMOUNT)}`);
    }, 200);
    const foundSongs = await Promise.all(foundSongsPromise);
    clearInterval(waitingInterval);
    process.stdout.write(`\nFound Songs: ${foundSongs.length}\n`);

    const toAdd = foundSongs.filter(Boolean).map(({ id }) => `spotify:track:${id}`);
    const chunks = splitIntoChunks(toAdd, 25);
    let addedItems = 0;
    for (const chunk of chunks) {
      await Spotify.addSongsToPlaylist(chunk, playlist.id);
      addedItems += chunk.length;
      process.stdout.write(`\rAdded Songs: ${addedItems}/${AMOUNT} => ${progress(addedItems, AMOUNT)}`);
    }
    process.stdout.write(`\nAdded Songs: ${toAdd.length}`);
  } catch (e) {
    console.error(e);
  }
})();
