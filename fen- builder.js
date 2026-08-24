// fen-builder.js
// Scrapes Chess.com's live board DOM and turns it into a FEN string.
//
// Chess.com renders each piece as a <div> with two classes we care about:
//   - a piece code, e.g. "wp" (white pawn), "bk" (black king)
//   - a square code, e.g. "square-15" where the tens digit = file (1-8 => a-h)
//     and the ones digit = rank (1-8). square-11 = a1, square-88 = h8.
//
// This convention has been stable across chess.com's board versions for years,
// but if chess.com changes their markup, use DevTools to inspect a live game
// (right-click a piece -> Inspect) and update PIECE_CLASS_REGEX / SQUARE_REGEX
// below to match the new class names.

const PIECE_CLASS_REGEX = /\b(w|b)(p|n|b|r|q|k)\b/;
const SQUARE_CLASS_REGEX = /\bsquare-(\d)(\d)\b/;

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

function squareCodeToAlgebraic(fileDigit, rankDigit) {
  const file = FILES[Number(fileDigit) - 1];
  const rank = rankDigit; // rank digit is already 1-8
  return `${file}${rank}`;
}

// Reads every .piece element on the board and returns a map of
// { "e4": "wp", "e5": "bp", ... }
function readPiecePositions() {
  const board = document.querySelector("wc-chess-board, chess-board, .board");
  if (!board) return null;

  const pieceEls = board.querySelectorAll(".piece");
  if (!pieceEls.length) return null;

  const positions = {};
  pieceEls.forEach((el) => {
    const classes = el.className;
    const pieceMatch = classes.match(PIECE_CLASS_REGEX);
    const squareMatch = classes.match(SQUARE_CLASS_REGEX);
    if (!pieceMatch || !squareMatch) return;

    const color = pieceMatch[1]; // 'w' or 'b'
    const piece = pieceMatch[2]; // p n b r q k
    const square = squareCodeToAlgebraic(squareMatch[1], squareMatch[2]);
    positions[square] = color + piece;
  });

  return Object.keys(positions).length ? positions : null;
}

// Builds the board-part of a FEN string ("piece placement") from the
// position map returned by readPiecePositions().
function positionsToFenBoard(positions) {
  const rows = [];
  for (let rank = 8; rank >= 1; rank--) {
    let emptyCount = 0;
    let row = "";
    for (let fileIdx = 0; fileIdx < 8; fileIdx++) {
      const square = `${FILES[fileIdx]}${rank}`;
      const piece = positions[square];
      if (!piece) {
        emptyCount++;
        continue;
      }
      if (emptyCount > 0) {
        row += emptyCount;
        emptyCount = 0;
      }
      const [color, type] = [piece[0], piece[1]];
      const letter = color === "w" ? type.toUpperCase() : type;
      row += letter;
    }
    if (emptyCount > 0) row += emptyCount;
    rows.push(row);
  }
  return rows.join("/");
}

// Figures out whose turn it is by counting completed half-moves in the
// move list panel. Falls back to the player-clock highlight if the move
// list isn't found.
function countPlayedHalfMoves() {
  const selectors = [
    "[data-ply]",
    ".move-list-row .node",
    "vertical-move-list .node",
    ".move-list .white-move, .move-list .black-move",
    ".move .white-move, .move .black-move",
  ];
  for (const selector of selectors) {
    const nodes = document.querySelectorAll(selector);
    if (nodes.length) return nodes.length;
  }
  return 0;
}

function readSideToMove() {
  const moveCount = countPlayedHalfMoves();
  if (moveCount) {
    // Odd number of played half-moves => it's black's turn, even => white's.
    return moveCount % 2 === 0 ? "w" : "b";
  }

  const whiteClock = document.querySelector(
    ".clock-white.clock-player-turn, .clock-bottom.clock-player-turn"
  );
  if (whiteClock) return "w";
  const blackClock = document.querySelector(
    ".clock-black.clock-player-turn, .clock-top.clock-player-turn"
  );
  if (blackClock) return "b";

  return "w"; // safe default; user can flip with the popup if needed
}

// Approximates castling rights by checking whether king/rooks are still
// on their starting squares. This is a heuristic (it doesn't know if a
// piece has *moved and come back*), which is an acceptable trade-off for
// move suggestions -- it only affects legality of castling itself.
function approximateCastlingRights(positions) {
  let rights = "";
  if (positions.e1 === "wk" && positions.h1 === "wr") rights += "K";
  if (positions.e1 === "wk" && positions.a1 === "wr") rights += "Q";
  if (positions.e8 === "bk" && positions.h8 === "br") rights += "k";
  if (positions.e8 === "bk" && positions.a8 === "br") rights += "q";
  return rights || "-";
}

// Public entry point: returns a full FEN string, or null if the board
// couldn't be read (e.g. not on a game page yet).
function buildFenFromDom() {
  const positions = readPiecePositions();
  if (!positions) return null;

  const boardPart = positionsToFenBoard(positions);
  const sideToMove = readSideToMove();
  const castling = approximateCastlingRights(positions);
  // En passant target and exact move clocks aren't tracked by this
  // lightweight reader; "-" and placeholder counters are fine for move
  // suggestions (they don't affect Stockfish's chosen move in the vast
  // majority of positions).
  const enPassant = "-";
  const halfmoveClock = "0";
  const fullmoveNumber = String(Math.floor(countPlayedHalfMoves() / 2) + 1);

  return `${boardPart} ${sideToMove} ${castling} ${enPassant} ${halfmoveClock} ${fullmoveNumber}`;
}

window.__chessAssist = window.__chessAssist || {};
window.__chessAssist.buildFenFromDom = buildFenFromDom;
