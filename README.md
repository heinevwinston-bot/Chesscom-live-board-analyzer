
A Chrome extension that reads the board on a live Chess.com game and overlays
the Stockfish-recommended move as an arrow, updating automatically as the
game progresses.

![Screenshot](screenshot.png)

## Before you use this

Using engine assistance during a live/rated game violates Chess.com's Fair
Play rules and can get your account flagged or banned. This tool is meant
for **post-game analysis, practice against friends, or study** — not for
getting moves during rated play. Use responsibly.

## Features

- Reads the live board directly from the page — no manual FEN entry
- Calls a hosted Stockfish 17 engine for the best move
- Draws an arrow overlay directly on the board
- Shows evaluation (centipawns or mate-in-N) in a status badge
- On/off toggle and adjustable engine depth from the extension popup
- Polls the board every 700ms, so it keeps up during fast/bot games

## Installation

Since this isn't published on the Chrome Web Store, you'll install it as an
unpacked extension:

1. Download this repository:
   - Click **Code → Download ZIP**, or
   - `git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git`
2. Unzip it if needed.
3. Open Chrome and go to `chrome://extensions`.
4. Turn on **Developer mode** (top-right toggle).
5. Click **Load unpacked** and select the project folder (the one containing `manifest.json`).
6. Pin the extension, open a Chess.com game, click the icon, and turn **Enabled** on.

## How it works

- `fen-builder.js` scrapes the `.piece` elements on the board (Chess.com
  encodes each piece's square in its CSS class) and reconstructs a FEN string.
- `content.js` polls the board, and whenever the position changes, sends the
  FEN to [chess-api.com](https://chess-api.com) (a free hosted Stockfish
  endpoint) and draws an arrow for the returned best move.
- `popup.html`/`popup.js` provide the on/off toggle and depth slider,
  stored in `chrome.storage.local`.

## Known limitations

- **En passant** isn't detected (rare edge case).
- **Castling rights** are approximated from king/rook starting squares.
- Whoever's turn it is is inferred from the move-list panel; if Chess.com
  changes that markup, this can misfire — check the on-board status badge.
- No local/offline engine — requires a network call per move (see
  "Going fully offline" below to remove this dependency).

## Troubleshooting

Chess.com periodically changes their internal markup, which can break board
reading. If the extension stops detecting the board:

1. On a live game, right-click a piece → **Inspect**.
2. Check the piece's class names (e.g. `wp`, `bn`) and square class
   (e.g. `square-52`).
3. Update `PIECE_CLASS_REGEX` / `SQUARE_CLASS_REGEX` in `fen-builder.js`
   to match.
4. Reload the extension and the page.

## Going fully offline (optional)

To avoid any network calls, swap the engine call in `content.js` for a
local Stockfish WASM worker:

1. `npm install stockfish` (or download a release).
2. Copy `stockfish.js` + `stockfish.wasm` into the project.
3. Add a background/offscreen document that runs Stockfish via UCI
   commands and messages the result back to the content script.

## License

MIT — see [LICENSE](LICENSE).

## Contributing

Issues and PRs welcome, especially fixes for Chess.com DOM changes —
see the Troubleshooting section for what usually needs updating.
