const entries = [
  { id: "a1", n: 1, dir: "across", answer: "SORGULAMA", row: 3, col: 2, clue: "Sorgulamak işi. Bir bilgiyi derinlemesine inceleme, araştırma ve hakikati arama süreci." },
  { id: "a2", n: 2, dir: "across", answer: "SORU", row: 5, col: 0, clue: "Bir şey öğrenmek için birine yöneltilen ve karşılık gerektiren söz veya yazı." },
  { id: "a3", n: 3, dir: "across", answer: "ELEŞTİRİ", row: 5, col: 7, clue: "Bir insanı, eseri veya konuyu doğru ve yanlış yanlarını göstermek amacıyla inceleme işi." },
  { id: "a4", n: 4, dir: "across", answer: "MERAK", row: 7, col: 6, clue: "Bir şeyi anlamak veya öğrenmek için duyulan istek." },
  { id: "a5", n: 5, dir: "across", answer: "DÜŞÜNCE", row: 9, col: 2, clue: "Duyularla değil, ruhen algılanabilen; öznenin dışında kendiliğinden var olan asıl gerçeklik." },
  { id: "a6", n: 6, dir: "across", answer: "SEZGİ", row: 10, col: 10, clue: "Bilginin akıl yürütme veya delile ihtiyaç duyulmadan, birdenbire elde edilmesi." },
  { id: "a7", n: 7, dir: "across", answer: "AKIL", row: 12, col: 5, clue: "Düşünme, anlama ve kavrama gücü." },
  { id: "d8", n: 8, dir: "down", answer: "YORUM", row: 2, col: 3, clue: "Bir yazının veya sözün anlaşılması güç yönlerini açıklayarak aydınlığa kavuşturma." },
  { id: "d9", n: 9, dir: "down", answer: "BİLGİ", row: 0, col: 5, clue: "İnsan aklının erebileceği olgu, gerçek ve ilkelerin bütünü." },
  { id: "d10", n: 10, dir: "down", answer: "FELSEFE", row: 1, col: 7, clue: "Varlığın ve bilginin bilimsel olarak araştırılması." },
  { id: "d12", n: 4, dir: "down", answer: "MANTIK", row: 7, col: 6, clue: "Doğru düşünme sanatı ve bilimi." },
  { id: "d11", n: 11, dir: "down", answer: "HİPOTEZ", row: 4, col: 12, clue: "Varsayım; deneylerle henüz yeterince doğrulanmamış ancak doğrulanacağı umulan teorik düşünce." }
];

const board = document.querySelector("#crossword");
const bank = document.querySelector("#letter-bank");
const message = document.querySelector("#message");
const progressText = document.querySelector("#progress-text");
const progressFill = document.querySelector("#progress-fill");
const modal = document.querySelector("#success-modal");
const cells = new Map();
let selectedTile = null;
let activeEntry = null;
let gameCompleted = false;

function key(row, col) { return `${row}-${col}`; }

entries.forEach(entry => {
  [...entry.answer].forEach((letter, i) => {
    const row = entry.row + (entry.dir === "down" ? i : 0);
    const col = entry.col + (entry.dir === "across" ? i : 0);
    const id = key(row, col);
    if (!cells.has(id)) cells.set(id, { row, col, letter, entries: [] });
    if (cells.get(id).letter !== letter) console.warn("Uyumsuz kesişim:", entry.answer, id);
    cells.get(id).entries.push(entry.id);
  });
});

const startNumbers = new Map();
entries.forEach(entry => {
  const id = key(entry.row, entry.col);
  if (!startNumbers.has(id)) startNumbers.set(id, []);
  if (!startNumbers.get(id).includes(entry.n)) startNumbers.get(id).push(entry.n);
});

function buildClues(direction, targetId) {
  const target = document.querySelector(targetId);
  entries.filter(e => e.dir === direction).forEach(entry => {
    const button = document.createElement("button");
    button.className = "clue";
    button.dataset.entry = entry.id;
    button.innerHTML = `<span class="clue-number">${entry.n}</span><span class="clue-text">${entry.clue}</span>`;
    button.addEventListener("click", () => selectEntry(entry.id));
    target.append(button);
  });
}

function buildBoard() {
  [...cells.entries()].sort(([a], [b]) => a.localeCompare(b)).forEach(([id, data]) => {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.key = id;
    cell.dataset.answer = data.letter;
    cell.dataset.entries = data.entries.join(" ");
    cell.style.left = `calc(${data.col} * var(--cell))`;
    cell.style.top = `calc((${data.row} - 1) * var(--cell))`;
    cell.setAttribute("role", "gridcell");
    cell.setAttribute("aria-label", `${data.row}. satır ${data.col}. sütun, boş kutu`);
    const input = document.createElement("input");
    input.className = "cell-input";
    input.type = "text";
    input.inputMode = "text";
    input.maxLength = 1;
    input.autocomplete = "off";
    input.autocapitalize = "characters";
    input.spellcheck = false;
    input.setAttribute("aria-label", `${data.row}. satır ${data.col}. sütun harfi`);
    cell.append(input);
    if (startNumbers.has(id)) {
      const badge = document.createElement("span");
      badge.className = "cell-number";
      badge.textContent = startNumbers.get(id).join("/");
      cell.append(badge);
    }
    cell.addEventListener("dragover", e => { e.preventDefault(); cell.classList.add("target"); });
    cell.addEventListener("dragleave", () => cell.classList.remove("target"));
    cell.addEventListener("drop", e => {
      e.preventDefault();
      cell.classList.remove("target");
      const tile = document.querySelector(`[data-tile-id="${e.dataTransfer.getData("text/plain")}"]`);
      if (tile) placeTile(tile, cell);
    });
    cell.addEventListener("click", () => { if (selectedTile) placeTile(selectedTile, cell); else { ensureCellEntry(cell); input.focus(); } });
    input.addEventListener("focus", () => ensureCellEntry(cell));
    input.addEventListener("input", () => handleTypedInput(cell, input));
    input.addEventListener("keydown", e => handleCellKeydown(e, cell));
    board.append(cell);
    data.el = cell;
  });
}

function buildTiles() {
  bank.innerHTML = "";
  const letters = [..."ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ"];
  letters.forEach((letter, i) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "tile";
    tile.draggable = true;
    tile.dataset.tileId = `tile-${i}`;
    tile.dataset.letter = letter;
    tile.textContent = letter;
    tile.setAttribute("aria-label", `${letter} harfi`);
    tile.addEventListener("dragstart", e => e.dataTransfer.setData("text/plain", tile.dataset.tileId));
    tile.addEventListener("click", () => selectTile(tile));
    bank.append(tile);
  });
}

function selectTile(tile) {
  if (selectedTile === tile) {
    tile.classList.remove("selected");
    selectedTile = null;
    return;
  }
  selectedTile?.classList.remove("selected");
  selectedTile = tile;
  tile.classList.add("selected");
  message.textContent = `${tile.dataset.letter} harfi seçildi. Şimdi bir kutuya dokun.`;
}

function placeTile(tile, cell) {
  if (cell.classList.contains("locked")) return;
  if (cell.dataset.tileId) removeFromCell(cell);
  cell.querySelector(".cell-input").value = tile.dataset.letter;
  cell.dataset.value = tile.dataset.letter;
  cell.dataset.tileId = "";
  tile.classList.remove("selected");
  selectedTile = null;
  cell.classList.remove("wrong", "correct");
  updateProgress();
  updateSolvedClues();
  checkForAutomaticCompletion();
}

function removeFromCell(cell) {
  const tile = document.querySelector(`[data-tile-id="${cell.dataset.tileId}"]`);
  if (tile) { tile.classList.remove("used"); tile.dataset.cell = ""; }
  cell.querySelector(".cell-input").value = "";
  cell.dataset.value = "";
  cell.dataset.tileId = "";
  cell.classList.remove("wrong", "correct");
  updateProgress();
  updateSolvedClues();
}

function focusCellEntry(cell) {
  const ids = cell.dataset.entries.split(" ");
  const next = ids.length > 1 && activeEntry === ids[0] ? ids[1] : ids[0];
  selectEntry(next);
}

function ensureCellEntry(cell) {
  const ids = cell.dataset.entries.split(" ");
  selectEntry(ids.includes(activeEntry) ? activeEntry : ids[0]);
}

function handleTypedInput(cell, input) {
  const letter = [...input.value.toLocaleUpperCase("tr-TR")].find(ch => /[A-ZÇĞİÖŞÜ]/.test(ch)) || "";
  if (cell.dataset.tileId) removeFromCell(cell);
  input.value = letter;
  cell.dataset.value = letter;
  cell.classList.remove("wrong", "correct");
  updateProgress();
  updateSolvedClues();
  if (letter) focusNextCell(cell);
  checkForAutomaticCompletion();
}

function handleCellKeydown(event, cell) {
  if (event.key === "Backspace" && !cell.querySelector(".cell-input").value) {
    event.preventDefault();
    focusPreviousCell(cell);
  }
  if (event.key === "ArrowRight" || event.key === "ArrowDown") { event.preventDefault(); focusNextCell(cell); }
  if (event.key === "ArrowLeft" || event.key === "ArrowUp") { event.preventDefault(); focusPreviousCell(cell); }
}

function orderedEntryCells(cell) {
  const entryId = activeEntry || cell.dataset.entries.split(" ")[0];
  const entry = entries.find(e => e.id === entryId);
  return [...entry.answer].map((_, i) => cells.get(key(
    entry.row + (entry.dir === "down" ? i : 0),
    entry.col + (entry.dir === "across" ? i : 0)
  )).el);
}

function focusNextCell(cell) {
  const list = orderedEntryCells(cell); const index = list.indexOf(cell);
  if (index < 0) return;
  const nextEmpty = list.slice(index + 1).find(nextCell => !cellValue(nextCell));
  if (nextEmpty) nextEmpty.querySelector(".cell-input").focus();
}

function focusPreviousCell(cell) {
  const list = orderedEntryCells(cell); const index = list.indexOf(cell);
  if (index > 0) list[index - 1].querySelector(".cell-input").focus();
}

function selectEntry(id) {
  activeEntry = id;
  document.querySelectorAll(".clue").forEach(c => c.classList.toggle("active", c.dataset.entry === id));
  document.querySelectorAll(".cell").forEach(c => c.classList.toggle("highlight", c.dataset.entries.split(" ").includes(id)));
  const entry = entries.find(e => e.id === id);
  message.textContent = `${entry.n}. ${entry.answer.length} harf · ${entry.dir === "across" ? "Soldan sağa" : "Yukarıdan aşağıya"}`;
}

function updateProgress() {
  const filled = [...cells.values()].filter(c => cellValue(c.el)).length;
  progressText.textContent = `${filled} / ${cells.size} kutu`;
  progressFill.style.width = `${filled / cells.size * 100}%`;
}

function cellValue(cell) {
  const tile = document.querySelector(`[data-tile-id="${cell.dataset.tileId}"]`);
  return tile?.dataset.letter || cell.dataset.value || cell.querySelector(".cell-input").value || "";
}

function updateSolvedClues() {
  entries.forEach(entry => {
    const solved = [...entry.answer].every((letter, i) => {
      const row = entry.row + (entry.dir === "down" ? i : 0);
      const col = entry.col + (entry.dir === "across" ? i : 0);
      return cellValue(cells.get(key(row, col)).el) === letter;
    });
    document.querySelector(`.clue[data-entry="${entry.id}"]`)?.classList.toggle("solved", solved);
  });
}

function checkAnswers() {
  let filled = 0, correct = 0;
  cells.forEach(data => {
    const value = cellValue(data.el);
    data.el.classList.remove("wrong", "correct");
    if (value) {
      filled++;
      const isCorrect = value === data.letter;
      correct += isCorrect ? 1 : 0;
      data.el.classList.add(isCorrect ? "correct" : "wrong");
    }
  });
  updateSolvedClues();
  if (correct === cells.size) {
    message.textContent = "Tebrikler! Tüm yanıtlar doğru.";
    cells.forEach(data => data.el.classList.add("locked"));
    if (!gameCompleted) {
      gameCompleted = true;
      setTimeout(() => modal.hidden = false, 450);
    }
  } else if (filled < cells.size) {
    message.textContent = `${correct} doğru kutu var; ${cells.size - filled} kutu henüz boş.`;
  } else {
    message.textContent = `${correct} kutu doğru. Pembe kutuları yeniden düşün.`;
  }
}

function checkForAutomaticCompletion() {
  if (gameCompleted) return;
  const completeAndCorrect = [...cells.values()].every(data => cellValue(data.el) === data.letter);
  if (completeAndCorrect) checkAnswers();
}

function giveHint() {
  const candidates = [...cells.values()].filter(data => cellValue(data.el) !== data.letter);
  if (!candidates.length) return checkAnswers();
  const data = candidates[Math.floor(Math.random() * candidates.length)];
  if (data.el.dataset.tileId) removeFromCell(data.el);
  const tile = [...document.querySelectorAll(".tile:not(.used)")].find(t => t.dataset.letter === data.letter);
  if (!tile) return;
  placeTile(tile, data.el);
  data.el.classList.add("correct", "locked");
  message.textContent = `İpucu: ${data.letter} harfini doğru yerine yerleştirdim.`;
  updateSolvedClues();
  checkForAutomaticCompletion();
}

function resetGame() {
  cells.forEach(data => {
    data.el.classList.remove("wrong", "correct", "locked", "highlight", "target");
    data.el.querySelector(".cell-input").value = "";
    data.el.dataset.value = "";
    data.el.dataset.tileId = "";
  });
  document.querySelectorAll(".clue").forEach(c => c.classList.remove("active", "solved"));
  activeEntry = null;
  selectedTile = null;
  gameCompleted = false;
  buildTiles();
  updateProgress();
  modal.hidden = true;
  message.textContent = "Bir ipucu seçerek başlayabilirsin.";
}

buildClues("across", "#across-clues");
buildClues("down", "#down-clues");
buildBoard();
buildTiles();
updateProgress();

document.querySelector("#check-btn").addEventListener("click", checkAnswers);
document.querySelector("#hint-btn").addEventListener("click", giveHint);
document.querySelector("#reset-btn").addEventListener("click", resetGame);
document.querySelector("#play-again").addEventListener("click", resetGame);
document.querySelector("#pool-toggle").addEventListener("click", () => {
  const dock = document.querySelector("#letter-dock");
  const pool = document.querySelector("#letter-bank");
  const button = document.querySelector("#pool-toggle");
  const willOpen = dock.classList.contains("collapsed");
  dock.classList.toggle("collapsed", !willOpen);
  pool.hidden = !willOpen;
  button.setAttribute("aria-expanded", String(willOpen));
  button.textContent = willOpen ? "⌄ Harf Havuzunu Kapat" : "⌃ Harf Havuzunu Aç";
});
