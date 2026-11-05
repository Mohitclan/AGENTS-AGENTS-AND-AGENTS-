// The office speaker's player. The songs are the person's own files in the music/ folder; mission control lists
// them at /api/music and streams each from /music/<file>. While a song plays the office has a party: every agent
// with no work goes to the dance floor around the speaker. The list plays round until someone presses Pause or
// Stop; then they go back to what they were doing.
//
// There is one player for the page, so switching the cast (which rebuilds the office) doesn't stop the song.
// Leaving the office page does: a player with no office for a moment pauses itself.

// Which song comes after `index` in a list of `count`, or -1 when there are none. It wraps round to the first.
export const nextIndex = (index, count) => (count ? (index + 1 + count) % count : -1);

function makePlayer() {
  const audio = new Audio();
  audio.preload = 'none';
  const listeners = new Set();
  const state = { songs: [], index: -1, playing: false, loaded: false, error: '' };
  const emit = () => {
    for (const fn of listeners) fn(state);
  };
  let offices = 0;
  let orphanTimer = 0;

  audio.addEventListener('playing', () => {
    state.playing = true;
    state.error = '';
    emit();
  });
  audio.addEventListener('pause', () => {
    if (audio.ended) return; // a song finishing is not a pause: the next one starts, and the dancing goes on
    state.playing = false;
    emit();
  });
  // The music carries on until someone stops it: the next song, or the same one again when there is only one.
  audio.addEventListener('ended', () => {
    if (state.songs.length) player.play(nextIndex(state.index, state.songs.length));
  });
  audio.addEventListener('error', () => {
    if (!audio.src) return;
    state.playing = false;
    state.error = "That song couldn't be played. Check the file in the music folder.";
    emit();
  });

  const player = {
    state,
    async load() {
      try {
        const r = await fetch('/api/music', { cache: 'no-store' });
        if (!r.ok) throw new Error(String(r.status));
        const { songs } = await r.json();
        const current = state.songs[state.index]?.file;
        state.songs = Array.isArray(songs) ? songs : [];
        state.index = state.songs.findIndex((s) => s.file === current);
        state.error = '';
      } catch {
        state.error = "Couldn't read the song list.";
      }
      state.loaded = true;
      emit();
      return state.songs;
    },
    play(index = state.index < 0 ? 0 : state.index) {
      const song = state.songs[index];
      if (!song) return;
      if (index !== state.index || !audio.src) {
        state.index = index;
        audio.src = `/music/${encodeURIComponent(song.file)}`;
      }
      state.error = '';
      audio.play().catch(() => {
        state.error = 'The browser blocked the sound. Click play again.';
        emit();
      });
      emit();
    },
    pause() {
      audio.pause();
    },
    toggle() {
      if (state.playing) audio.pause();
      else player.play();
    },
    next() {
      if (state.songs.length) player.play(nextIndex(state.index, state.songs.length));
    },
    stop() {
      audio.pause();
      if (audio.src) audio.currentTime = 0;
      state.playing = false;
      emit();
    },
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    // An office shows the player while it is open. With none open for a moment (the person left the page, rather
    // than the office being rebuilt), the music pauses.
    attach() {
      offices += 1;
      clearTimeout(orphanTimer);
      return () => {
        offices -= 1;
        if (offices > 0) return;
        clearTimeout(orphanTimer);
        orphanTimer = setTimeout(() => {
          if (offices === 0) player.stop();
        }, 1500);
      };
    },
  };
  return player;
}

let shared = null;
export const musicPlayer = () => (shared ??= makePlayer());
