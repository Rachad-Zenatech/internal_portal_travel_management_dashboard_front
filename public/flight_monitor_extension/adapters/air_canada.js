/**
 * Air Canada Provider Adapter
 * Monitors booking progress on aircanada.com without capturing payment data.
 */
class AirCanadaAdapter extends BaseAirlineAdapter {
  constructor() {
    super("Air Canada", /aircanada\.com/i);
  }

  detectStage(url, doc) {
    const text = (doc.body ? doc.body.innerText : "").toLowerCase();
    const urlLower = url.toLowerCase();

    // Confirmation page indicators
    if (
      urlLower.includes("/confirmation") ||
      urlLower.includes("/view-booking") ||
      urlLower.includes("booking-confirmed") ||
      (text.includes("booking reference") && (text.includes("thank you") || text.includes("confirmed") || text.includes("e-ticket")))
    ) {
      return "confirmation";
    }

    // Payment / checkout stage
    if (urlLower.includes("/payment") || urlLower.includes("/checkout")) {
      return "payment_checkout";
    }

    // Passenger / traveler detail review stage
    if (urlLower.includes("/passenger") || urlLower.includes("/traveler")) {
      return "traveler_review";
    }

    // Flight selection stage
    if (urlLower.includes("/flights") || urlLower.includes("/select") || urlLower.includes("/book-flight")) {
      return "itinerary_selection";
    }

    return "unknown";
  }

  extractPrice(doc) {
    const text = doc.body ? doc.body.innerText : "";
    // Search for total price
    const match = text.match(/(?:Total(?: CAD)?|Grand Total|Amount to pay)[:\s]*\$?\s*([\d,]+(?:\.\d{2})?)/i);
    if (match) {
      const val = parseFloat(match[1].replace(/,/g, ""));
      if (!isNaN(val) && val > 0 && val < 50000) {
        return val;
      }
    }
    return null;
  }

  extractBooking(doc) {
    const text = doc.body ? doc.body.innerText : "";

    // 1. Extract Confirmation Reference / PNR (6-character alphanumeric)
    let pnr = null;
    const pnrEl = doc.querySelector("[data-analytics-booking-reference], [data-test='booking-reference'], .booking-reference-value, .pnr-code");
    if (pnrEl && pnrEl.textContent.trim().length === 6) {
      pnr = pnrEl.textContent.trim().toUpperCase();
    } else {
      // Regex search
      const pnrMatch = text.match(/(?:Booking reference|Confirmation code|Confirmation #|Booking #|PNR)[:\s]*([A-Z0-9]{6})\b/i);
      if (pnrMatch) {
        pnr = pnrMatch[1].toUpperCase();
      }
    }

    // 2. Extract Ticket Number (Air Canada prefix 014)
    let ticketNumber = null;
    const tktMatch = text.match(/\b(014-?\d{10})\b/);
    if (tktMatch) {
      ticketNumber = tktMatch[1];
    }

    // 3. Extract Amount Paid
    let amountPaid = this.extractPrice(doc);

    // 4. Extract Traveler Names
    const travelerNames = [];
    const passengerElements = doc.querySelectorAll("[data-test='passenger-name'], .passenger-name, .passenger-info-name");
    passengerElements.forEach((el) => {
      const name = el.textContent.trim();
      if (name && !travelerNames.includes(name)) {
        travelerNames.push(name);
      }
    });

    if (travelerNames.length === 0) {
      const passMatch = text.match(/(?:Passenger|Traveler|Name)[:\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/);
      if (passMatch) {
        travelerNames.push(passMatch[1].trim());
      }
    }

    // 5. Extract Flight Numbers (AC XXX)
    const flightNumbers = [];
    const fnMatches = text.matchAll(/\b(AC\s*\d{1,4})\b/gi);
    for (const match of fnMatches) {
      const fn = match[1].toUpperCase().replace(/\s+/, " ");
      if (!flightNumbers.includes(fn)) {
        flightNumbers.push(fn);
      }
    }

    // 6. Credible Confirmation Verification
    const isValidConfirmation = Boolean(
      pnr &&
      pnr.length === 6 &&
      (text.toLowerCase().includes("confirmed") || text.toLowerCase().includes("thank you") || text.toLowerCase().includes("reference"))
    );

    return {
      provider: "Air Canada",
      isValidConfirmation,
      confirmationReference: pnr,
      ticketNumber,
      amountPaid,
      currency: "CAD",
      travelerNames,
      flightNumbers,
      captureTimestamp: new Date().toISOString(),
      confidence: isValidConfirmation ? 0.95 : 0.40,
    };
  }
}

if (typeof window !== "undefined") {
  window.AirCanadaAdapter = AirCanadaAdapter;
}
