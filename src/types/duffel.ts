// Application-owned shapes returned by the backend Duffel module (never raw Duffel payloads).

export type ProductType = "flight" | "stay" | "car";
export type AccessState = "available" | "access_required" | "error" | "unknown" | "unconfigured";

export interface Money {
  amount: string;
  currency: string | null;
}

export interface DuffelStatus {
  environment: "test" | "live";
  sandbox: boolean;
  banner: string | null;
  configured: boolean;
  config_error: string | null;
  webhook_secret_configured: boolean;
  products: Record<ProductType, { state: AccessState; message: string | null }>;
  permissions: { admin_read: boolean; book_on_behalf: boolean };
}

export interface DirectoryUser {
  portal_user_id: string | null;
  object_id: string | null;
  display_name: string | null;
  given_name: string | null;
  surname: string | null;
  email: string;
  user_principal_name: string | null;
  job_title: string | null;
  department: string | null;
  company_name: string | null;
  office_location: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  usage_location: string | null;
  mobile_phone: string | null;
  business_phones: string[];
  employee_id: string | null;
  preferred_language: string | null;
  account_enabled: boolean | null;
  in_portal: boolean;
  in_graph: boolean;
}

export interface PlaceSuggestion {
  type: "airport" | "city";
  iata_code: string;
  name: string;
  city_name: string | null;
  country_code: string | null;
}

export interface GeoLocation {
  label: string;
  latitude: number;
  longitude: number;
  source?: string;
  country_code?: string | null;
}

export interface FlightSearchCriteria {
  trip_type: "one_way" | "round_trip";
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string | null;
  adults: number;
  child_ages: number[];
  cabin_class: string;
  max_connections?: number | null;
}

export interface StaySearchCriteria {
  location: { latitude: number; longitude: number; label?: string };
  radius_km: number;
  check_in_date: string;
  check_out_date: string;
  rooms: number;
  adults: number;
  child_ages: number[];
}

export interface CarSearchCriteria {
  pickup_location: { latitude: number; longitude: number; label?: string };
  dropoff_location?: { latitude: number; longitude: number; label?: string } | null;
  radius_km: number;
  pickup_date: string;
  pickup_time: string;
  dropoff_date: string;
  dropoff_time: string;
  driver_age: number;
  residence_country_code: string;
}

export interface Place {
  iata_code: string | null;
  name: string | null;
  city_name: string | null;
  country_code?: string | null;
  terminal?: string | null;
}

export interface Carrier {
  iata_code: string | null;
  name: string | null;
  logo_url?: string | null;
}

export interface FlightSegment {
  id: string;
  marketing_carrier: Carrier | null;
  operating_carrier: Carrier | null;
  flight_number: string;
  operating_flight_number: string | null;
  origin: Place;
  destination: Place;
  departing_at: string;
  arriving_at: string;
  duration_minutes: number | null;
  aircraft: string | null;
  cabin_class: string | null;
  cabin_name: string | null;
  baggages: { type: string; quantity: number }[];
  technical_stops: number;
}

export interface Condition {
  allowed: boolean | null;
  penalty: Money | null;
}

export interface FlightSlice {
  origin: Place;
  destination: Place;
  departing_at: string;
  arriving_at: string;
  arrival_day_offset: number;
  duration_minutes: number;
  stops: number;
  connections: { airport: Place; layover_minutes: number | null }[];
  segments: FlightSegment[];
  fare_brand_name: string | null;
  conditions: { change_before_departure: Condition | null; refund_before_departure: Condition | null };
}

export interface FlightOffer {
  provider_ref: string;
  product_type: "flight";
  expires_at: string | null;
  owner: Carrier | null;
  airlines: string[];
  slices: FlightSlice[];
  total_duration_minutes: number;
  max_stops: number;
  outbound_departing_at: string | null;
  total: Money | null;
  base: Money | null;
  tax: Money | null;
  passenger_count: number;
  average_per_passenger: Money | null;
  passengers: { id: string; type: string; age: number | null }[];
  conditions: { change_before_departure: Condition | null; refund_before_departure: Condition | null };
  payment_requirements: {
    requires_instant_payment: boolean | null;
    payment_required_by: string | null;
    price_guarantee_expires_at: string | null;
  };
  identity_documents_required: boolean;
}

export interface StayRate {
  rate_id: string;
  name: string | null;
  description: string | null;
  board_type: string | null;
  payment_type: string | null;
  available_payment_methods: string[] | null;
  total: Money | null;
  base: Money | null;
  tax: Money | null;
  fee: Money | null;
  due_at_accommodation: Money | null;
  cancellation_timeline: { before: string; refund: Money | null }[];
  conditions: { title: string; description: string }[];
  benefits: { title: string; description: string }[];
  quantity_available: number | null;
  expires_at: string | null;
}

export interface Accommodation {
  id: string;
  name: string;
  description: string | null;
  rating: number | null;
  review_score: number | null;
  review_count: number | null;
  photos: string[];
  amenities: string[];
  address: { line_one?: string; city_name?: string; region?: string; postal_code?: string; country_code?: string } | null;
  coordinates: { latitude: number; longitude: number } | null;
  check_in_information: { check_in_after_time?: string; check_in_before_time?: string; check_out_before_time?: string } | null;
  rooms?: { name: string; beds: { type: string; count: number }[]; photos: string[]; rates: StayRate[] }[];
}

export interface StayResult {
  provider_ref: string;
  product_type: "stay";
  search_result_id: string;
  accommodation: Accommodation;
  check_in_date: string;
  check_out_date: string;
  expires_at: string | null;
  from_price: { kind: "from"; total: Money | null; due_at_accommodation: Money | null };
}

export interface CarLocation {
  name: string | null;
  address: { line_one?: string; city_name?: string; postal_code?: string; country_code?: string } | null;
  phone_number: string | null;
  opening_hours: { from: string; to: string }[];
  additional_information: { title: string; text: string }[];
}

export interface CarRate {
  provider_ref: string;
  product_type: "car";
  car: {
    name: string | null;
    code: string | null;
    category: string | null;
    type: string | null;
    transmission: string | null;
    fuel: string | null;
    air_conditioning: boolean | null;
    max_passengers: number | null;
    baggage: { small?: number; large?: number } | null;
    image_url: string | null;
  };
  supplier: { name: string | null; logo_url: string | null };
  pickup_location: CarLocation | null;
  dropoff_location: CarLocation | null;
  payment_type: string | null;
  mileage: { type?: string; amount?: number; unit?: string } | null;
  total: Money | null;
  base: Money | null;
}

export type SearchResponse<T> =
  | { status: "ok"; session_id: string; expires_at: string; criteria: unknown; results: T[] }
  | { status: "access_required"; product: ProductType; message: string; results: [] };

export interface CheckoutView {
  checkout_id: string;
  product_type: ProductType;
  provider_ref: string;
  total: Money;
  payment_type: string | null;
  summary: Record<string, any>;
  conditions: Record<string, any>;
  requirements: {
    passengers?: { id: string; type: string; age: number | null }[];
    payment_requirements?: { requires_instant_payment: boolean | null; payment_required_by: string | null };
    guest_count?: number;
    rooms?: number;
    driver_age?: number;
    payment_supported?: boolean;
    payment_note?: string | null;
  };
  expires_at: string | null;
  environment: string;
}

export interface TravelerInput {
  passenger_id?: string;
  title?: string;
  given_name: string;
  family_name: string;
  born_on?: string;
  gender?: string;
  email?: string;
  phone_number?: string;
}

export interface BookPayload {
  checkout_id: string;
  idempotency_key: string;
  accepted_total: string;
  accepted_currency: string;
  travelers: TravelerInput[];
  contact_email?: string;
  contact_phone?: string;
  payment_mode?: "instant" | "hold";
  trip_id?: string | null;
  new_trip_name?: string | null;
  on_behalf_of_user_id?: string | null;
  special_requests?: string | null;
  confirmed: boolean;
}

export type BookResult =
  | { status: "booked"; booking: Booking; replayed?: boolean }
  | { status: "price_changed"; message: string; previous: { amount: string; currency: string }; current: Money; checkout: CheckoutView }
  | { status: "pending_verification"; attempt_id: string; message: string }
  | { status: "failed"; attempt_id: string; code: string | null; message: string };

export interface Booking {
  id: string;
  product_type: ProductType;
  title: string;
  environment: string;
  duffel_id: string;
  supplier_reference: string | null;
  booking_status: string;
  payment_status: string;
  fulfillment_status: string;
  payment_type: string | null;
  total: Money | null;
  base: Money | null;
  tax: Money | null;
  due_at_supplier: Money | null;
  starts_at: string | null;
  ends_at: string | null;
  payment_required_by: string | null;
  cancellable_until: string | null;
  cancelled_at: string | null;
  last_synced_at: string | null;
  created_at: string;
  trip_id: string | null;
  owner_user_id: string;
  booked_by_user_id: string | null;
  carriers: Carrier[];
  cancellation_supported: boolean;
  changes_supported: boolean;
  change_guidance: string;
  can_pay_hold: boolean;
  summary?: Record<string, any>;
  conditions?: Record<string, any>;
  travelers?: { name: string; email?: string }[];
  activity?: { event_type: string; old_status: string | null; new_status: string | null; source: string; detail: Record<string, any>; created_at: string }[];
  cancellations?: { id: string; state: string; refund: Money | null; refund_to: string | null; expires_at: string | null; confirmed_at: string | null; created_at: string; error: string | null }[];
}

export interface BookingList {
  items: Booking[];
  total: number;
  page: number;
  page_size: number;
}

export interface TripBooking {
  id: string;
  product_type: ProductType;
  title: string;
  booking_status: string;
  payment_status: string;
  supplier_reference: string | null;
  starts_at: string | null;
  ends_at: string | null;
  total: Money | null;
  carrier: Carrier | null;
}

export interface Trip {
  id: string;
  name: string;
  owner_user_id: string;
  owner_name: string | null;
  owner_email: string | null;
  is_mine: boolean;
  starts_at: string | null;
  ends_at: string | null;
  bookings: TripBooking[];
}

export interface CancellationQuote {
  cancellation_id: string;
  product_type: ProductType;
  refund: Money | null;
  refund_to: string | null;
  penalty: Money | null;
  expires_at: string | null;
  detail: Record<string, any>;
  note: string | null;
  requires_confirmation: boolean;
}

export interface SandboxPreset {
  enabled: boolean;
  label: string;
  flights: { origin: string; destination: string; departure_date: string; return_date: string; note: string };
  stays: { location: { latitude: number; longitude: number; label: string }; radius_km: number; check_in_date: string; check_out_date: string; rooms: number; adults: number; note: string };
  cars: {
    pickup_location: { latitude: number; longitude: number; label: string };
    radius_km: number;
    pickup_date: string;
    pickup_time: string;
    dropoff_date: string;
    dropoff_time: string;
    driver_age: number;
    residence_country_code: string;
    note: string;
  };
}
