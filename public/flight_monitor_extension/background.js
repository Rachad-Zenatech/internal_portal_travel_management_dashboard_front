/**
 * Background Service Worker for Flight Explorer Chrome Extension
 */

const DEFAULT_API_BASE = "http://localhost:8008";

chrome.runtime.onInstalled.addListener(() => {
  console.log("[Flight Explorer Background] Service Worker installed");
});

// Handle messages from content script or web portal
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "REGISTER_SESSION") {
    // Web application registers a new booking tracking session
    const sessionData = request.session;
    chrome.storage.local.set({ currentFlightSession: sessionData }, () => {
      console.log("[Flight Explorer Background] Session registered:", sessionData);
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.type === "REPORT_SESSION_EVENT") {
    const { sessionId, eventType, providerPrice, finalAmountPaid, confirmationReference, ticketNumber, travelerNames, rawPayload } = request.event;
    console.log("[Flight Explorer Background] Reporting event to API:", request.event);

    chrome.storage.local.get(["currentFlightSession"], async (stored) => {
      const session = stored?.currentFlightSession;
      const apiBase = session?.apiUrl || DEFAULT_API_BASE;
      const token = session?.token || "";

      try {
        const res = await fetch(`${apiBase}/api/travel/flights/sessions/${sessionId}/events`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            event_type: eventType,
            source: "extension",
            provider_price: providerPrice,
            final_amount_paid: finalAmountPaid,
            confirmation_reference: confirmationReference,
            ticket_number: ticketNumber,
            traveler_names: travelerNames || [],
            raw_payload: rawPayload || {},
          }),
        });

        const data = await res.json();
        console.log("[Flight Explorer Background] Server response:", data);
        sendResponse({ success: true, serverData: data });
      } catch (err) {
        console.error("[Flight Explorer Background] Failed to report event:", err);
        sendResponse({ success: false, error: err.message });
      }
    });

    return true; // Keep sendResponse open for async
  }
});
