import fetch from 'node-fetch';
import { load } from 'cheerio';

const ACCEPT_HEADER = 'text/vnd.turbo-stream.html';
const RADIO_STATION = 'relax';
const BASE_URL = new URL(`https://absolutradio.de/playlistsuche?selected_station=${RADIO_STATION}`);
const PAGE_SIZE = 10;

const extractSongs = (data) => {
  const cheerio = load(data);

  const artists = cheerio('div > div > div:nth-child(2)');
  const tracks = cheerio('div > div > div:nth-child(3)');

  const results = [];

  for (let i = 0; i < artists.length; i++) {
    const [{ data: artist }] = artists[i].children;
    const [{ data: track }] = tracks[i].children;

    results.push({
      artist,
      track,
    });
  }

  return results;
};

const getSongs = async (page = 1) => {
  const { href, search } = BASE_URL;
  const searchParams = new URLSearchParams(search);
  const baseUrl = href.replace(search, '');

  searchParams.set('page', page);

  const fullUrl = new URL(`${baseUrl}?${searchParams.toString()}`);

  const headers = new Map();
  headers.set('accept', ACCEPT_HEADER);
  const response = await fetch(fullUrl, { headers });
  const data = await response.text();

  const songs = extractSongs(data);

  return songs;
};

export default (amount, limiterFn) => {
  const pages = amount / PAGE_SIZE;
  return [...Array(pages)].map((_, page) => limiterFn(() => getSongs(page)));
};
