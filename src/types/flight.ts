export interface Airport {
  iata: string;
  name: string;
  city: string;
  country: string;
  tz?: string;
}

export interface FlightSegment {
  departure_airport: string;
  arrival_airport: string;
  departure_time: string;
  arrival_time: string;
  marketing_airline: string;
  operating_airline?: string;
  flight_number: string;
  cabin_class: string;
  duration_minutes: number;
  aircraft?: string;
  layover_minutes_after?: number;
  layover_airport_after?: string;
}

export interface FlightItinerary {
  itinerary_id: string;
  direction: "outbound" | "return";
  origin_airport: string;
  destination_airport: string;
  departure_time: string;
  arrival_time: string;
  total_duration_minutes: number;
  stops_count: number;
  airline_name: string;
  flight_numbers: string;
  segments: FlightSegment[];
}

export interface FlightSearchResultItem {
  option_id: string;
  trip_type: "one_way" | "round_trip";
  price: number;
  departure_price?: number;
  return_price?: number;
  currency: string;
  airline_name: string;
  flight_numbers: string;
  outbound: FlightItinerary;
  return_flight?: FlightItinerary;
  total_duration_minutes: number;
  stops_summary: string;
  baggage_info?: string;
  emissions_info?: string;
  fare_type?: string;
  booking_provider: string;
  provider_price?: number;
  booking_url: string;
  flight_category?: string;
  source: string;
  collected_at: string;
  completeness: string;
}

export interface FlightSearchResponse {
  search_id?: string;
  trip_type: string;
  origin_airport: string;
  destination_airport: string;
  departure_date: string;
  return_date?: string;
  currency: string;
  total_results: number;
  collection_timestamp: string;
  is_cached: boolean;
  collector_error?: string;
  results: FlightSearchResultItem[];
}

export interface FlightSearchFilters {
  trip_type: "one_way" | "round_trip";
  origin_airport: string;
  destination_airport: string;
  departure_date: string;
  return_date?: string;
  adults: number;
  children: number;
  infants: number;
  cabin: "economy" | "premium_economy" | "business" | "first";
  currency: string;
  search_market: string;
  max_price?: number;
  max_stops?: number;
  preferred_airlines?: string[];
  excluded_airlines?: string[];
  max_duration_minutes?: number;
  sort_by: "recommended" | "lowest_price" | "shortest_duration" | "departure_time";
}

export interface SavedFlightOption {
  id: string;
  user_id: string;
  trip_type: string;
  origin_airport: string;
  destination_airport: string;
  departure_date: string;
  return_date?: string;
  airline_name: string;
  flight_numbers: string;
  displayed_price: number;
  currency: string;
  source_url: string;
  collected_at: string;
  itinerary_payload: any;
  notes?: string;
  created_at: string;
}

export interface FlightBookingAuditLog {
  id: string;
  session_id: string;
  actor_id?: string;
  event_type: string;
  source: string;
  payload: Record<string, any>;
  created_at: string;
}

export interface FlightBookingSession {
  id: string;
  session_token: string;
  user_id: string;
  saved_option_id?: string;
  provider_name: string;
  booking_url: string;
  status: "SELECTED" | "BOOKING_LINK_OPENED" | "PENDING_VERIFICATION" | "CONFIRMED" | "CHANGED" | "CANCELLED";
  observed_price: number;
  provider_price?: number;
  final_amount_paid?: number;
  currency: string;
  confirmation_reference?: string;
  ticket_number?: string;
  traveler_names?: string[];
  itinerary_summary?: Record<string, any>;
  verification_source?: string;
  verification_notes?: string;
  attachment_url?: string;
  verified_at?: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  segments?: FlightSegment[];
  audit_logs?: FlightBookingAuditLog[];
}

export interface FlightActivityEvent {
  id: string;
  event_type: string;
  summary: string;
  payload?: Record<string, unknown>;
  occurred_at: string;
  /** true for events recorded in the current explorer visit */
  current?: boolean;
}
