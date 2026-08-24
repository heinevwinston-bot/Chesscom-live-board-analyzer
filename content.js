// content.js
// Orchestrates: read board -> ask engine -> draw overlay. Re-runs whenever
// the board changes (new move played) while the toggle is enabled.

const ENGINE_ENDPOINT = "https://chess-api.com/v1";
const STATE = {
  enabled: false,
  depth: 14,
  lastFen: null,
  requestInFlight: false,
};

function getBoardEl() {
  return document.querySelector("wc-chess-board, chess-board, .board");
}

function clearOverlay() {
  const existing = document.getElementById("chess-assist-overlay");
  if (existing) existing.remove();
}

// Converts a square like "e4" to the pixel center within the board element,
// accounting for whether the board is flipped (playing as black).
function squareToXY(square, boardSize, isFlipped) {
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  let fileIdx = files.indexOf(square[0]);
  let rankIdx = Number(square[1]) - 1;
  if (isFlipped) {
    fileIdx = 7 - fileIdx;
    rankIdx = 7 - rankIdx;
  }
  const squareSize = boardSize / 8;
  const x = fileIdx * squareSize + squareSize / 2;
  const y = (7 - rankIdx) * squareSize + squareSize / 2;
  return { x, y };
}

function drawArrow(fromSquare, toSquare) {
  clearOverlay();
  const board = getBoardEl();
  if (!board) return;

  const rect = board.getBoundingClientRect();
  const isFlipped = board.classList.contains("flipped");
  const from = squareToXY(fromSquare, rect.width, isFlipped);
  const to = squareToXY(toSquare, rect.width, isFlipped);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.id = "chess-assist-overlay";
  svg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
  svg.style.position = "absolute";
  svg.style.left = "0";
  svg.style.top = "0";
  svg.style.width = "100%";
  svg.style.height = "100%";
  svg.style.pointerEvents = "none";
  svg.style.zIndex = "1000";

  const marker = document.createElementNS("http://www.w3.org/2000/svg", "defs").outerHTML;
  svg.innerHTML = `
    <defs>
      <marker id="ca-arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill="#1baca6" />
      </marker>
    </defs>
    <line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"
      stroke="#1baca6" stroke-width="10" stroke-linecap="round"
      opacity="0.85" marker-end="url(#ca-arrowhead)" />
  `;

  const boardContainer = board.parentElement;
  boardContainer.style.position = boardContainer.style.position || "relative";
  boardContainer.appendChild(svg);
}

function showStatus(text) {
  let badge = document.getElementById("chess-assist-badge");
  if (!badge) {
    badge = document.createElement("div");
    badge.id = "chess-assist-badge";
    const board = getBoardEl();
    if (board && board.parentElement) board.parentElement.appendChild(badge);
  }
  badge.textContent = text;
}

async function askEngine(fen) {
  const response = await fetch(ENGINE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fen, depth: STATE.depth, maxThinkingTime: 100 }),
  });
  if (!response.ok) throw new Error(`Engine request failed: ${response.status}`);
  return response.json();
}

async function analyzeCurrentPosition() {
  if (!STATE.enabled || STATE.requestInFlight) return;

  const fen = window.__chessAssist.buildFenFromDom();
  if (!fen || fen === STATE.lastFen) return;

  STATE.lastFen = fen;
  STATE.requestInFlight = true;
  showStatus("Analyzing…");

  try {
    const result = await askEngine(fen);
    if (!STATE.enabled) return; // toggled off while waiting
    if (result.from && result.to) {
      drawArrow(result.from, result.to);
      const evalText = result.mate !== null && result.mate !== undefined
        ? `Mate in ${Math.abs(result.mate)}`
        : `Eval ${result.eval}`;
      showStatus(`Best: ${result.san || result.move} (${evalText})`);
    } else {
      showStatus("No move returned");
    }
  } catch (err) {
    console.error("[Chess Assist] engine error:", err);
    showStatus("Engine error — see console");
  } finally {
    STATE.requestInFlight = false;
  }
}

// Polling beats MutationObserver here: chess.com (and especially bot games)
// animate pieces via transform/class changes that don't reliably fire a
// single clean mutation event, so a mutation-only approach misses moves.
// Checking the board every ~700ms is simple and never misses a move for
// more than a fraction of a second.
const POLL_INTERVAL_MS = 700;

function startPolling() {
  setInterval(() => {
    if (STATE.enabled) analyzeCurrentPosition();
  }, POLL_INTERVAL_MS);
}

function setEnabled(enabled) {
  STATE.enabled = enabled;
  if (!enabled) {
    clearOverlay();
    showStatus("");
    STATE.lastFen = null;
  } else {
    analyzeCurrentPosition();
  }
}

chrome.storage.local.get(["enabled", "depth"], (data) => {
  STATE.enabled = !!data.enabled;
  STATE.depth = data.depth || 14;
  startPolling();
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) setEnabled(changes.enabled.newValue);
  if (changes.depth) STATE.depth = changes.depth.newValue;
});
