import type {
  Car,
  CarsFilters,
  CarsListResponse,
  Booking,
  Invoice,
  User,
  ProfileResponse,
  AdminStats,
  AdminUserRow,
  AdminBookingRow,
  AdminInvoiceRow,
  AdminListResponse,
  Role,
  BookingStatus,
  OwnerStats,
  OwnerBookingRow,
  UserBookingRow,
  UserInvoiceRow,
} from './types';

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, msg?: string) {
    super(msg || code);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch('/api' + path, {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data: unknown = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    const code = (data as { error?: string } | null)?.error ?? 'request_failed';
    throw new ApiError(res.status, code);
  }
  return data as T;
}

function buildQuery(filters: CarsFilters): string {
  const p = new URLSearchParams();
  if (filters.q)            p.set('q', filters.q);
  if (filters.category)     p.set('category', filters.category);
  if (filters.fuel?.length)         p.set('fuel', filters.fuel.join(','));
  if (filters.transmission?.length) p.set('transmission', filters.transmission.join(','));
  if (filters.seats)        p.set('seats', String(filters.seats));
  if (filters.hub?.length)  p.set('hub', filters.hub.join(','));
  if (filters.price_min != null) p.set('price_min', String(filters.price_min));
  if (filters.price_max != null) p.set('price_max', String(filters.price_max));
  if (filters.sort)         p.set('sort', filters.sort);
  if (filters.limit != null)  p.set('limit', String(filters.limit));
  if (filters.offset != null) p.set('offset', String(filters.offset));
  const qs = p.toString();
  return qs ? '?' + qs : '';
}

export const api = {
  auth: {
    signup: (data: { name: string; email: string; password: string; phone?: string; role?: 'cliente' | 'proprietario' }) =>
      request<{ user: User; token: string }>('POST', '/auth/signup', data),
    login: (data: { email: string; password: string }) =>
      request<{ user: User; token: string }>('POST', '/auth/login', data),
    logout: () => request<{ ok: true }>('POST', '/auth/logout'),
    me:     () => request<{ user: User }>('GET', '/auth/me'),
  },
  cars: {
    list: (filters: CarsFilters = {}) =>
      request<CarsListResponse>('GET', '/cars' + buildQuery(filters)),
    get: (idOrSlug: string | number) =>
      request<Car>('GET', '/cars/' + idOrSlug),
  },
  bookings: {
    create: (data: unknown) =>
      request<{ booking: Booking }>('POST', '/bookings', data),
    get: (code: string) =>
      request<{ booking: Booking; invoices: Invoice[] }>('GET', '/bookings/' + code),
  },
  favorites: {
    toggle: (carId: number) =>
      request<{ favored: boolean }>('POST', `/favorites/${carId}/toggle`),
  },
  profile: {
    get:    () => request<ProfileResponse>('GET', '/profile'),
    update: (patch: Partial<{ name: string; phone: string; cpf: string; cnh: string; birthdate: string }>) =>
      request<{ user: User }>('PATCH', '/profile', patch),
    bookings:  () => request<{ items: UserBookingRow[] }>('GET', '/profile/bookings'),
    invoices:  () => request<{ items: UserInvoiceRow[] }>('GET', '/profile/invoices'),
    favorites: () => request<{ items: Car[] }>('GET', '/profile/favorites'),
  },
  owner: {
    stats:    () => request<OwnerStats>('GET', '/owner/stats'),
    bookings: (params: { status?: BookingStatus; q?: string; limit?: number; offset?: number } = {}) => {
      const p = new URLSearchParams();
      if (params.status) p.set('status', params.status);
      if (params.q) p.set('q', params.q);
      if (params.limit  != null) p.set('limit',  String(params.limit));
      if (params.offset != null) p.set('offset', String(params.offset));
      const qs = p.toString();
      return request<AdminListResponse<OwnerBookingRow>>('GET', '/owner/bookings' + (qs ? '?' + qs : ''));
    },
    /* Reusa /api/cars com owner=me para listar meus carros e CRUD */
    myCars: () => request<CarsListResponse>('GET', '/cars?owner=me&limit=200'),
    createCar: (data: Partial<Car>) =>
      request<Car>('POST', '/cars', data),
    updateCar: (id: number, data: Partial<Car>) =>
      request<Car>('PUT', `/cars/${id}`, data),
    deleteCar: (id: number) =>
      request<{ ok: true }>('DELETE', `/cars/${id}`),
  },
  admin: {
    stats: () => request<AdminStats>('GET', '/admin/stats'),

    users: (params: { role?: Role; q?: string; limit?: number; offset?: number } = {}) => {
      const p = new URLSearchParams();
      if (params.role) p.set('role', params.role);
      if (params.q)    p.set('q', params.q);
      if (params.limit  != null) p.set('limit',  String(params.limit));
      if (params.offset != null) p.set('offset', String(params.offset));
      const qs = p.toString();
      return request<AdminListResponse<AdminUserRow>>('GET', '/admin/users' + (qs ? '?' + qs : ''));
    },
    updateUser: (id: number, patch: Partial<{ name: string; email: string; phone: string; role: Role }>) =>
      request<AdminUserRow>('PATCH', `/admin/users/${id}`, patch),
    deleteUser: (id: number) => request<{ ok: true }>('DELETE', `/admin/users/${id}`),

    bookings: (params: { status?: BookingStatus; user_id?: number; car_id?: number; q?: string; limit?: number; offset?: number } = {}) => {
      const p = new URLSearchParams();
      if (params.status) p.set('status', params.status);
      if (params.user_id != null) p.set('user_id', String(params.user_id));
      if (params.car_id  != null) p.set('car_id',  String(params.car_id));
      if (params.q) p.set('q', params.q);
      if (params.limit  != null) p.set('limit',  String(params.limit));
      if (params.offset != null) p.set('offset', String(params.offset));
      const qs = p.toString();
      return request<AdminListResponse<AdminBookingRow>>('GET', '/admin/bookings' + (qs ? '?' + qs : ''));
    },
    updateBooking: (id: number, patch: { status: BookingStatus }) =>
      request<Booking>('PATCH', `/admin/bookings/${id}`, patch),

    invoices: (params: { paid?: boolean; overdue?: boolean; limit?: number; offset?: number } = {}) => {
      const p = new URLSearchParams();
      if (params.paid    != null) p.set('paid',    String(params.paid));
      if (params.overdue != null) p.set('overdue', String(params.overdue));
      if (params.limit   != null) p.set('limit',   String(params.limit));
      if (params.offset  != null) p.set('offset',  String(params.offset));
      const qs = p.toString();
      return request<AdminListResponse<AdminInvoiceRow>>('GET', '/admin/invoices' + (qs ? '?' + qs : ''));
    },
    updateInvoice: (id: number, patch: { paid: boolean }) =>
      request<Invoice>('PATCH', `/admin/invoices/${id}`, patch),
  },
};

export const fmt = {
  brl: (n: number | string) => 'R$ ' + Number(n).toLocaleString('pt-BR'),
  int: (n: number | string) => Number(n).toLocaleString('pt-BR'),
  date: (s: string) => {
    const d = new Date(s);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase();
  },
  dateLong: (s: string) => {
    const d = new Date(s);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  },
  daysBetween: (a: string | Date, b: string | Date) =>
    Math.max(0, Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000)),
};

export const LABELS = {
  category: {
    urbano:'Urbano', seda:'Sedã', suv:'SUV', pickup:'Pickup', eletrico:'Elétrico', luxo:'Luxo',
  } as const,
  fuel: {
    flex:'Flex', hibrido:'Híbrido', eletrico:'Elétrico', diesel:'Diesel',
  } as const,
  transmission: {
    automatico:'Automático', cvt:'CVT', manual:'Manual',
  } as const,
  hub: {
    'sao-paulo':'São Paulo', rio:'Rio de Janeiro', bh:'Belo Horizonte',
    curitiba:'Curitiba', poa:'Porto Alegre',
  } as const,
  km: {
    '1500':'1.500 km/mês', '2500':'2.500 km/mês', 'livre':'Km livre',
  } as const,
  extra: {
    seguro_plus:'Seguro total premium',
    manutencao_premium:'Manutenção e revisões',
    motorista_extra:'Motorista adicional',
    wallbox:'Carregador wallbox',
  } as const,
  delivery: {
    hoje_24h:'Hoje · 24h', amanha_48h:'Amanhã · 48h', agendar:'Agendada · até 7 dias',
  } as const,
  payment: {
    card:'Cartão', pix:'Pix', boleto:'Boleto',
  } as const,
};

export const PRICING = {
  termDiscount: { 1: 1.0, 3: 0.95, 6: 0.92, 12: 0.88 } as const,
  extraMonthly: {
    seguro_plus: 190,
    manutencao_premium: 120,
    motorista_extra: 60,
    wallbox: 90,
  } as const,
  kmSurcharge: { '1500': 0, '2500': 180, 'livre': 420 } as const,
};
