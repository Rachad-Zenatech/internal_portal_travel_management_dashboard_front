/**
 * Abstract Base Provider Adapter for Flight Booking Monitor
 */
class BaseAirlineAdapter {
  constructor(providerName, hostRegex) {
    this.providerName = providerName;
    this.hostRegex = hostRegex;
  }

  isSupported(url) {
    return this.hostRegex.test(url);
  }

  /**
   * Detect current booking flow stage:
   * 'itinerary_selection', 'traveler_review', 'payment_checkout', 'confirmation', or 'unknown'
   */
  detectStage(url, doc) {
    throw new Error("detectStage must be implemented by subclass");
  }

  /**
   * Extract price displayed on page (if available)
   */
  extractPrice(doc) {
    return null;
  }

  /**
   * Extract confirmed booking details on confirmation page
   */
  extractBooking(doc) {
    throw new Error("extractBooking must be implemented by subclass");
  }
}

if (typeof window !== "undefined") {
  window.BaseAirlineAdapter = BaseAirlineAdapter;
}
