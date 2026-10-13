export interface EventAttendee {
  id: string;
  event_id: string;
  user_id?: string | null;
  attendee_name: string;
  attendee_email: string;
  role_in_event: string;
  attendance_status: "confirmed" | "tentative" | "declined";
  flight_details?: string | null;
  lodging_details?: string | null;
  stipend_amount: number;
  special_luggage_assigned?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
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
  status: "planning" | "confirmed" | "ongoing" | "completed" | "cancelled";
  description?: string | null;
  attendees_count?: number;
  total_budget_allocated?: number;
  total_budget_spent?: number;
  created_at: string;
  updated_at: string;
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
  user_id?: string | null;
  recipient_name: string;
  recipient_email: string;
  daily_rate: number;
  total_days: number;
  total_amount: number;
  currency: string;
  destination_tier: string;
  payment_method: string;
  status: "pending" | "approved" | "disbursed" | "settled";
  disbursed_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
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
  itinerary_options: AiItineraryOption[];
  messages: Array<{
    id: string;
    conversation_id: string;
    sender: "assistant" | "bot";
    message_text: string;
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

