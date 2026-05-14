const video = document.querySelector("#screenVideo");
const canvas = document.querySelector("#sampleCanvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const emptyState = document.querySelector("#emptyState");
const screenWrap = document.querySelector(".screen-wrap");

const startBtn = document.querySelector("#startBtn");
const pauseBtn = document.querySelector("#pauseBtn");
const stopBtn = document.querySelector("#stopBtn");
const exportBtn = document.querySelector("#exportBtn");
const clearBtn = document.querySelector("#clearBtn");

const statusPill = document.querySelector("#statusPill");
const statusText = document.querySelector("#statusText");
const activeTime = document.querySelector("#activeTime");
const idleTime = document.querySelector("#idleTime");
const awayTime = document.querySelector("#awayTime");
const totalTime = document.querySelector("#totalTime");
const timelineList = document.querySelector("#timelineList");

const idleAfter = document.querySelector("#idleAfter");
const awayAfter = document.querySelector("#awayAfter");
const sensitivity = document.querySelector("#sensitivity");
const idleOutput = document.querySelector("#idleOutput");
const awayOutput = document.querySelector("#awayOutput");
const sensitivityOutput = document.querySelector("#sensitivityOutput");
const autoPauseHidden = document.querySelector("#autoPauseHidden");

const state = {
  stream: null,
  running: false,
  paused: false,
  previousFrame: null,
  lastActivityAt: performance.now(),
  lastTickAt: performance.now(),
  currentMode: "ready",
  totals: {
    active: 0,
    idle: 0,
    away: 0
  },
  events: []
};

let sampleTimer = 0;
let tickTimer = 0;

function formatDuration(milliseconds) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function formatTime(date = new Date()) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function setMode(mode, reason = "") {
  if (state.currentMode === mode) return;
  state.currentMode = mode;
  statusPill.className = `status-pill ${mode}`;
  statusText.textContent = mode[0].toUpperCase() + mode.slice(1);

  if (["active", "idle", "away"].includes(mode)) {
    const event = {
      mode,
      reason,
      at: new Date(),
      total: state.totals.active + state.totals.idle + state.totals.away
    };
    state.events.unshift(event);
    renderTimeline();
  }
}

function renderTotals() {
  activeTime.textContent = formatDuration(state.totals.active);
  idleTime.textContent = formatDuration(state.totals.idle);
  awayTime.textContent = formatDuration(state.totals.away);
  totalTime.textContent = formatDuration(state.totals.active + state.totals.idle + state.totals.away);
}

function renderTimeline() {
  timelineList.innerHTML = "";
  for (const event of state.events.slice(0, 40)) {
    const item = document.createElement("li");
    item.className = event.mode;
    item.innerHTML = `<strong>${event.mode[0].toUpperCase() + event.mode.slice(1)} at ${formatTime(event.at)}</strong>${event.reason}`;
    timelineList.appendChild(item);
  }
  clearBtn.disabled = state.events.length === 0;
  exportBtn.disabled = state.events.length === 0;
}

function updateSettingsLabels() {
  idleOutput.textContent = `${idleAfter.value}s`;
  awayOutput.textContent = `${awayAfter.value}s`;
  sensitivityOutput.textContent = sensitivity.value;
}

function markActivity(reason) {
  state.lastActivityAt = performance.now();
  if (state.running && !state.paused) {
    setMode("active", reason);
  }
}

function frameDifference(currentFrame) {
  if (!state.previousFrame) return 0;
  const previous = state.previousFrame.data;
  const current = currentFrame.data;
  let difference = 0;
  const stride = 16;

  for (let i = 0; i < current.length; i += stride) {
    difference += Math.abs(current[i] - previous[i]);
    difference += Math.abs(current[i + 1] - previous[i + 1]);
    difference += Math.abs(current[i + 2] - previous[i + 2]);
  }

  return difference / (current.length / stride);
}

function sampleScreen() {
  if (!state.running || state.paused || video.readyState < 2) return;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const difference = frameDifference(currentFrame);
  state.previousFrame = currentFrame;

  if (difference >= Number(sensitivity.value)) {
    markActivity(`Screen changed (${difference.toFixed(1)} motion score)`);
  }
}

function classify() {
  if (!state.running || state.paused) return;
  const now = performance.now();
  const inactiveFor = (now - state.lastActivityAt) / 1000;
  const idleLimit = Number(idleAfter.value);
  const awayLimit = Number(awayAfter.value);

  if (inactiveFor >= awayLimit) {
    setMode("away", `No activity for ${Math.floor(inactiveFor)} seconds`);
  } else if (inactiveFor >= idleLimit) {
    setMode("idle", `No activity for ${Math.floor(inactiveFor)} seconds`);
  } else {
    setMode("active", "Recent activity detected");
  }
}

function tick() {
  const now = performance.now();
  const delta = now - state.lastTickAt;
  state.lastTickAt = now;

  if (state.running && !state.paused && ["active", "idle", "away"].includes(state.currentMode)) {
    state.totals[state.currentMode] += delta;
    renderTotals();
    classify();
  }
}

function setPaused(paused) {
  state.paused = paused;
  pauseBtn.textContent = paused ? "Resume" : "Pause";
  if (paused) {
    setMode("paused");
  } else {
    state.lastTickAt = performance.now();
    markActivity("Timer resumed");
  }
}

async function startCapture() {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    alert("Screen capture is not supported in this browser. Try the latest Chrome, Edge, or Firefox on localhost.");
    return;
  }

  try {
    state.stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: "monitor",
        frameRate: 6
      },
      audio: false
    });

    video.srcObject = state.stream;
    screenWrap.classList.add("capturing");
    emptyState.hidden = true;
    state.running = true;
    state.paused = false;
    state.previousFrame = null;
    state.lastActivityAt = performance.now();
    state.lastTickAt = performance.now();

    startBtn.disabled = true;
    pauseBtn.disabled = false;
    stopBtn.disabled = false;
    exportBtn.disabled = state.events.length === 0;
    pauseBtn.textContent = "Pause";

    setMode("active", "Screen capture started");
    sampleTimer = window.setInterval(sampleScreen, 1000);
    tickTimer = window.setInterval(tick, 250);

    state.stream.getVideoTracks()[0].addEventListener("ended", stopCapture);
  } catch (error) {
    setMode("ready");
    alert(`Screen capture did not start: ${error.message}`);
  }
}

function stopCapture() {
  if (state.stream) {
    for (const track of state.stream.getTracks()) {
      track.stop();
    }
  }

  window.clearInterval(sampleTimer);
  window.clearInterval(tickTimer);
  state.stream = null;
  state.running = false;
  state.paused = false;
  state.previousFrame = null;
  video.srcObject = null;
  screenWrap.classList.remove("capturing");
  emptyState.hidden = false;

  startBtn.disabled = false;
  pauseBtn.disabled = true;
  stopBtn.disabled = true;
  pauseBtn.textContent = "Pause";
  setMode("ready");
  statusText.textContent = "Stopped";
}

function exportCsv() {
  const rows = [
    ["mode", "time", "reason", "session_total"],
    ...state.events.slice().reverse().map((event) => [
      event.mode,
      event.at.toISOString(),
      event.reason,
      formatDuration(event.total)
    ])
  ];

  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `screen-time-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function clearSession() {
  state.totals.active = 0;
  state.totals.idle = 0;
  state.totals.away = 0;
  state.events = [];
  renderTotals();
  renderTimeline();
}

startBtn.addEventListener("click", startCapture);
pauseBtn.addEventListener("click", () => setPaused(!state.paused));
stopBtn.addEventListener("click", stopCapture);
exportBtn.addEventListener("click", exportCsv);
clearBtn.addEventListener("click", clearSession);

for (const input of [idleAfter, awayAfter, sensitivity]) {
  input.addEventListener("input", updateSettingsLabels);
}

for (const eventName of ["pointerdown", "keydown", "wheel", "touchstart"]) {
  window.addEventListener(eventName, () => markActivity("Input inside this page"), { passive: true });
}

document.addEventListener("visibilitychange", () => {
  if (!state.running || !autoPauseHidden.checked) return;
  setPaused(document.hidden);
});

updateSettingsLabels();
renderTotals();
renderTimeline();
