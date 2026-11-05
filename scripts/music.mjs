// The office speaker's songs: audio files a person puts in the music/ folder (it is git-ignored, so songs are never
// committed or pushed). Mission control lists them and streams one to the page; nothing is downloaded from anywhere.
//
//   music/            put .mp3, .m4a, .aac, .ogg, .opus, .wav or .flac files here
//   GET /api/music    the list: [{ file, title }]
//   GET /music/<file> one song, with byte ranges so the player can seek
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const MUSIC_DIR = 'music';
const TYPES = { '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.ogg': 'audio/ogg', '.opus': 'audio/ogg', '.wav': 'audio/wav', '.flac': 'audio/flac' };
const ext = (f) => f.slice(f.lastIndexOf('.')).toLowerCase();

// "01 - Badtameez_Dil.mp3" -> "Badtameez Dil", "10 Kesariya.m4a" -> "Kesariya" (a track number is dropped)
export const titleOf = (file) => file.replace(/\.[^.]+$/, '').replace(/^\d{1,2}(\s*[-._)]\s*|\s+)/, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();

export function listSongs(root) {
  const dir = join(root, MUSIC_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => TYPES[ext(f)] && !f.startsWith('.') && statSync(join(dir, f)).isFile())
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((file) => ({ file, title: titleOf(file) }));
}

// Streams one song. Only a file that is in the list can be sent, so no other path on the computer is reachable.
export function sendSong(root, file, req, res, headers = {}) {
  if (!listSongs(root).some((s) => s.file === file)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...headers });
    return res.end('No such song.');
  }
  const path = join(root, MUSIC_DIR, file);
  const size = statSync(path).size;
  const base = { 'Content-Type': TYPES[ext(file)], 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store', ...headers };
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (!range || (range[1] === '' && range[2] === '')) {
    res.writeHead(200, { ...base, 'Content-Length': size });
    return createReadStream(path).pipe(res);
  }
  let start = range[1] === '' ? size - Number(range[2]) : Number(range[1]);
  let end = range[1] === '' || range[2] === '' ? size - 1 : Number(range[2]);
  start = Math.max(0, start);
  end = Math.min(size - 1, end);
  if (start > end || start >= size) {
    res.writeHead(416, { ...base, 'Content-Range': `bytes */${size}` });
    return res.end();
  }
  res.writeHead(206, { ...base, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
  return createReadStream(path, { start, end }).pipe(res);
}
