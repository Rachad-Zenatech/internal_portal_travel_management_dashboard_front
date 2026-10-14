document.addEventListener("DOMContentLoaded", () => {
  const sessionEl = document.getElementById("active-session");
  const statusEl = document.getElementById("monitor-status");

  chrome.storage.local.get(["currentFlightSession"], (data) => {
    if (data && data.currentFlightSession) {
      const sess = data.currentFlightSession;
      sessionEl.textContent = sess.sessionId ? sess.sessionId.slice(0, 10) + "..." : "Active";
      statusEl.textContent = "CONNECTED";
      statusEl.className = "badge badge-active";
    } else {
      sessionEl.textContent = "No active session";
      statusEl.textContent = "IDLE";
      statusEl.className = "badge badge-idle";
    }
  });
});
