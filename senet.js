const boardEl = document.getElementById("board");
const rollBtn = document.getElementById("rollBtn");
const rollResultEl = document.getElementById("rollResult");
const turnInfoEl = document.getElementById("turnInfo");
const statusEl = document.getElementById("status");

// 30 squares, path: row1 left→right, row2 right→left, row3 left→right
// We'll index 0..29 internally, but show 1..30
const BOARD_SIZE = 30;
const PIECES_PER_PLAYER = 5;

const ONE_PLAYER = true; // P1 = human, P2 = AI

let board = new Array(BOARD_SIZE).fill(null); // "P1" | "P2" | null
let currentPlayer = "P1";
let rollValue = null;
let gameOver = false;

// initial placement: first 5 squares P1, next 5 squares P2 (simple start)
function initBoard() {
  board = new Array(BOARD_SIZE).fill(null);
  for (let i = 0; i < PIECES_PER_PLAYER; i++) {
    board[i] = "P1";
    board[i + PIECES_PER_PLAYER] = "P2";
  }
  currentPlayer = "P1";
  rollValue = null;
  gameOver = false;
  rollResultEl.textContent = "Roll: -";
  statusEl.textContent = "Game started. P1 begins.";
  updateTurnInfo();
  renderBoard();
}

function renderBoard() {
  boardEl.innerHTML = "";
  for (let i = 0; i < BOARD_SIZE; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    const displayIndex = i + 1;
    const idxLabel = document.createElement("div");
    idxLabel.className = "index";
    idxLabel.textContent = displayIndex;
    cell.appendChild(idxLabel);

    const occupant = board[i];
    if (occupant) {
      const span = document.createElement("span");
      span.textContent = occupant === "P1" ? "●" : "○";
      span.className = occupant === "P1" ? "p1" : "p2";
      cell.appendChild(span);
    }

    if (!ONE_PLAYER || currentPlayer === "P1") {
      cell.addEventListener("click", () => onCellClick(i));
    }

    boardEl.appendChild(cell);
  }
}

function updateTurnInfo() {
  turnInfoEl.textContent = `Turn: ${currentPlayer}`;
}

function rollSticks() {
  if (gameOver) return;
  // 4 sticks, each 0 or 1, sum is 0..4; if 0, re-roll
  let sum = 0;
  do {
    sum = 0;
    for (let i = 0; i < 4; i++) {
      sum += Math.random() < 0.5 ? 0 : 1;
    }
  } while (sum === 0);

  rollValue = sum;
  rollResultEl.textContent = `Roll: ${rollValue}`;
  statusEl.textContent = `You rolled ${rollValue}. Select a piece to move.`;
}

function onCellClick(index) {
  if (gameOver) return;
  if (rollValue === null) {
    statusEl.textContent = "Roll the sticks first.";
    return;
  }

  const occupant = board[index];
  if (!occupant) {
    statusEl.textContent = "Select one of your pieces.";
    return;
  }

  if (occupant !== currentPlayer) {
    statusEl.textContent = "You can only move your own pieces.";
    return;
  }

  const targetIndex = index + rollValue;
  if (targetIndex >= BOARD_SIZE) {
    // moving off the board: only allowed if exact
    // here: if beyond last, cannot move
    statusEl.textContent = "You cannot move off the board with this roll.";
    return;
  }

  const targetOccupant = board[targetIndex];

  if (!targetOccupant) {
    // simple move
    board[targetIndex] = occupant;
    board[index] = null;
    statusEl.textContent = `${currentPlayer} moved from ${index+1} to ${targetIndex+1}.`;
  } else if (targetOccupant !== currentPlayer) {
    // swap
    board[targetIndex] = occupant;
    board[index] = targetOccupant;
    statusEl.textContent = `${currentPlayer} swapped with opponent at ${targetIndex+1}.`;
  } else {
    statusEl.textContent = "You cannot land on your own piece.";
    return;
  }

  rollValue = null;
  rollResultEl.textContent = "Roll: -";

  checkWin();
  if (!gameOver) {
    switchPlayer();
  }
  renderBoard();
}

function switchPlayer() {
  currentPlayer = currentPlayer === "P1" ? "P2" : "P1";
  updateTurnInfo();

  if (ONE_PLAYER && currentPlayer === "P2" && !gameOver) {
    setTimeout(aiTakeTurn, 600);
  }
}


function checkWin() {
  const p1Pieces = board.filter(x => x === "P1").length;
  const p2Pieces = board.filter(x => x === "P2").length;

  if (p1Pieces === 0) {
    statusEl.textContent = "Player 1 has borne off all pieces and wins!";
    gameOver = true;
  } else if (p2Pieces === 0) {
    statusEl.textContent = "Player 2 has borne off all pieces and wins!";
    gameOver = true;
  }
}

function aiRoll() {
  let sum = 0;
  do {
    sum = 0;
    for (let i = 0; i < 4; i++) {
      sum += Math.random() < 0.5 ? 0 : 1;
    }
  } while (sum === 0);
  return sum;
}

function aiGenerateMoves() {
  const moves = [];

  for (let i = 0; i < BOARD_SIZE; i++) {
    const u = board[i];
    if (u !== "P2") continue;

    const target = i + rollValue;
    if (target >= BOARD_SIZE) continue;

    const occupant = board[target];

    if (!occupant) {
      moves.push({ from: i, to: target, type: "move", score: 10 });
    } else if (occupant === "P1") {
      moves.push({ from: i, to: target, type: "swap", score: 50 });
    }
  }

  return moves;
}

function aiChooseMove(moves) {
  if (moves.length === 0) return null;

  // Prefer swaps > forward progress
  moves.sort((a, b) => b.score - a.score);
  return moves[0];
}

function aiTakeTurn() {
  if (gameOver || currentPlayer !== "P2") return;

  rollValue = aiRoll();
  rollResultEl.textContent = `Roll: ${rollValue}`;
  statusEl.textContent = `AI rolled ${rollValue}.`;

  const moves = aiGenerateMoves();
  const best = aiChooseMove(moves);

  if (!best) {
    statusEl.textContent = "AI has no legal moves.";
    rollValue = null;
    switchPlayer();
    return;
  }

  // apply move
  const { from, to, type } = best;

  if (type === "swap") {
    const temp = board[to];
    board[to] = "P2";
    board[from] = temp;
    statusEl.textContent = `AI swapped at ${to + 1}.`;
  } else {
    board[to] = "P2";
    board[from] = null;
    statusEl.textContent = `AI moved from ${from + 1} to ${to + 1}.`;
  }

  rollValue = null;
  rollResultEl.textContent = "Roll: -";

  checkWin();
  if (!gameOver) switchPlayer();
  renderBoard();
}


rollBtn.addEventListener("click", rollSticks);

initBoard();
