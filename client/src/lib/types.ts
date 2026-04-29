export type Role = 'admin' | 'cliente' | 'proprietario';

export type Category = 'urbano' | 'seda' | 'suv' | 'pickup' | 'eletrico' | 'luxo';
export type Fuel = 'flex' | 'hibrido' | 'eletrico' | 'diesel';
export type Transmission = 'automatico' | 'cvt' | 'manual';
export type Hub = 'sao-paulo' | 'rio' | 'bh' | 'curitiba' | 'poa';
export type Badge = 'new' | 'popular' | 'ev' | null;
export type TermMonths = 1 | 3 | 6 | 12;
/** Franquia mensal — string livre porque o proprietario define os valores
 *  permitidos. 'livre' é o caso especial sem limite; demais sao numeros em km. */
export type KmLimit = string;
export interface KmOption {
  value: string;     // '1500' | '2500' | '5000' | 'livre' | qualquer km como string
  surcharge: number; // adicional mensal em R$
}
export type ExtraKey = 'seguro_plus' | 'manutencao_premium' | 'motorista_extra' | 'wallbox';
export type PaymentMethod = 'card' | 'pix' | 'boleto';
export type DeliveryWhen = 'hoje_24h' | 'amanha_48h' | 'agendar';
export type BookingStatus = 'active' | 'scheduled' | 'finished' | 'cancelled';

export interface Car {
  id: number;
  slug: string;
  brand: string;
  model: string;
  year: number;
  category: Category;
  fuel: Fuel;
  transmission: Transmission;
  seats: number;
  range_km: number | null;
  power_hp: number | null;
  delivery_hours: number;
  hub: Hub;
  price_month: number;
  badge: Badge;
  description: string | null;
  stock: number;
  km_options: KmOption[];
  /** Preco mensal por prazo (1, 3, 6, 12 meses) — definido pelo proprietario. */
  term_prices: Record<'1' | '3' | '6' | '12', number>;
  /** Avaliacao real do proprietario (vem em /api/cars/:id detail). */
  owner_rating?: { avg: number; total: number };
  created_at: string;
}

export type UserStatus = 'active' | 'suspended' | 'banned';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  phone: string | null;
  cpf?: string | null;
  cnh?: string | null;
  birthdate?: string | null;
  status?: UserStatus;
  created_at?: string;
}

export interface Booking {
  id: number;
  code: string;
  user_id: number;
  car_id: number;
  term_months: TermMonths;
  km_limit: KmLimit;
  extras: ExtraKey[];
  start_date: string;
  end_date: string;
  monthly_price: number;
  total_price: number;
  delivery_addr: string | null;
  delivery_when: DeliveryWhen | null;
  payment_method: PaymentMethod | null;
  status: BookingStatus;
  delivered_at: string | null;
  delivery_confirmed_at: string | null;
  cancelled_at: string | null;
  cancelled_by: number | null;
  cancellation_fee: number | null;
  cancellation_reason: string | null;
  created_at: string;
  // joined fields
  brand?: string;
  model?: string;
  year?: number;
  category?: Category;
  slug?: string;
  range_km?: number;
  power_hp?: number;
}

export interface Invoice {
  id: number;
  booking_id: number;
  amount: number;
  due_date: string;
  paid: 0 | 1;
  paid_at: string | null;
}

export interface CarsListResponse {
  items: Car[];
  total: number;
  limit: number;
  offset: number;
}

export interface ProfileResponse {
  user: User;
  active: Booking | null;
  upcomingInvoices: Invoice[];
  bookings: Booking[];
  favorites: Car[];
}

export interface BookingDraft {
  car_id: number;
  slug: string;
  brand: string;
  model: string;
  year: number;
  term_months: TermMonths;
  km_limit: KmLimit;
  extras: ExtraKey[];
  monthly_price: number;
}

export interface CarsFilters {
  q?: string;
  category?: Category;
  fuel?: Fuel[];
  transmission?: Transmission[];
  seats?: number;
  hub?: Hub[];
  price_min?: number;
  price_max?: number;
  sort?: 'popular' | 'newest' | 'price_asc' | 'price_desc';
  limit?: number;
  offset?: number;
}

/* ================ ADMIN ================ */

export interface AdminStats {
  users: { admin: number; cliente: number; proprietario: number };
  cars: { platform: number; owners: number; total: number };
  bookings: { active: number; scheduled: number; finished: number; cancelled: number };
  mrr: number;
  invoices: { open: number; overdue: number; overdue_amount: number };
  topCars: Array<{
    id: number; brand: string; model: string; year: number; slug: string;
    price_month: number; bookings: number;
  }>;
  recentBookings: Array<{
    id: number; code: string; status: BookingStatus; monthly_price: number;
    created_at: string; user_name: string; user_email: string;
    brand: string; model: string;
  }>;
}

export interface AdminUserRow {
  id: number;
  name: string;
  email: string;
  role: Role;
  phone: string | null;
  cpf: string | null;
  cnh: string | null;
  status: UserStatus;
  status_reason: string | null;
  created_at: string;
  bookings_count: number;
  cars_count: number;
}

export interface AdminAuditRow {
  id: number;
  admin_id: number;
  admin_email: string;
  action: string;
  target_entity: string | null;
  target_id: number | null;
  payload: Record<string, unknown>;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AdminBookingRow {
  id: number;
  code: string;
  status: BookingStatus;
  term_months: TermMonths;
  km_limit: KmLimit;
  start_date: string;
  end_date: string;
  monthly_price: number;
  total_price: number;
  payment_method: PaymentMethod | null;
  delivery_when: DeliveryWhen | null;
  created_at: string;
  user_id: number;
  user_name: string;
  user_email: string;
  car_id: number;
  brand: string;
  model: string;
  year: number;
  slug: string;
}

export interface AdminInvoiceRow {
  id: number;
  amount: number;
  due_date: string;
  paid: boolean;
  paid_at: string | null;
  booking_id: number;
  booking_code: string;
  booking_status: BookingStatus;
  user_id: number;
  user_name: string;
  user_email: string;
  brand: string;
  model: string;
}

export interface AdminListResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

/* ================ OWNER ================ */

export interface OwnerStats {
  cars: { total: number; units: number; avg_price: number };
  bookings: { active: number; finished: number; cancelled: number; mrr: number };
  topCars: Array<{
    id: number; brand: string; model: string; slug: string;
    price_month: number; bookings: number; mrr: number;
  }>;
}

export interface OwnerBookingRow {
  id: number;
  code: string;
  status: BookingStatus;
  term_months: TermMonths;
  start_date: string;
  end_date: string;
  monthly_price: number;
  total_price: number;
  delivered_at: string | null;
  delivery_confirmed_at: string | null;
  cancelled_at: string | null;
  cancellation_fee: number | null;
  cancellation_reason: string | null;
  created_at: string;
  user_id: number;
  user_name: string;
  user_email: string;
  car_id: number;
  brand: string;
  model: string;
  year: number;
  slug: string;
}

export interface OwnerInvoiceRow {
  id: number;
  amount: number;
  due_date: string;
  paid: boolean;
  paid_at: string | null;
  booking_id: number;
  booking_code: string;
  booking_status: BookingStatus;
  user_id: number;
  user_name: string;
  user_email: string;
  car_id: number;
  brand: string;
  model: string;
  slug: string;
}

/* ================ CUSTOMER (perfil estendido) ================ */

export interface UserBookingRow {
  id: number;
  code: string;
  status: BookingStatus;
  term_months: TermMonths;
  km_limit: KmLimit;
  start_date: string;
  end_date: string;
  monthly_price: number;
  total_price: number;
  payment_method: PaymentMethod | null;
  delivery_when: DeliveryWhen | null;
  delivered_at: string | null;
  delivery_confirmed_at: string | null;
  cancelled_at: string | null;
  cancellation_fee: number | null;
  cancellation_reason: string | null;
  created_at: string;
  car_id: number;
  brand: string;
  model: string;
  year: number;
  slug: string;
  category: Category;
  owner_id: number | null;
}

export interface UserInvoiceRow {
  id: number;
  amount: number;
  due_date: string;
  paid: boolean;
  paid_at: string | null;
  booking_id: number;
  booking_code: string;
  booking_status: BookingStatus;
  brand: string;
  model: string;
}

/* ================ CHAT ================ */

export interface ChatThreadSummary {
  code: string;
  booking_id: number;
  status: BookingStatus;
  brand: string;
  model: string;
  year: number;
  slug: string;
  role: 'cliente' | 'proprietario';
  peer_id: number | null;
  peer_name: string | null;
  peer_email: string | null;
  last_body: string | null;
  last_at: string | null;
  unread: number;
}

export interface ChatMessage {
  id: number;
  sender_id: number;
  sender_name: string;
  sender_role: Role;
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface ChatThread {
  booking: {
    code: string;
    status: BookingStatus;
    car: { brand: string; model: string; year: number; slug: string };
  };
  role: 'cliente' | 'proprietario';
  peer: { id: number; name: string; email: string; role: Role };
  messages: ChatMessage[];
}

/* ================ COMMENTS / REVIEWS ================ */

export interface CarComment {
  id: number;
  body: string;
  created_at: string;
  user_id: number;
  user_name: string;
  user_role: Role;
}

export interface ProfileReview {
  id: number;
  rating: number;
  body: string | null;
  created_at: string;
  author_id: number;
  author_name: string;
  author_role: Role;
}

export interface ProfileReviewsResponse {
  target?: { id: number; name: string; role: Role };
  summary: { total: number; avg: number };
  items: ProfileReview[];
}

/* ================ NOTIFICATIONS ================ */

export type NotificationType = 'message' | 'booking' | 'invoice';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  meta: string;
  link: string;
  at: string;
  unread: boolean;
}

export interface NotificationsResponse {
  items: NotificationItem[];
  unread: number;
}
