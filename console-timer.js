(async () => {
  try {
    if (!window.documentPictureInPicture) {
      alert("Document PiP not supported in this browser.");
      return;
    }

    const openPiP = async () => {
      const pip = await documentPictureInPicture.requestWindow({
        width: 216,
        height: 64
      });

      window.__mov2stPipWin = pip;

      pip.document.head.innerHTML = `
        <style>
          :root {
            color-scheme: dark;
            --bg: #08111b;
            --card: rgba(12, 22, 35, 0.92);
            --line: rgba(255,255,255,0.10);
            --text: #f5f7fb;
            --sub: #a8b3c3;
            --cyan: #7dd3fc;
          }

          * { box-sizing: border-box; }

          body {
            margin: 0;
            width: 100vw;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            background: linear-gradient(135deg, var(--bg), #142234);
            color: var(--text);
            font-family: Arial, Helvetica, sans-serif;
          }

          .timer {
            width: calc(100vw - 10px);
            height: calc(100vh - 10px);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 7px;
            padding: 8px 9px 8px 12px;
            border: 1px solid var(--line);
            border-radius: 14px;
            background: var(--card);
          }

          .time {
            font: 700 22px/1 Arial, Helvetica, sans-serif;
            font-variant-numeric: tabular-nums;
            white-space: nowrap;
          }

          .buttons {
            display: flex;
            gap: 6px;
          }

          button {
            width: 32px;
            height: 32px;
            flex: 0 0 32px;
            border: 1px solid var(--line);
            border-radius: 10px;
            background: rgba(255,255,255,0.07);
            color: var(--text);
            cursor: pointer;
            font: 700 14px/1 Arial, Helvetica, sans-serif;
          }

          button:hover {
            background: rgba(255,255,255,0.12);
            border-color: rgba(125,211,252,0.35);
          }

          .idle .time,
          .paused .time { color: var(--sub); }

          .running .time { color: var(--cyan); }
        </style>
      `;

      pip.document.body.innerHTML = `
        <main class="timer idle">
          <div class="time">00:00:00</div>
          <div class="buttons">
            <button type="button" data-action="pause" title="Pause">II</button>
            <button type="button" data-action="reset" title="Reset">R</button>
          </div>
        </main>
      `;

      const shell = pip.document.querySelector(".timer");
      const display = pip.document.querySelector(".time");
      const pauseBtn = pip.document.querySelector('[data-action="pause"]');
      const resetBtn = pip.document.querySelector('[data-action="reset"]');

      let seconds = window.__mov2stTimerSeconds || 0;
      let manuallyPaused = Boolean(window.__mov2stTimerPaused);
      let interval = null;

      const format = (s) => {
        const h = String(Math.floor(s / 3600)).padStart(2, "0");
        const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
        const sec = String(s % 60).padStart(2, "0");
        return `${h}:${m}:${sec}`;
      };

      const isTabHidden = () =>
        document.visibilityState === "hidden" || !document.hasFocus();

      const renderTime = () => {
        display.textContent = format(seconds);
      };

      const stop = () => {
        clearInterval(interval);
        interval = null;
      };

      const start = () => {
        if (interval) return;
        interval = setInterval(() => {
          seconds += 1;
          window.__mov2stTimerSeconds = seconds;
          renderTime();
        }, 1000);
      };

      const updateState = () => {
        if (manuallyPaused) {
          stop();
          shell.className = "timer paused";
          pauseBtn.textContent = ">";
          pauseBtn.title = "Resume";
          renderTime();
          return;
        }

        pauseBtn.textContent = "II";
        pauseBtn.title = "Pause";

        if (isTabHidden()) {
          start();
          shell.className = "timer running";
        } else {
          stop();
          shell.className = "timer idle";
        }

        renderTime();
      };

      pauseBtn.onclick = () => {
        manuallyPaused = !manuallyPaused;
        window.__mov2stTimerPaused = manuallyPaused;
        updateState();
      };

      resetBtn.onclick = () => {
        seconds = 0;
        window.__mov2stTimerSeconds = 0;
        updateState();
      };

      document.addEventListener("visibilitychange", updateState);
      window.addEventListener("focus", updateState);
      window.addEventListener("blur", updateState);
      pip.addEventListener("pagehide", stop);

      updateState();
    };

    if (!document.getElementById("mov2st-pip-launcher")) {
      const btn = document.createElement("button");
      btn.id = "mov2st-pip-launcher";
      btn.textContent = "PiP";
      btn.style.cssText = `
        position: fixed;
        right: 12px;
        bottom: 12px;
        z-index: 99999;
        padding: 8px 10px;
        border: 1px solid rgba(255,255,255,0.10);
        border-radius: 10px;
        background: rgba(12,22,35,0.92);
        color: #f5f7fb;
        font: 700 12px/1 Arial, Helvetica, sans-serif;
        cursor: pointer;
      `;
      btn.onclick = openPiP;
      document.body.appendChild(btn);
    }

    await openPiP();
  } catch (err) {
    alert("PiP failed: " + err);
  }
})();
