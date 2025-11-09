# Quest for the One Piece — Nautical Edition (Rohit's Birthday)

A polished, nautical One Piece–style quest site with animated waves, compass, and time-locked islands.

## How it works
- **Wed Nov 12, 12:00am ET**: Auto confetti + birthday message.
- **Sat Nov 15 (ET)**: Each island unlocks at its scheduled time **and** only after the previous island is marked cleared.
- **Preview/testing**: add `?preview=1` to the URL to bypass locks.
- Progress persists via `localStorage`.

## Customize
- Replace `/assets/photo-*.jpg` with your photos; update paths in `window.BDAY_CONFIG` if renamed.
- Put a song at `/assets/song.mp3` (or remove the button).
- Edit `window.BDAY_CONFIG` in `index.html` to set times, titles, clues, and map links.
  - Keep `final:true` on the LIC island to trigger the ring modal when cleared.

## Netlify Deploy (static)
1. New GitHub repo → add files → push.
2. Netlify → Add new site → Import from Git → choose repo.
3. Build command: **none**. Publish directory: **/**.
4. Deploy → share your `https://<name>.netlify.app` link at midnight.

Enjoy, Captain. ⚓️
