export interface EventAttendee {
  id: string;
  event_id: string;
  user_id?: string | null;
  attendee_name: string;
  attendee_email: string;
  role_in_event: string;
  attendance_status: "confirmed" | "tentative" | "declined" | "ongoing" | "in_progress" | "completed" | string;
  flight_details?: string | null;
  lodging_details?: string | null;
  stipend_amount: number;
  special_luggage_assigned?: string | null;
  notes?: string | null;
  // Enriched plane / flight booking information
  booking_reference?: string | null;
  carrier_airline?: string | null;
  flight_numbers?: string | null;
  seat_assignment?: string | null;
  origin_city?: string | null;
  destination_city?: string | null;
  departure_date?: string | null;
  return_date?: string | null;
  booking_status?: string | null;
  booking_requires_drone_luggage?: boolean;
  booking_pelican_case_tag?: string | null;
  trip_uuid?: string | null;
  trip_url?: string | null;
  flight_plane?: string | null;
  itinerary?: AttendeeItinerary | null;
  businessCapabilities?: {
    supportedSearchTypes?: Record<string, string> | string[];
    canBookForOthers?: boolean;
    guestBookingEnabled?: boolean;
  };
  travelConditions?: {
    accommodation?: {
      hotelConditions?: {
        numberOfBookingsAllowed?: number;
        [key: string]: any;
      };
      [key: string]: any;
    };
    transportation?: {
      carConditions?: {
        numberOfBookingsAllowed?: number;
        [key: string]: any;
      };
      flightConditions?: {
        numberOfBookingsAllowed?: number;
        [key: string]: any;
      };
      trainConditions?: {
        numberOfBookingsAllowed?: number;
        [key: string]: any;
      };
      [key: string]: any;
    };
  };
  allowed_bookings_counts?: {
    flight?: number;
    hotel?: number;
    car?: number;
    train?: number;
  };
  allowed_bookings_types?: Record<string, boolean>;
  allowed_bookings?: string | string[];
  actual_travel_spend?: number;
  est_travel_spend?: number;
  departing_from?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ItineraryFlightSegment {
  booking_id?: string;
  booking_uuid?: string | null;
  airline?: string;
  airline_code?: string;
  flight_number?: string;
  full_flight?: string;
  from_code?: string;
  from_city?: string;
  to_code?: string;
  to_city?: string;
  departure_time?: string;
  arrival_time?: string;
  cabin?: string;
  confirmation?: string;
  eticket?: string;
  navan_url?: string | null;
}

export interface ItineraryCarBooking {
  booking_id?: string;
  agency?: string;
  car_type?: string;
  confirmation?: string;
  start_date?: string;
  end_date?: string;
  car_uuid?: string | null;
  amount?: number;
  navan_url?: string | null;
}

export interface ItineraryHotelBooking {
  booking_id?: string;
  hotel_name?: string;
  confirmation?: string;
  start_date?: string;
  end_date?: string;
  hotel_uuid?: string | null;
  amount?: number;
  navan_url?: string | null;
}

export interface AttendeeItinerary {
  trip_uuid?: string | null;
  trip_url?: string | null;
  flight_summary?: string | null;
  route_type?: string | null;
  outbound_flights?: ItineraryFlightSegment[];
  return_flights?: ItineraryFlightSegment[];
  all_segments?: ItineraryFlightSegment[];
  car?: ItineraryCarBooking | null;
  hotel?: ItineraryHotelBooking | null;
}

export interface TravelEvent {
  id: string;
  title: string;
  event_type: string;
  location: string;
  venue?: string | null;
  start_date: string;
  end_date: string;
  coordinator_name?: string | null;
  coordinator_email?: string | null;
  status: "planning" | "confirmed" | "ongoing" | "completed" | "cancelled" | string;
  description?: string | null;
  attendees_count?: number;
  total_budget_allocated?: number;
  total_budget_spent?: number;
  total_spend?: number;
  navan_event_id?: string | null;
  invited_count?: number;
  booked_count?: number;
  estimated_budget?: number;
  is_group_event?: boolean;
  created_at: string;
  updated_at: string;
}

export interface EventSpendTotals {
  expected_total: number;
  committed: number;
  actual: number;
  paid: number;
  still_estimated: number;
  remaining_balance: number;
  forecast_remaining: number;
  percent_committed: number;
  percent_actual: number;
  awaiting_invoice: {
    count: number;
    amount: number;
  };
}

export interface EventExpenseTypeSummary {
  code: string;
  name: string;
  actual: number;
  committed: number;
  paid: number;
  count: number;
  percent_of_total: number;
}

export interface EventCostLineItem {
  id: string;
  booking_id: string;
  category_code: string;
  category_name: string;
  description: string;
  vendor: string;
  traveler_name?: string | null;
  traveler_email?: string | null;
  status: "ESTIMATED" | "COMMITTED" | "INVOICED" | "PAID" | "CANCELLED";
  is_active: boolean;
  amount: number;
  base_price: number;
  taxes_and_fees: number;
  resort_fee: number;
  amount_paid: number;
  parent_booking_spend: number;
  invoice_ref?: string | null;
  invoice_url?: string | null;
  payment_method?: string | null;
  name_on_card?: string | null;
  incurred_on?: string | null;
  source: "NAVAN" | "STIPENDS" | "MANUAL";
  notes?: string | null;
}

export interface EventCostsSummary {
  budget_amount: number;
  budget_currency: string;
  totals: EventSpendTotals;
  by_expense_type: EventExpenseTypeSummary[];
  by_source: {
    travel: number;
    stipends: number;
  };
  lines: EventCostLineItem[];
}

export interface BudgetLineItem {
  id: string;
  budget_id: string;
  category: string;
  description: string;
  estimated_amount: number;
  actual_amount: number;
  vendor?: string | null;
  status: "planned" | "committed" | "paid" | "reimbursed";
  receipt_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TravelBudget {
  id: string;
  event_id?: string | null;
  event_title?: string | null;
  title: string;
  department: string;
  fiscal_year: string;
  total_allocated: number;
  total_spent: number;
  remaining_balance?: number;
  currency: string;
  status: "draft" | "submitted" | "approved" | "closed";
  notes?: string | null;
  line_items_count?: number;
  line_items?: BudgetLineItem[];
  created_at: string;
  updated_at: string;
}

export interface TravelerStipend {
  id: string;
  event_id?: string | null;
  event_title?: string | null;
  event_location?: string | null;
  event_start_date?: string | null;
  event_end_date?: string | null;
  event_status?: string | null;
  user_id?: string | null;
  recipient_name: string;
  recipient_email: string;
  daily_rate: number;
  total_days: number;
  total_amount: number;
  currency: string;
  destination_tier: string;
  payment_method: string;
  status: "pending" | "pending_approval" | "approved" | "disbursed" | "rejected" | "settled" | string;
  disbursed_at?: string | null;
  notes?: string | null;
  is_custom_override?: boolean;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  pending_daily_rate?: number | null;
  pending_total_days?: number | null;
  pending_total_amount?: number | null;
  pending_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventTravelerStipendOverview {
  attendee_id: string;
  event_id: string;
  user_id?: string | null;
  attendee_name: string;
  attendee_email: string;
  role_in_event?: string | null;
  attendance_status?: string | null;
  flight_details?: string | null;
  lodging_details?: string | null;
  attendee_notes?: string | null;
  stipend_id?: string | null;
  daily_rate?: number | null;
  total_days?: number | null;
  total_amount?: number | null;
  currency?: string | null;
  destination_tier?: string | null;
  payment_method?: string | null;
  stipend_status: "not_configured" | "pending_approval" | "approved" | "disbursed" | "rejected" | string;
  is_custom_override: boolean;
  pending_daily_rate?: number | null;
  pending_total_days?: number | null;
  pending_total_amount?: number | null;
  pending_notes?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  disbursed_at?: string | null;
  rejection_reason?: string | null;
  stipend_notes?: string | null;
  stipend_created_at?: string | null;
  stipend_updated_at?: string | null;
}

export interface EventStipendsOverview {
  id: string;
  title: string;
  event_type?: string;
  location?: string | null;
  venue?: string | null;
  start_date: string;
  end_date: string;
  duration_days: number;
  coordinator_name?: string | null;
  coordinator_email?: string | null;
  status: string;
  description?: string | null;
  default_daily_stipend?: number | null;
  default_stipend_days?: number | null;
  stipend_tier?: string | null;
  stipend_payment_method?: string | null;
  stipend_approval_status?: string | null;
  total_attendees: number;
  approved_stipends_count: number;
  pending_stipends_count: number;
  disbursed_stipends_count: number;
  approved_stipends_total: number;
  pending_stipends_total: number;
  travelers: EventTravelerStipendOverview[];
}

export interface SpecialCoverage {
  id: string;
  event_id?: string | null;
  event_title?: string | null;
  policy_title: string;
  coverage_type: string;
  insurer_name: string;
  policy_number: string;
  coverage_limit: number;
  deductible: number;
  premium_paid: number;
  currency: string;
  start_date: string;
  end_date: string;
  status: "active" | "pending_bind" | "expired" | "claimed";
  emergency_claims_contact?: string | null;
  policy_certificate_url?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DroneCombatGear {
  id: string;
  event_id?: string | null;
  event_title?: string | null;
  name: string;
  gear_category: string;
  model_sku?: string | null;
  serial_number?: string | null;
  quantity: number;
  combat_readiness_status: "combat_ready" | "needs_prop_replacement" | "undergoing_avionics_repair" | "destroyed_in_combat" | "spare_reserve";
  weight_kg: number;
  is_hazmat_battery: boolean;
  lipo_wh_rating: number;
  assigned_pilot_or_custodian?: string | null;
  luggage_manifest_id?: string | null;
  case_code?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SpecialLuggageManifest {
  id: string;
  event_id?: string | null;
  event_title?: string | null;
  case_code: string;
  case_name: string;
  luggage_classification: string;
  carrier_airline?: string | null;
  baggage_tag_number?: string | null;
  tracking_number?: string | null;
  dimensions_cm?: string | null;
  gross_weight_kg: number;
  max_airline_allowance_kg: number;
  excess_baggage_fee: number;
  iata_lipo_compliant: boolean;
  carnet_customs_declaration?: string | null;
  custodian_name: string;
  custodian_email?: string | null;
  status: "packed" | "checked_in" | "in_transit" | "customs_inspected" | "delivered_at_venue" | "returned";
  handling_instructions?: string | null;
  item_count?: number;
  created_at: string;
  updated_at: string;
}

export interface TravelDashboardSummary {
  events: {
    total: number;
    attendees: number;
    recent: Array<{
      id: string;
      title: string;
      event_type: string;
      location: string;
      start_date: string;
      end_date: string;
      status: string;
    }>;
  };
  budget: {
    allocated: number;
    spent: number;
    remaining: number;
  };
  stipends: {
    total_recipients: number;
    total_amount: number;
    disbursed_count: number;
  };
  drone_combat_gear: {
    total_gear_units: number;
    combat_ready: number;
    lipo_packs: number;
  };
  special_luggage: {
    cases_count: number;
    total_weight_kg: number;
    excess_baggage_fees: number;
  };
  special_coverage: {
    active_policies: number;
    total_coverage_limit: number;
    total_premium: number;
  };
}

export interface LoyaltyProgram {
  id: string;
  executive_id: string;
  program_name: string;
  account_number: string;
  tier_status: string;
  points_balance: number;
  perks_summary?: string | null;
  created_at?: string;
}

export interface ExecutiveProfile {
  id: string;
  name: string;
  email: string;
  title: string;
  assigned_ea_name: string;
  assigned_ea_email: string;
  preferred_airlines?: string | null;
  preferred_seat_class?: string | null;
  preferred_hotel_chains?: string | null;
  preferred_car_rental?: string | null;
  home_time_zone?: string | null;
  notes?: string | null;
  loyalty_programs?: LoyaltyProgram[];
  created_at: string;
  updated_at: string;
}

export interface TravelBooking {
  id: string;
  traveler_name: string;
  traveler_email: string;
  booked_by_name: string;
  booked_by_role: string;
  booking_reference: string;
  carrier_airline: string;
  flight_numbers: string;
  hotel_name?: string | null;
  car_rental_details?: string | null;
  origin_city: string;
  destination_city: string;
  departure_date: string;
  return_date: string;
  seat_assignment?: string | null;
  total_cost: number;
  currency: string;
  booking_source: string;
  status: string;
  sync_status: string;
  has_schedule_conflict: boolean;
  conflict_details?: string | null;
  time_zone_departure: string;
  time_zone_destination: string;
  time_zone_diff_hours?: number;
  time_zone_diff_label?: string;
  routing_tier?: string;
  requires_drone_luggage: boolean;
  pelican_case_tag?: string | null;
  raw_scraped_data?: any;
  created_at: string;
  updated_at: string;
}

export interface WeeklyTravelRoster {
  week_label: string;
  summary: {
    total_active_travelers: number;
    executive_tier_count: number;
    central_team_count: number;
    conflict_count: number;
    drone_luggage_manifests: number;
    total_weekly_spend_usd: number;
    primary_airports: string[];
  };
  travelers: TravelBooking[];
}

export interface ScraperLog {
  id: string;
  carrier: string;
  booking_reference: string;
  initiated_by: string;
  target_url?: string;
  scrape_method: string;
  scraped_payload?: any;
  status: string;
  created_at: string;
}

export interface AiItineraryOption {
  option_id: string;
  tier: string;
  airline: string;
  flight_outbound: string;
  flight_return: string;
  cabin: string;
  seat_preferred: string;
  loyalty_program: string;
  points_earned: number;
  hotel: string;
  hotel_perks: string;
  car_rental: string;
  flight_cost: number;
  hotel_cost: number;
  car_cost: number;
  total_package_cost: number;
  budget_cap: number;
  within_budget: boolean;
  budget_headroom: number;
  drone_gear_support: string;
}

export interface AiChatResponse {
  conversation_id: string;
  assistant_name: string;
  executive_target: string;
  latest_bot_reply: string;
  model_thinking?: string;
  flights?: import("./flight").FlightSearchResultItem[];
  itinerary_options: AiItineraryOption[];
  messages: Array<{
    id: string;
    conversation_id: string;
    sender: "assistant" | "bot";
    message_text: string;
    model_thinking?: string;
    itinerary_payload?: any;
    created_at: string;
  }>;
}

export interface RealtimeBudgetForecast {
  fiscal_summary: {
    total_allocated_usd: number;
    total_realtime_burden_usd: number;
    remaining_headroom_usd: number;
    burn_rate_percent: number;
    is_over_budget: boolean;
  };
  breakdown_by_routing_tier: {
    executive_ea_spend: number;
    central_travel_dept_spend: number;
    trade_shows_and_gear_spend: number;
  };
  recent_commitments: Array<{
    booking_reference: string;
    traveler: string;
    amount: number;
    booked_by: string;
    carrier: string;
    route: string;
    status: string;
  }>;
  budgets: TravelBudget[];
}

export interface VehicleSeat {
  position: string;
  occupant: string;
  type: "driver" | "vip" | "crew" | "staff" | "cargo" | "available";
}

export interface VehicleSeatRow {
  row: number;
  seats: VehicleSeat[];
}

export interface TravelVehicle {
  id: string;
  vehicle_name: string;
  make: string;
  model: string;
  year: number;
  rental_agency: string;
  vehicle_class: string;
  license_plate?: string | null;
  confirmation_code?: string | null;
  seating_capacity: number;
  cargo_cases_capacity: number;
  assigned_event_id?: string | null;
  assigned_driver: string;
  seat_layout?: VehicleSeatRow[];
  current_passengers?: string[];
  daily_rate_usd: number;
  total_cost_usd: number;
  status: "available" | "reserved" | "active_on_road" | "returned";
  notes?: string | null;
  event_title?: string | null;
  event_location?: string | null;
  event_start_date?: string | null;
  event_end_date?: string | null;
  occupied_seats_count?: number;
  available_seats_count?: number;
  user_assigned_seat?: { position: string; row: number; occupant: string; type: string } | null;
  departure_status?: "idle" | "loading_up" | "leaving_soon" | "en_route" | "arrived" | "cancelled" | null;
  departure_location?: string | null;
  departure_time?: string | null;
  departure_message?: string | null;
  departure_updated_at?: string | null;
  departure_updated_by?: string | null;
  car_image_url?: string | null;
  rental_company_name?: string | null;
  mileage?: string | null;
  passenger_description?: string | null;
  bag_description?: string | null;
  navan_url?: string | null;
  navan_pickup_url?: string | null;
  navan_dropoff_url?: string | null;
  navan_printable_url?: string | null;
  car_description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface VehicleScrapeRequest {
  url: string;
  vehicle_id?: string;
  vendor?: string;
  raw_html?: string;
}

export interface VehicleScrapeResponse {
  status: string;
  specs: {
    category?: string;
    make?: string;
    model?: string;
    vehicle_name?: string;
    vehicle_class?: string;
    seating_capacity?: number;
    cargo_cases_capacity?: number;
    passengers?: string;
    passenger_description?: string;
    baggage?: string;
    bag_description?: string;
    mileage?: string;
    car_image_url?: string;
    agency?: string;
    navan_url?: string;
    pickup_url?: string;
    dropoff_url?: string;
    printable_url?: string;
    confirmation_number?: string;
  };
  vehicle?: TravelVehicle | null;
}

export interface VehicleDepartureBroadcastPayload {
  departure_status: "loading_up" | "leaving_soon" | "en_route" | "arrived" | "cancelled";
  departure_location?: string;
  departure_time?: string;
  message?: string;
  broadcaster_name?: string;
  broadcaster_email?: string;
}

export interface VehicleCheckInPayload {
  passenger_name: string;
  passenger_email?: string;
  seat_position?: string;
  row_number?: number;
  action?: "check_in" | "check_out";
}

export interface VehicleSpecLookupResult {
  make: string;
  model: string;
  amount_of_seats: number;
  seat_configuration: string;
  rows: number;
  vehicle_class: string;
  rental_tier: string;
  cargo_pelican_capacity: number;
  luggage_capacity_bags: number;
  source: string;
  default_seat_layout: VehicleSeatRow[];
}

export interface EventScheduleItem {
  id: string;
  event_id: string;
  schedule_date: string;
  start_time: string;
  end_time?: string | null;
  title: string;
  activity_type: "meeting" | "transport" | "flight_test" | "dogfight" | "dinner" | "briefing" | string;
  meeting_spot: string;
  meeting_spot_instructions?: string | null;
  assigned_vehicle_name?: string | null;
  target_audience: string;
  coordinator_name: string;
  notes?: string | null;
  event_title?: string | null;
  event_location?: string | null;
  event_start_date?: string | null;
  event_end_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TripScheduleResponse {
  today_date: string;
  tomorrow_date: string;
  today_items: EventScheduleItem[];
  tomorrow_items: EventScheduleItem[];
  all_items: EventScheduleItem[];
  total_items: number;
}

export interface ReceiptLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface TravelReceipt {
  id: string;
  event_id?: string | null;
  user_email: string;
  user_name: string;
  receipt_number?: string | null;
  merchant_name: string;
  transaction_date: string;
  total_amount: number;
  tax_amount: number;
  tip_amount: number;
  subtotal_amount?: number | null;
  discount_amount?: number | null;
  net_subtotal?: number | null;
  calculation_verified?: boolean;
  discount_details?: string | null;
  currency: string;
  expense_category: "flight" | "lodging" | "ground_transport" | "meals_entertainment" | "drone_gear_cargo" | "fuel" | "equipment_supplies" | "other" | string;
  payment_method: string;
  policy?: string;
  amount_cad?: number;
  exchange_rate?: number;
  description?: string | null;
  is_reimbursable?: boolean;
  is_billable?: boolean;
  project_code?: string | null;
  attendees?: string | null;
  line_items: ReceiptLineItem[];
  raw_extracted_text?: string | null;
  extraction_confidence: number;
  extraction_metadata?: Record<string, any>;
  file_name?: string | null;
  file_type?: string | null;
  file_size_bytes?: number;
  file_data?: string | null;
  status: "draft" | "pending_approval" | "approved" | "reimbursed" | "rejected";
  notes?: string | null;
  event_title?: string | null;
  event_location?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ReceiptExtractionResult {
  merchant_name: string;
  transaction_date: string;
  total_amount: number;
  tax_amount: number;
  tip_amount: number;
  subtotal_amount?: number | null;
  discount_amount?: number | null;
  net_subtotal?: number | null;
  calculation_verified?: boolean;
  discount_details?: string | null;
  currency: string;
  expense_category: string;
  payment_method: string;
  policy?: string;
  amount_cad?: number;
  exchange_rate?: number;
  description?: string | null;
  is_reimbursable?: boolean;
  is_billable?: boolean;
  project_code?: string | null;
  attendees?: string | null;
  receipt_number?: string | null;
  line_items: ReceiptLineItem[];
  extraction_confidence: number;
  raw_extracted_text: string;
  extraction_metadata: Record<string, any>;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  file_data?: string | null;
  event_id?: string | null;
}

export interface ReceiptStatsSummary {
  total_receipts: number;
  total_amount: number;
  pending_amount: number;
  approved_amount: number;
  reimbursed_amount: number;
}

export interface ReceiptsApiResponse {
  receipts: TravelReceipt[];
  stats: ReceiptStatsSummary;
}

export interface BatchReceiptUploadResponse {
  total: number;
  success_count: number;
  failed_count: number;
  items: TravelReceipt[];
  errors: Array<{ file_name: string; error: string }>;
}

export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
  countries: string[];
  default_exchange_rate: number;
  is_popular?: boolean;
}

export interface CurrenciesApiResponse {
  currencies: CurrencyOption[];
  total: number;
  source: string;
}

export interface VehicleCatalogMake {
  make: string;
  default_daily_rate: number;
  rate_range: string;
  suggested_rates: number[];
}

export interface VehicleCatalogModel {
  make: string;
  model: string;
  category: string;
  vehicle_class: string;
  seating_capacity: number;
  cargo_cases_capacity: number;
  default_daily_rate: number;
  rate_range: string;
  is_common_model: boolean;
  preferred_agency?: string;
}

export interface VehicleCatalogResponse {
  makes: VehicleCatalogMake[];
  models: VehicleCatalogModel[];
  common_models: string[];
}

export interface NavanConnectionStatus {
  configured: boolean;
  status: "online" | "ip_restricted" | "missing_credentials" | "error";
  authenticated: boolean;
  scope?: string;
  company_uuid?: string;
  allowed_ips?: string;
  detected_public_ip?: string;
  ip_match?: boolean;
  features?: {
    bookings_read: boolean;
    liquid_read: boolean;
  };
  advisory?: string | null;
  database?: {
    stored_bookings: number;
    stored_expenses: number;
  };
}

export interface NavanBooking {
  id: string;
  uuid: string;
  booking_id: string;
  booking_type: "FLIGHT" | "HOTEL" | "CAR" | "RAIL" | string;
  booking_status: "CONFIRMED" | "CANCELLED" | "PENDING" | string;
  trip_name?: string | null;
  event_name?: string | null;
  event_id?: string | null;
  traveler_name: string;
  traveler_email: string;
  vendor: string;
  airline_route?: string | null;
  origin?: string | null;
  destination?: string | null;
  start_date: string;
  end_date?: string | null;
  cabin?: string | null;
  grand_total: number;
  usd_grand_total: number;
  currency: string;
  out_of_policy: boolean;
  out_of_policy_violations?: string | null;
  approval_status: string;
  hotel_name?: string | null;
  car_type?: string | null;
  synced_at?: string;
}

export interface NavanExpense {
  id: string;
  transaction_id: string;
  report_id?: string;
  user_name: string;
  user_email: string;
  merchant_name: string;
  amount: number;
  usd_amount: number;
  currency: string;
  category: string;
  payment_method: string;
  status: string;
  transaction_date: string;
  receipt_url?: string | null;
  policy_compliant: boolean;
  approver_name?: string | null;
  synced_at?: string;
}

export interface NavanOverview {
  connection: NavanConnectionStatus;
  metrics: {
    total_bookings: number;
    total_booking_spend: number;
    flights_count: number;
    hotels_count: number;
    cars_count: number;
    rail_count: number;
    out_of_policy_count: number;
    pending_approvals: number;
    total_transactions: number;
    total_expense_spend: number;
    non_compliant_expenses: number;
  };
  category_distribution: Array<{
    category: string;
    count: number;
    amount: number;
  }>;
  recent_bookings: NavanBooking[];
  recent_expenses: NavanExpense[];
}

export interface NavanSyncedEvent {
  id: string;
  title: string;
  event_type: string;
  location: string;
  venue?: string | null;
  start_date: string;
  end_date: string;
  coordinator_name?: string | null;
  coordinator_email?: string | null;
  status: "planning" | "confirmed" | "ongoing" | "completed" | "cancelled" | string;
  description?: string | null;
  attendees_count: number;
  total_spent: number;
  total_budget: number;
  roster: Array<{
    id: string;
    attendee_name: string;
    attendee_email: string;
    role_in_event: string;
    attendance_status: string;
    flight_details?: string | null;
    lodging_details?: string | null;
    stipend_amount: number;
    notes?: string | null;
  }>;
}

export interface NavanGroupAttendee {
  name: string;
  email: string;
  employee_id: string | null;
  type: "EMPLOYEE" | "GUEST";
}

export interface NavanGroupBookingItem {
  bookingId: string;
  bookingType: string;
  bookingStatus: string;
  employeeId: string | null;
  amount: number;
  currency: string;
  startDate: string | null;
  endDate: string | null;
}

export interface NavanGroupEventSummary {
  event_name: string;
  total_bookings: number;
  total_spend: Record<string, number>;
  attendees: NavanGroupAttendee[];
  bookings: NavanGroupBookingItem[];
}

export type NavanGroupEventsMap = Record<string, NavanGroupEventSummary>;

export interface TripBookingDetail {
  booking_id: string;
  booking_type: string;
  booking_status: string;
  vendor?: string | null;
  origin?: string | null;
  destination?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  amount: number;
  confirmation_number?: string | null;
  flight_number?: string | null;
  airline_code?: string | null;
  cabin_class?: string | null;
  hotel_room_name?: string | null;
  hotel_address?: string | null;
  hotel_city?: string | null;
  rental_company?: string | null;
  vehicle_name?: string | null;
  car_description?: string | null;
  car_model?: string | null;
  car_make?: string | null;
  seats?: number | null;
  bags?: number | null;
  pickup_time?: string | null;
  drop_off_time?: string | null;
  pickup_location?: string | null;
  dropoff_location?: string | null;
  car_uuid?: string | null;
  trip_uuid?: string | null;
  is_round_trip?: boolean | null;
  route_type?: string | null;
  flight_total_amount?: number | null;
  departure_flight_amount?: number | null;
  return_flight_amount?: number | null;
  parent_booking_uuid?: string | null;
  outbound?: {
    origin?: string | null;
    destination?: string | null;
    route_path?: string | null;
    flight_numbers?: string | null;
    date?: string | null;
    cabin?: string | null;
    amount?: number | null;
    departure_time?: string | null;
    arrival_time?: string | null;
    segments?: any[] | null;
  } | null;
  return_leg?: {
    origin?: string | null;
    destination?: string | null;
    route_path?: string | null;
    flight_numbers?: string | null;
    date?: string | null;
    cabin?: string | null;
    amount?: number | null;
    departure_time?: string | null;
    arrival_time?: string | null;
    segments?: any[] | null;
  } | null;
}

export interface TripUser {
  name: string;
  email?: string | null;
  total_spend: number;
  booking_count: number;
  booking_types: string[];
  bookings: TripBookingDetail[];
}

export interface EventTripGroup {
  event_name: string;
  location?: string | null;
  total_spend: number;
  total_bookings: number;
  travelers_count: number;
  start_date?: string | null;
  end_date?: string | null;
  users: TripUser[];
}
