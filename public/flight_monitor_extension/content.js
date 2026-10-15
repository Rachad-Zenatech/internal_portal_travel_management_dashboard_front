/**
 * Content Script for Flight Explorer Booking Monitor
 */
(function () {
  console.log("[Flight Explorer Monitor] Content script loaded on", window.location.href);

  // Initialize Air Canada adapter
  const adapter = new AirCanadaAdapter();
  if (!adapter.isSupported(window.location.href)) {
    return;
  }

  let activeSession = null;
  let lastReportedStage = null;
  let lastReportedPrice = null;
  let confirmationReported = false;

  // Retrieve active session from chrome storage
  chrome.storage.local.get(["currentFlightSession"], (data) => {
    if (data && data.currentFlightSession) {
      activeSession = data.currentFlightSession;
      injectMonitorOverlay();
      runDetectionCycle();
    }
  });

  // Observe page changes (SPA navigation & dynamic DOM updates)
  const observer = new MutationObserver(() => {
    runDetectionCycle();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // Floating Overlay UI
  function injectMonitorOverlay() {
    if (document.getElementById("flight-explorer-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "flight-explorer-overlay";
    overlay.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #0f172a;
      color: #f8fafc;
      padding: 12px 18px;
      border-radius: 12px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
      border: 1px solid #334155;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 260px;
      backdrop-filter: blur(8px);
      transition: all 0.2s ease;
    `;

    overlay.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <span style="font-weight: 700; color: #38bdf8; display: flex; align-items: center; gap: 6px;">
          <span style="width: 8px; height: 8px; background: #22c55e; border-radius: 50%; display: inline-block;"></span>
          Flight Explorer Active
        </span>
        <span id="fe-badge" style="font-size: 11px; background: #1e293b; padding: 2px 6px; border-radius: 4px; color: #94a3b8;">Air Canada</span>
      </div>
      <div id="fe-status-text" style="color: #cbd5e1; font-size: 12px;">Monitoring booking flow...</div>
      <div id="fe-details" style="font-size: 11px; color: #94a3b8; border-top: 1px solid #334155; padding-top: 4px;">
        Session: <code id="fe-sess-id" style="color: #e2e8f0;">${activeSession?.sessionId?.slice(0, 8) || "Active"}</code>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  function updateOverlay(statusText, badgeText, badgeColor = "#22c55e") {
    const statusEl = document.getElementById("fe-status-text");
    const badgeEl = document.getElementById("fe-badge");
    if (statusEl) statusEl.textContent = statusText;
    if (badgeEl && badgeText) {
      badgeEl.textContent = badgeText;
      badgeEl.style.color = badgeColor;
    }
  }

  function runDetectionCycle() {
    if (!activeSession) return;

    const stage = adapter.detectStage(window.location.href, document);

    // 1. Check for stage change
    if (stage !== lastReportedStage) {
      lastReportedStage = stage;
      console.log("[Flight Explorer Monitor] Stage detected:", stage);
      updateOverlay(`Stage: ${stage.replace("_", " ").toUpperCase()}`, "MONITORING");

      if (stage === "payment_checkout" || stage === "itinerary_selection") {
        const price = adapter.extractPrice(document);
        if (price && price !== lastReportedPrice) {
          lastReportedPrice = price;
          chrome.runtime.sendMessage({
            type: "REPORT_SESSION_EVENT",
            event: {
              sessionId: activeSession.sessionId,
              eventType: "PRICE_UPDATED",
              source: "extension",
              providerPrice: price,
              rawPayload: { stage, url: window.location.href },
            },
          });
        }
      }
    }

    // 2. Check for completed confirmation
    if (stage === "confirmation" && !confirmationReported) {
      const bookingData = adapter.extractBooking(document);
      if (bookingData.isValidConfirmation && bookingData.confirmationReference) {
        confirmationReported = true;
        console.log("[Flight Explorer Monitor] CONFIRMED BOOKING DETECTED:", bookingData);

        updateOverlay(
          `CONFIRMED! Ref: ${bookingData.confirmationReference}`,
          "CONFIRMED",
          "#4ade80"
        );

        chrome.runtime.sendMessage({
          type: "REPORT_SESSION_EVENT",
          event: {
            sessionId: activeSession.sessionId,
            eventType: "CONFIRMATION_DETECTED",
            source: "extension",
            confirmationReference: bookingData.confirmationReference,
            ticketNumber: bookingData.ticketNumber,
            providerPrice: bookingData.amountPaid,
            finalAmountPaid: bookingData.amountPaid,
            travelerNames: bookingData.travelerNames,
            rawPayload: {
              provider: "Air Canada",
              flightNumbers: bookingData.flightNumbers,
              confidence: bookingData.confidence,
              captureTimestamp: bookingData.captureTimestamp,
            },
          },
        });
      }
    }
  }
})();
