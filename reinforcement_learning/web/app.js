// Delivery robot: the page.
// Python (engine.py + robot.py) does all the thinking and learning.
// This file only asks Python "what happens next?" and draws the answer.
"use strict";

// Arrows to draw for each move.
const ARROW = { up: "↑", down: "↓", left: "←", right: "→" };
// The 3 battery levels the robot can notice.
const LEVELS = ["HIGH", "MEDIUM", "LOW"];
const LEVEL_WORD = { HIGH: "high", MEDIUM: "medium", LOW: "low" };
// Column names on the warehouse floor: A to F.
const LETTERS = "ABCDEF";
// Words for each kind of points, used in the "Result" step.
const PART_TEXT = {
  move: "for the move",
  pickup: "picked up the parcel",
  deliver: "delivered the parcel",
  battery_dead: "the battery ran out",
};
// Words for things that can happen during a move, used in the log.
const EVENT_TEXT = {
  bump: "bumped into something",
  pickup: "picked up the parcel",
  deliver: "delivered it!",
  charge: "charged",
  battery_dead: "battery ran out",
};
// The log keeps at most this many lines.
const LOG_LIMIT = 300;

// Everything the page remembers.
const app = {
  state: null,       // what Python sent when the page loaded (floor plan, settings, your pieces...)
  brain: {},         // "C4|LOW|1" -> { up: score, down: score, left: score, right: score }
  history: [],       // one summary per finished practice game
  playing: false,    // a game is playing by itself
  playMode: "learn", // "learn" = practice game, "test" = curiosity off, no learning
  stepping: false,   // waiting for Python to answer one move
  busy: false,       // training, resetting or reloading
  gameActive: false, // a game has started and isn't finished yet
  mode: "learn",     // the kind of game being played right now
  trail: [],         // the last few squares the robot drove over
  stats: null,       // this game's totals: deliveries, battery used, charges, bumps
};

// A short way to find something on the page by its id: $("play") is the Play button.
const $ = (id) => document.getElementById(id);

// ------------------------------------------------------------------ small helpers
// Make a new piece of the page, e.g. el("li", "entry", "Hello").
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
// Show a number with 2 decimals, and a proper minus sign: −1.50
function num(value, digits = 2) {
  if (Math.abs(value) < 0.5 * 10 ** -digits) return (0).toFixed(digits);
  return (value < 0 ? "−" : "") + Math.abs(value).toFixed(digits);
}
function term(value, digits = 2) { // a number inside a formula: negatives in brackets
  return value < 0 ? `(${num(value, digits)})` : num(value, digits);
}
// Show points with a + or − sign: +10, −1, 0
function signed(value) {
  if (value > 0) return `+${value}`;
  if (value < 0) return `−${Math.abs(value)}`;
  return "0";
}
function digitsFor(a, b) { // enough decimals that a small change still shows
  return [2, 3, 4].find((d) => num(a, d) !== num(b, d)) || 2;
}
// 0.3 -> "30%"
function pct(value) { return `${Math.round(value * 100)}%`; }
// plural(1, "game", "games") -> "1 game", plural(3, ...) -> "3 games"
function plural(n, one, many) { return `${n} ${n === 1 ? one : many}`; }
// Wait for a number of milliseconds.
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
// The robot's situation as text, e.g. "C4|LOW|1" (1 = carrying a parcel).
function keyOf(robot) { return `${robot.square}|${robot.level}|${robot.carrying ? 1 : 0}`; }
// The move with the highest score.
function bestOf(scores) {
  return app.state.moves.reduce((best, move) => (scores[move] > scores[best] ? move : best));
}

// ------------------------------------------------------------------ talking to Python
// Send a message to Python and wait for the answer.
// No body = just ask for something (GET). With a body = do something (POST).
async function api(path, body) {
  // Step 1: get the message ready.
  const options = body === undefined ? {} : {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
  // Step 2: send it. If Python isn't running, say so.
  let response;
  try {
    response = await fetch(path, options);
  } catch (error) {
    throw new Error("The robot app isn't running. Run robot.py again, then refresh this page.");
  }
  // Step 3: read the answer. If Python found a problem (like an unfinished piece), pass it on.
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// ------------------------------------------------------------------ starting up
// Draw the whole page from what Python sent.
function loadState(state) {
  // Step 1: remember what Python sent.
  app.state = state;
  app.brain = state.brain;
  app.history = state.history;
  app.gameActive = state.game_active;
  app.mode = state.mode;
  app.trail = [];
  app.stats = { deliveries: 0, battery: 0, charges: 0, bumps: 0 };
  // Step 2: draw the warehouse, the brain maps and the robot.
  buildFloor(state);
  buildBrainMaps(state);
  showRobot(state.robot, true);
  $("robot").classList.remove("dead");
  // Step 3: fill in the numbers at the top and under the warehouse.
  setCounters(state.game_active && state.mode === "test" ? "Test" : state.games_played + 1,
    state.move_number, state.curiosity);
  showStats();
  // Step 4: show which pieces work, the brain, the charts, and an empty "Robot's mind".
  showPieces(state.pieces, state.code_error);
  renderBrain(keyOf(state.robot));
  drawCharts();
  clearMind();
  // Step 5: switch buttons on or off.
  updateButtons();
}

// The Game, Move and Curiosity numbers at the top of the page.
function setCounters(game, move, curiosity) {
  $("game-number").textContent = game;
  $("move-number").textContent = `${move} of ${app.state.moves_per_game}`;
  $("curiosity").textContent = game === "Test" ? "off" : pct(curiosity);
}

// The "Piece 1 ✓" labels at the top, and the yellow message saying what to do next.
function showPieces(pieces, codeError) {
  // Step 1: one label per piece: green with ✓ if it works, ○ if not.
  const list = $("pieces");
  list.innerHTML = "";
  for (const n of ["1", "2", "3"]) {
    const item = el("li", pieces[n].ok ? "ok" : "", `Piece ${n} ${pieces[n].ok ? "✓" : "○"}`);
    item.title = pieces[n].message;
    list.appendChild(item);
  }
  // Step 2: Python couldn't read the file at all (a typo)? Show a red message.
  const file = app.state.file_name;
  if (codeError) {
    showNotice(`${file} has a problem`, `${codeError}. Fix it, save, then click Reload my code.`, "error");
    return;
  }
  // Step 3: find the first piece that doesn't work yet. All working? Hide the message.
  const first = ["1", "2", "3"].find((n) => !pieces[n].ok);
  if (!first) { hideNotice(); return; }
  // Step 4: say what's missing and what the robot can do right now.
  const now = !pieces["1"].ok ? "The robot can't move yet."
    : !pieces["2"].ok ? "Right now the robot only makes random moves, so it never uses what it learns."
    : "Right now the robot can move, but it can't learn from what happens.";
  showNotice(`Next: Piece ${first}`, `${pieces[first].message} ${now} Edit ${file}, save it, then click Reload my code.`);
}

// Show or hide the message box under the top bar.
function showNotice(title, text, kind = "info") {
  $("notice").hidden = false;
  $("notice").className = `notice ${kind}`;
  $("notice-title").textContent = title;
  $("notice-text").textContent = text;
}
function hideNotice() { $("notice").hidden = true; }

// Switch each button on or off, and change its words (e.g. "Play one game" becomes "Pause").
function updateButtons() {
  // Step 1: what can the robot do right now?
  const pieces = app.state ? app.state.pieces : null;
  const canMove = Boolean(pieces && pieces["1"].ok);   // needs Piece 1
  const canLearn = canMove && pieces["3"].ok;          // needs Piece 3 too
  const idle = !app.playing && !app.busy;              // nothing else is going on
  const playingLearn = app.playing && app.playMode === "learn";
  const playingTest = app.playing && app.playMode === "test";

  // Step 2: the Play and Test buttons also work as Pause.
  $("play").disabled = !canMove || app.busy || playingTest;
  $("play").textContent = playingLearn ? "Pause"
    : app.gameActive && app.mode === "learn" ? "Keep playing" : "Play one game";
  $("test").disabled = !canMove || app.busy || playingLearn;
  $("test").textContent = playingTest ? "Pause"
    : app.gameActive && app.mode === "test" ? "Keep testing" : "Test what it learned";
  // Step 3: the other buttons only work when nothing else is going on.
  $("step").disabled = !canMove || !idle;
  $("train10").disabled = !canLearn || !idle;
  $("train100").disabled = !canLearn || !idle;
  $("reset").disabled = !idle;
  $("reload").disabled = !idle;
}

// ------------------------------------------------------------------ the warehouse floor
// Draw the 36 squares of the warehouse, and the A-F and 1-6 labels around it.
function buildFloor(state) {
  // Step 1: remove the old squares.
  const floor = $("floor");
  floor.querySelectorAll(".cell").forEach((cell) => cell.remove());
  // Step 2: add one square for each letter of the map.
  state.floor.forEach((row, r) => row.forEach((letter, c) => {
    const cell = el("div", "cell");
    cell.id = `cell-${r}-${c}`;
    if (letter === "#") cell.classList.add("shelf");
    if (letter === "P") { cell.classList.add("pickup"); cell.innerHTML = '<span class="icon">📦</span><small>Pickup</small>'; }
    if (letter === "D") { cell.classList.add("dropoff"); cell.innerHTML = '<span class="icon">🏠</span><small>Customer</small>'; }
    if (letter === "C") { cell.classList.add("charger"); cell.innerHTML = '<span class="icon">⚡</span><small>Charger</small>'; }
    if (letter === "R") cell.innerHTML = "<small>Start</small>";
    floor.insertBefore(cell, $("robot"));
  }));
  // Step 3: the column letters on top and the row numbers on the left.
  $("axis-top").innerHTML = LETTERS.split("").map((letter) => `<span>${letter}</span>`).join("");
  $("axis-left").innerHTML = [1, 2, 3, 4, 5, 6].map((n) => `<span>${n}</span>`).join("");
}

// Move the robot to its square and update its battery bar.
// instant = jump there without sliding (used when a new game starts).
function showRobot(robot, instant = false) {
  // Step 1: move the robot. The page slides it there smoothly.
  const body = $("robot");
  if (instant) body.style.transition = "none";
  body.style.setProperty("--row", robot.row);
  body.style.setProperty("--col", robot.col);
  if (instant) { void body.offsetWidth; body.style.transition = ""; }
  // Step 2: show the parcel on the robot if it's carrying one.
  body.classList.toggle("carrying", robot.carrying);

  // Step 3: update both battery bars (on the robot, and under the warehouse).
  // Green = high, yellow = medium, red = low.
  const battery = Math.max(0, robot.battery);
  const share = pct(battery / robot.battery_size);
  const level = robot.level === "HIGH" ? "" : robot.level.toLowerCase();
  $("robot-battery-fill").style.width = share;
  $("robot-battery-fill").className = level;
  $("gauge-fill").style.width = share;
  $("gauge-fill").className = `gauge-fill ${level}`;
  $("gauge-text").textContent = `${battery} of ${robot.battery_size} (${LEVEL_WORD[robot.level]})`;
  // Step 4: while the robot carries the parcel, fade the parcel on the pickup square.
  const pickup = document.querySelector(".cell.pickup");
  if (pickup) pickup.classList.toggle("empty", robot.carrying);
}

// Yellow dots on the last 12 squares the robot drove over. Older dots are fainter.
function addTrail(row, col) {
  // Step 1: add the new square and forget the oldest one.
  app.trail.push([row, col]);
  if (app.trail.length > 12) app.trail.shift();
  // Step 2: clear all dots, then draw them again.
  document.querySelectorAll(".cell").forEach((cell) => cell.style.removeProperty("--trail"));
  app.trail.forEach(([r, c], i) => {
    $(`cell-${r}-${c}`).style.setProperty("--trail", ((i + 1) / app.trail.length * 0.7).toFixed(2));
  });
}

// A little label that floats up from the robot, like "+10 picked up". It disappears after a second.
function pop(robot, text, kind) {
  const bubble = el("div", `pop ${kind}`);
  bubble.style.left = `${(robot.col / 6) * 100}%`;
  bubble.style.top = `${(robot.row / 6) * 100}%`;
  bubble.appendChild(el("span", "", text));
  $("pops").appendChild(bubble);
  setTimeout(() => bubble.remove(), 1200);
}

// One floating label for each thing that happened during the move.
function popEvents(e) {
  const points = Object.fromEntries(e.parts);
  if (e.happened.includes("bump")) pop(e.after, "Bump", "bad");
  if (e.happened.includes("pickup")) pop(e.after, `${signed(points.pickup)} picked up`, "good");
  if (e.happened.includes("deliver")) pop(e.after, `${signed(points.deliver)} delivered`, "good");
  if (e.happened.includes("charge")) pop(e.after, "⚡ Charged", "charge");
  if (e.happened.includes("battery_dead")) pop(e.after, `Battery dead ${signed(points.battery_dead)}`, "bad");
}

// The 4 numbers under the warehouse: deliveries, battery used, charges, bumps.
function showStats() {
  $("stat-deliveries").textContent = app.stats.deliveries;
  $("stat-battery").textContent = app.stats.battery;
  $("stat-charges").textContent = app.stats.charges;
  $("stat-bumps").textContent = app.stats.bumps;
}

// ------------------------------------------------------------------ one move
// Ask Python for one move and show it. Gives back true when the game is over (or something broke).
async function stepOnce(mode) {
  // Already waiting for a move? Don't ask twice.
  if (app.stepping) return false;
  app.stepping = true;
  try {
    // Step 1: ask Python to make one move.
    const reply = await api("/api/step", { mode });
    // Step 2: show everything that happened.
    showMove(reply.event);
    return reply.event.game_over;
  } catch (error) {
    // A problem (e.g. a piece crashed): show the message and stop.
    showNotice("Something needs fixing", error.message, "error");
    return true;
  } finally {
    app.stepping = false;
  }
}

// Show one move everywhere on the page.
function showMove(e) {
  // Step 1: first move of a new game? Reset the counters and put the robot at the start.
  if (e.move_number === 1) startOfGame(e);
  app.gameActive = !e.game_over;
  app.mode = e.mode;

  // Step 2: move the robot, draw its trail and the floating labels.
  showRobot(e.after);
  $("robot").classList.toggle("dead", e.happened.includes("battery_dead"));
  addTrail(e.after.row, e.after.col);
  popEvents(e);

  // Step 3: add to this game's totals.
  app.stats.battery = e.move_number;
  app.stats.deliveries += e.happened.includes("deliver") ? 1 : 0;
  app.stats.charges += e.happened.includes("charge") ? 1 : 0;
  app.stats.bumps += e.happened.includes("bump") ? 1 : 0;
  showStats();

  // Step 4: the robot changed a score? Save the new scores.
  if (e.learned) app.brain[e.learned.key] = e.learned.scores;
  // Step 5: update the numbers at the top, the Robot's mind, the log and the brain maps.
  setCounters(e.mode === "test" ? "Test" : e.game, e.move_number, e.curiosity);
  showMind(e);
  logMove(e);
  renderBrain(keyOf(e.after), e.learned ? e.learned.key : null);

  // Step 6: game over? Add it to the charts and write a summary in the log.
  if (e.game_over) {
    if (e.summary.mode === "learn") {
      app.history.push(e.summary);
      drawCharts();
    }
    logSummary(summaryText(e.summary), e.summary.battery_dead);
  }
  // Step 7: update the buttons (e.g. "Keep playing" goes back to "Play one game").
  updateButtons();
}

// A new game is starting: clear the trail and counters, put the robot back at the start.
function startOfGame(e) {
  app.trail = [];
  app.stats = { deliveries: 0, battery: 0, charges: 0, bumps: 0 };
  $("robot").classList.remove("dead");
  showRobot(e.before, true);
  logNote(e.mode === "test"
    ? "Test game starts. Curiosity is off and the robot won't learn, so this shows what it already knows."
    : `Game ${e.game} starts. The robot is curious ${pct(e.curiosity)} of the time.`);
}

// ------------------------------------------------------------------ the robot's mind (see, think, do, result, adjust)
// Empty "Robot's mind" panel, before anything has happened.
function clearMind() {
  $("mind-see").innerHTML = '<p class="muted">Press Play one game, or Step to go one move at a time.</p>';
  for (const id of ["mind-think", "mind-do", "mind-result", "mind-adjust"]) $(id).innerHTML = "";
}

// Fill in the 5 steps of the "Robot's mind" panel for one move.
function showMind(e) {
  const before = e.before;
  const after = e.after;

  // 1. SEE: where it is, its battery, and whether it carries a parcel.
  $("mind-see").innerHTML = `<p>Square <b>${before.square}</b>, battery <b>${LEVEL_WORD[before.level]}</b> `
    + `(${before.battery} of ${before.battery_size}), ${before.carrying ? "<b>carrying a parcel</b>" : "<b>no parcel</b> yet"}.</p>`;

  // 2. THINK: its 4 scores, as bars.
  $("mind-think").innerHTML = thinkBars(e.thoughts, e.move);

  // 3. DO: which move it chose, and whether it was curious or confident.
  const why = e.mode === "test" ? "Test game: curiosity is off, so it always picks its best-scoring move."
    : e.kind === "curious" ? `It tried a random move. Right now it's curious ${pct(e.curiosity)} of the time.`
    : "It picked the move with the best score.";
  $("mind-do").innerHTML = `<p><b>${ARROW[e.move]} Goes ${e.move}</b>`
    + `<span class="tag ${e.kind}">${e.kind === "curious" ? "Curious" : "Confident"}</span></p>`
    + `<p class="muted">${why}</p>`;

  // 4. RESULT: the points it got, and what happened to the battery.
  const parts = e.parts.map(([name, points]) => `${signed(points)} ${PART_TEXT[name]}`);
  if (e.happened.includes("bump")) parts.push("bumped into a shelf or wall, so it didn't move");
  const battery = e.happened.includes("charge")
    ? `Battery ${before.battery} → ${after.battery}: it drove onto the charger.`
    : `Battery ${before.battery} → ${Math.max(0, after.battery)}.`;
  const ending = e.happened.includes("time_up") ? " The shift is over." : "";
  $("mind-result").innerHTML = `<p><b>${signed(e.reward)} points</b>: ${parts.join(", ")}.</p>`
    + `<p class="muted">${battery}${ending}</p>`;

  // 5. ADJUST: how it changed its score (the learning formula with real numbers).
  $("mind-adjust").innerHTML = adjustText(e);
}

// The 4 score bars in the THINK step. Green bars to the right = good, red bars to the left = bad.
function thinkBars(scores, chosen) {
  // Step 1: find the biggest score, so the longest bar fits.
  const values = app.state.moves.map((move) => scores[move]);
  const scale = Math.max(1, ...values.map(Math.abs));
  // Step 2: all zeros means it has never been here before.
  let html = values.every((v) => v === 0)
    ? '<p class="muted">It has never been in this situation before, so every move scores 0.</p>'
    : '<p class="muted">How good it thinks each move is here:</p>';
  // Step 3: one row per move: arrow, name, bar, score. The chosen move is highlighted.
  html += '<div class="bars">';
  for (const move of app.state.moves) {
    const value = scores[move];
    const mark = move === chosen ? " chosen" : "";
    html += `<span class="arrow${mark}">${ARROW[move]}</span><span class="name${mark}">${move}</span>`
      + `<span class="bar-track"><span class="bar ${value >= 0 ? "pos" : "neg"}" style="width:${(Math.abs(value) / scale) * 50}%"></span></span>`
      + `<span class="value${mark}">${num(value)}</span>`;
  }
  return `${html}</div>`;
}

// The ADJUST step: old score -> new score, the formula, and "better" or "worse than expected".
function adjustText(e) {
  // Not learning in a test game, or before Piece 3 is done.
  if (e.mode === "test") return '<p class="muted">Test game: it only uses what it already knows, so nothing changes.</p>';
  if (!e.learning) return '<p class="muted">It can\'t learn yet. Finish Piece 3.</p>';
  // Step 1: get the numbers Python used.
  const L = e.learned;
  const s = app.state.settings;
  const what = `${ARROW[L.move]} ${L.move} on ${e.before.square}`;
  // Step 2: write out the formula: old + learning rate × (reward + discount × future − old) = new
  const d = digitsFor(L.old, L.new);
  const formula = `${num(L.old, d)} + ${s.learning_rate} × (${num(L.reward, 0)} + ${s.discount} × ${term(L.future, d)} − ${term(L.old, d)}) = <b>${num(L.new, d)}</b>`;
  // Step 3: did the score go up (better than expected) or down (worse than expected)?
  const change = L.new - L.old;
  const verdict = change > 1e-9 ? `<span class="better">▲ Better than expected.</span> It trusts “${what}” a bit more now.`
    : change < -1e-9 ? `<span class="worse">▼ Worse than expected.</span> It fixes its guess for “${what}” downwards.`
    : "Exactly what it expected, so nothing changes.";
  return `<p>Score for “${what}”: <b>${num(L.old, d)} → ${num(L.new, d)}</b></p>`
    + `<p class="formula">${formula}</p><p>${verdict}</p>`;
}

// ------------------------------------------------------------------ the log
// Add a line to the top of the log, and remove the oldest lines if there are too many.
function addLog(item) {
  const log = $("log");
  log.prepend(item);
  while (log.children.length > LOG_LIMIT) log.lastChild.remove();
}

// One log line for one move: where it was, what it chose, the points, and how its score changed.
function logMove(e) {
  // Step 1: did the score go up (▲) or down (▼)?
  const L = e.learned;
  const direction = !L ? "" : L.new > L.old + 1e-9 ? "up" : L.new < L.old - 1e-9 ? "down" : "";
  const item = el("li", `entry ${direction}`);
  // Step 2: things that happened, like "picked up the parcel".
  const events = e.happened.filter((h) => EVENT_TEXT[h]).map((h) => EVENT_TEXT[h]);
  // Step 3: the score change, or why it didn't learn.
  const d = L ? digitsFor(L.old, L.new) : 2;
  const change = L ? `score ${num(L.old, d)} → <b>${num(L.new, d)}${direction === "up" ? " ▲" : direction === "down" ? " ▼" : ""}</b>`
    : e.mode === "test" ? "test game, not learning" : "not learning yet";
  // Step 4: put the line together and add it.
  item.innerHTML = `<span class="n">${e.move_number}</span>`
    + `<span>${e.before.square}, ${LEVEL_WORD[e.before.level]} battery${e.before.carrying ? ", parcel" : ""}: `
    + `<b>${ARROW[e.move]} ${e.move}</b> <span class="muted">(${e.kind})</span></span>`
    + `<span class="pts">${signed(e.reward)}</span>`
    + `<span class="change">${events.length ? `${events.join(", ")}. ` : ""}${change}</span>`;
  addLog(item);
}

// A grey note line, and a yellow (or red) summary line.
function logNote(text) { addLog(el("li", "entry note", text)); }
function logSummary(text, bad = false) { addLog(el("li", `entry summary${bad ? " died" : ""}`, text)); }

// The summary sentence at the end of a game.
function summaryText(s) {
  const who = s.mode === "test" ? "Test game" : `Game ${s.game}`;
  const ending = s.battery_dead ? `the battery ran out after ${s.moves} moves` : "the battery never ran out";
  return `${who} finished: ${plural(s.deliveries, "delivery", "deliveries")}, charged ${plural(s.charges, "time", "times")}, `
    + `${plural(s.bumps, "bump", "bumps")}, and ${ending}. Points: ${signed(s.points)}.`;
}

// ------------------------------------------------------------------ the brain maps
// Make the 6 small maps: 3 battery levels × (heading for a parcel, carrying a parcel).
function buildBrainMaps(state) {
  // Step 1: start empty, with the column titles on top.
  const box = $("brain");
  box.innerHTML = "";
  box.appendChild(el("div"));
  for (const level of LEVELS) box.appendChild(el("div", "col-head", `Battery ${LEVEL_WORD[level]}`));
  // Step 2: one row of maps without a parcel, one row with a parcel.
  for (const carrying of [0, 1]) {
    box.appendChild(el("div", "row-head", carrying ? "Carrying a parcel" : "Heading for a parcel"));
    for (const level of LEVELS) {
      // Step 3: a small map...
      const mini = el("div", "mini");
      mini.id = `mini-${level}-${carrying}`;
      mini.setAttribute("role", "img");
      mini.setAttribute("aria-label", `Best moves with battery ${LEVEL_WORD[level]}, ${carrying ? "carrying a parcel" : "no parcel"}`);
      // Step 4: ...with one square for each square of the warehouse.
      state.floor.forEach((row, r) => row.forEach((letter, c) => {
        const cell = el("div", "mini-cell");
        cell.id = `m-${level}-${carrying}-${LETTERS[c]}${r + 1}`;
        if (letter === "#") cell.classList.add("shelf");
        if (letter === "P") cell.classList.add("mark-pickup");
        if (letter === "D") cell.classList.add("mark-dropoff");
        if (letter === "C") cell.classList.add("mark-charger");
        mini.appendChild(cell);
      }));
      box.appendChild(mini);
    }
  }
}

// Fill the 6 small maps: an arrow for the best move on each square, coloured by its score.
function renderBrain(currentKey, flashKey = null) {
  // Step 1: find the biggest score, so colours can be stronger for bigger scores.
  const bests = Object.values(app.brain).map((scores) => Math.max(...Object.values(scores)));
  const scale = Math.max(1, ...bests.map(Math.abs));
  // Step 2: remove the old "robot is here" marks.
  document.querySelectorAll(".mini.active").forEach((mini) => mini.classList.remove("active"));
  document.querySelectorAll(".mini-cell.here").forEach((cell) => cell.classList.remove("here"));

  // Step 3: for every square that isn't a shelf, in every map...
  app.state.floor.forEach((row, r) => row.forEach((letter, c) => {
    if (letter === "#") return;
    const square = `${LETTERS[c]}${r + 1}`;
    for (const level of LEVELS) {
      for (const carrying of [0, 1]) {
        const cell = $(`m-${level}-${carrying}-${square}`);
        const scores = app.brain[`${square}|${level}|${carrying}`];
        // ...never learned anything here? Leave it empty.
        if (!scores || Object.values(scores).every((v) => v === 0)) {
          cell.textContent = "";
          cell.style.background = "";
          continue;
        }
        // ...otherwise draw the best move's arrow. Green = good score, red = bad score.
        const best = bestOf(scores);
        const strength = Math.min(1, Math.abs(scores[best]) / scale);
        const alpha = (0.12 + 0.55 * strength).toFixed(2);
        cell.textContent = ARROW[best];
        cell.style.background = scores[best] >= 0 ? `rgba(45, 138, 78, ${alpha})` : `rgba(194, 55, 44, ${alpha})`;
      }
    }
  }));

  // Step 4: outline the map for the robot's current situation, and circle its square.
  if (currentKey) {
    const [square, level, carrying] = currentKey.split("|");
    $(`mini-${level}-${carrying}`).classList.add("active");
    $(`m-${level}-${carrying}-${square}`).classList.add("here");
  }
  // Step 5: flash the square whose score just changed.
  if (flashKey) {
    const [square, level, carrying] = flashKey.split("|");
    const cell = $(`m-${level}-${carrying}-${square}`);
    cell.classList.remove("flash");
    void cell.offsetWidth;
    cell.classList.add("flash");
  }
}

// ------------------------------------------------------------------ progress charts
// The average of the last few games, for a smooth line through the dots.
function movingAverage(values, size) {
  return values.map((_, i) => {
    const recent = values.slice(Math.max(0, i - size + 1), i + 1).filter((v) => v !== null);
    return recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : null;
  });
}

// Draw one chart: a grey dot per game, a coloured average line, and red ticks for dead batteries.
function drawChart(canvas, values, color, emptyText, deaths = null) {
  // Step 1: get the drawing area ready (sharp on every screen).
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillStyle = "#55656e";

  // Step 2: nothing to draw yet? Write a short message instead.
  const real = values.filter((v) => v !== null);
  if (!real.length) {
    ctx.fillText(emptyText, 12, height / 2);
    return;
  }
  // Step 3: work out where each game (x) and each value (y) goes on the chart.
  const pad = { left: 34, right: 12, top: 10, bottom: 22 };
  const top = Math.max(1, ...real) * 1.1;
  const x = (i) => pad.left + (values.length < 2 ? 0 : (i / (values.length - 1)) * (width - pad.left - pad.right));
  const y = (v) => pad.top + (1 - v / top) * (height - pad.top - pad.bottom);

  // Step 4: grid lines with numbers, and "game 1 ... game N" along the bottom.
  ctx.strokeStyle = "#e3e6e0";
  ctx.lineWidth = 1;
  for (const v of [0, top / 2, top]) {
    ctx.beginPath(); ctx.moveTo(pad.left, y(v)); ctx.lineTo(width - pad.right, y(v)); ctx.stroke();
    ctx.fillText(String(Math.round(v)), 4, y(v) + 4);
  }
  ctx.fillText("game 1", pad.left, height - 5);
  const last = `game ${values.length}`;
  ctx.fillText(last, width - pad.right - ctx.measureText(last).width, height - 5);

  // Step 5: one grey dot per game.
  ctx.fillStyle = "rgba(85, 101, 110, 0.35)";
  values.forEach((v, i) => {
    if (v === null) return;
    ctx.beginPath(); ctx.arc(x(i), y(v), 2, 0, Math.PI * 2); ctx.fill();
  });

  // Step 6: the average line (the average of the last 20 games).
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  let drawing = false;
  movingAverage(values, 20).forEach((v, i) => {
    if (v === null) { drawing = false; return; }
    if (drawing) ctx.lineTo(x(i), y(v)); else ctx.moveTo(x(i), y(v));
    drawing = true;
  });
  ctx.stroke();

  // Step 7: a red tick under every game where the battery ran out.
  if (deaths) {
    ctx.strokeStyle = "#c2372c";
    ctx.lineWidth = 1.5;
    deaths.forEach((died, i) => {
      if (!died) return;
      ctx.beginPath(); ctx.moveTo(x(i), height - pad.bottom); ctx.lineTo(x(i), height - pad.bottom + 7); ctx.stroke();
    });
  }
}

// Draw both charts, and the sentence about the last 20 games.
function drawCharts() {
  const games = app.history;
  // Chart 1: deliveries per game (with red ticks for dead batteries).
  drawChart($("chart-deliveries"), games.map((g) => g.deliveries), "#2d8a4e",
    "Appears after the first practice game.", games.map((g) => g.battery_dead));
  // Chart 2: battery used per delivery (moves ÷ deliveries). Lower is better.
  drawChart($("chart-battery"), games.map((g) => (g.deliveries ? g.moves / g.deliveries : null)), "#1c2b33",
    games.length ? "No deliveries yet." : "Appears after the first delivery.");

  // The sentence under the charts, about the last 20 games.
  const recent = games.slice(-20);
  if (!recent.length) {
    $("progress-summary").textContent = "Play or train some games to watch the robot improve.";
    return;
  }
  const deliveries = recent.reduce((t, g) => t + g.deliveries, 0);
  const died = recent.filter((g) => g.battery_dead).length;
  const perDelivery = deliveries ? (recent.reduce((t, g) => t + g.moves, 0) / deliveries).toFixed(0) : "–";
  $("progress-summary").textContent = `Last ${plural(recent.length, "game", "games")}: `
    + `${(deliveries / recent.length).toFixed(1)} deliveries per game, ${perDelivery} battery per delivery, `
    + `and the battery ran out ${plural(died, "time", "times")}.`;
}

// ------------------------------------------------------------------ buttons
// How many moves a second the speed slider is set to.
function speed() { return Number($("speed").value); }

// "Play one game" and "Test what it learned": keep making moves until the game ends or you press Pause.
async function play(mode) {
  if (app.playing) { app.playing = false; return; } // the same button pauses
  app.playing = true;
  app.playMode = mode;
  updateButtons();
  // Make a move, wait a little (depending on the speed slider), repeat.
  while (app.playing) {
    const over = await stepOnce(mode);
    if (over) break;
    await sleep(1000 / speed());
  }
  app.playing = false;
  updateButtons();
}

// "Step": make exactly one move.
async function step() {
  await stepOnce(null);
  updateButtons();
}

// Switch the buttons off while some work happens, and show a message if it fails.
async function busyWith(work) {
  app.busy = true;
  updateButtons();
  try {
    await work();
  } catch (error) {
    showNotice("Something needs fixing", error.message, "error");
  } finally {
    app.busy = false;
    updateButtons();
  }
}

// "Train 10 / 100 games": Python plays many games at full speed, then the page redraws.
function train(games, button) {
  return busyWith(async () => {
    const label = button.textContent;
    button.textContent = "Training…";
    try {
      // Step 1: ask Python to practise.
      const reply = await api("/api/train", { games });
      // Step 2: redraw everything with the new brain.
      loadState(reply.state);
      // Step 3: write one summary line for all those games in the log.
      const s = reply.summaries;
      const average = s.reduce((t, g) => t + g.deliveries, 0) / s.length;
      const died = s.filter((g) => g.battery_dead).length;
      logSummary(`Practised games ${s[0].game} to ${s[s.length - 1].game} at full speed: `
        + `${average.toFixed(1)} deliveries per game on average, and the battery ran out in ${died} of them.`,
        died > s.length / 2);
      $("mind-see").innerHTML = `<p>Practised ${games} games at full speed. Press <b>Play one game</b> to watch it now, `
        + "or <b>Test what it learned</b> to see it with curiosity switched off.</p>";
    } finally {
      button.textContent = label;
    }
  });
}

// "Reset brain": ask first, then make the robot forget everything.
function reset() {
  if (!window.confirm("Forget everything the robot has learned?")) return;
  busyWith(async () => {
    loadState((await api("/api/reset", {})).state);
    logNote("Brain reset. The robot has forgotten everything.");
  });
}

// "Reload my code": Python reads robot.py again (after you edit and save it).
function reload() {
  busyWith(async () => {
    loadState((await api("/api/reload", {})).state);
    logNote(`Reloaded ${app.state.file_name}. The robot starts again with an empty brain.`);
  });
}

// Show the speed in words, and make the robot slide faster when the speed is higher.
function showSpeed() {
  $("speed-value").textContent = `${speed()} ${speed() === 1 ? "move" : "moves"} a second`;
  document.documentElement.style.setProperty("--move-ms", `${Math.min(260, Math.round(800 / speed()))}ms`);
}

// When the page opens: connect every button, then ask Python for the starting state.
async function init() {
  // Step 1: tell each button what to do when it's clicked.
  $("play").addEventListener("click", () => play("learn"));
  $("test").addEventListener("click", () => play("test"));
  $("step").addEventListener("click", step);
  $("train10").addEventListener("click", () => train(10, $("train10")));
  $("train100").addEventListener("click", () => train(100, $("train100")));
  $("reset").addEventListener("click", reset);
  $("reload").addEventListener("click", reload);
  $("speed").addEventListener("input", showSpeed);
  window.addEventListener("resize", drawCharts);
  showSpeed();
  // Step 2: get everything from Python and draw the page.
  try {
    loadState(await api("/api/state"));
    logNote("Ready. Press Play one game to watch the robot, or Step to go one move at a time.");
  } catch (error) {
    showNotice("Can't reach the robot app", error.message, "error");
  }
}

// Start!
init();
