export interface LiteApiStatus {
  environment: string;
  sandbox: boolean;
  banner: string | null;
  token_configured: boolean;
  webhook_secret_configured: boolean;
  configured: boolean;
  config_error: string | null;
  products: Record<string, { state: string; message?: string }>;
  permissions: { admin_read: boolean; book_on_behalf: boolean };
}

export interface HotelSearchCriteria {
  country_code: string;
  city_name: string;
  check_in: string;
  check_out: string;
  adults: number;
  child_ages: number[];
  rooms: number;
  currency: string;
  guest_nationality: string;
}

export interface HotelOffer {
  offer_id: string;
  room_name: string | null;
  board: string | null;
  total_amount: string;
  currency: string;
  refundable: boolean;
  cancel_deadline: string | null;
}

export interface HotelResult {
  hotel_id: string;
  name: string;
  address: string | null;
  stars: number | null;
  image: string | null;
  from_amount: string;
  currency: string;
  offers: HotelOffer[];
}

export interface HotelSearchResponse {
  session_id: string | null;
  hotels: HotelResult[];
  criteria: HotelSearchCriteria;
}

export interface CheckoutView {
  checkout_id: string;
  total_amount: string;
  currency: string;
  price_changed: boolean;
  previous_amount: string;
  requires_acceptance: boolean;
  summary: {
    hotel_name: string;
    address?: string | null;
    room_name?: string | null;
    board?: string | null;
    check_in: string;
    check_out: string;
    adults: number;
  };
  conditions: { refundable: boolean; cancel_deadline: string | null };
}

export interface GuestInput {
  first_name: string;
  last_name: string;
  email: string;
}

export interface DirectoryPerson {
  email: string;
  display_name: string | null;
  given_name: string | null;
  surname: string | null;
}

export interface BookPayload {
  checkout_id: string;
  holder: GuestInput;
  guests: GuestInput[];
  accepted_total?: string;
}

export interface LiteBooking {
  id: string;
  environment: string;
  liteapi_booking_id: string;
  supplier_reference: string | null;
  title: string;
  booking_status: string;
  payment_status: string;
  cancellation_status: string;
  total_amount: number | string;
  currency: string;
  starts_at: string | null;
  ends_at: string | null;
  summary: CheckoutView["summary"] & { hotel_id?: string };
  conditions: CheckoutView["conditions"];
  travelers: { name: string; email?: string | null }[];
  cancelled_at: string | null;
  last_synced_at: string | null;
  created_at: string;
  history?: { event_type: string; old_status: string | null; new_status: string | null; source: string; created_at: string }[];
}

export interface LiteBookingList {
  total: number;
  page: number;
  page_size: number;
  items: LiteBooking[];
}

export interface CancelResult {
  requires_confirmation?: boolean;
  message?: string;
  booking?: LiteBooking;
}
