import { apiRequest } from './api';

export interface EventCategoryOption {
  id: number;
  name: string;
  slug: string;
}

export interface EventTemplateOption {
  id: number;
  name: string;
  description?: string | null;
  usesZones: boolean;
  usesSeats: boolean;
  usesProducts: boolean;
  usesPromotions: boolean;
  usesQr: boolean;
}

export interface PromoterEventMetrics {
  ticketsSold: number;
  ticketsRevenue: number;
  productsSold: number;
  productsRevenue: number;
  totalRevenue: number;
  occupiedSeats: number;
  totalSeats: number;
}

export interface EventBuyerSummary {
  orderId: number;
  buyerName: string;
  buyerEmail: string;
  ticketsCount: number;
  productsCount: number;
  totalPaid: number;
  purchasedAt: string;
}

export interface PromoterEventItem {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  city: string;
  venue: string;
  address?: string | null;
  coverImageUrl?: string | null;
  capacity: number;
  startAt: string;
  endAt: string;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'CANCELLED' | string;
  rejectionReason?: string | null;
  category: EventCategoryOption;
  template: EventTemplateOption;
  configuration?: {
    usesZones: boolean;
    usesSeats: boolean;
    usesProducts: boolean;
    usesPromotions: boolean;
    usesQr: boolean;
  } | null;
  metrics?: PromoterEventMetrics;
}

export interface CreatePromoterEventPayload {
  name: string;
  description?: string;
  categoryId: number;
  templateId: number;
  city: string;
  latitude?: number;
  longitude?: number;
  venue: string;
  address?: string;
  coverImageUrl?: string;
  capacity: number;
  startAt: string;
  endAt: string;
  zones?: Array<{ name: string; capacity: number; price: number }>;
  seatGrid?: { rows: number; seatsPerRow: number };
  products?: Array<{ name: string; price: number; stock: number }>;
  promotions?: Array<{ name: string; code: string; discountPercent: number }>;
  generalTickets?: Array<{ name: string; price: number; quantity: number }>;
}

export interface SafeUpdatePromoterEventPayload {
  name: string;
  description?: string;
  coverImageUrl?: string;
  address?: string;
}

function authHeaders(): HeadersInit {
  const token = sessionStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getEventCategories(): Promise<EventCategoryOption[]> {
  return apiRequest<EventCategoryOption[]>('/event-categories', {
    headers: authHeaders(),
  });
}

export async function getEventTemplates(): Promise<EventTemplateOption[]> {
  return apiRequest<EventTemplateOption[]>('/event-templates', {
    headers: authHeaders(),
  });
}

export async function getMyPromoterEvents(): Promise<PromoterEventItem[]> {
  return apiRequest<PromoterEventItem[]>('/events/my-events', {
    headers: authHeaders(),
  });
}

export async function createPromoterEvent(
  payload: CreatePromoterEventPayload,
): Promise<PromoterEventItem> {
  return apiRequest<PromoterEventItem>('/events', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function submitEventForReview(
  eventId: number,
): Promise<PromoterEventItem> {
  return apiRequest<PromoterEventItem>(`/events/${eventId}/submit-review`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
}

export async function safeUpdatePromoterEvent(
  eventId: number,
  payload: SafeUpdatePromoterEventPayload,
): Promise<PromoterEventItem> {
  return apiRequest<PromoterEventItem>(`/events/${eventId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function getEventBuyers(
  eventId: number,
): Promise<EventBuyerSummary[]> {
  return apiRequest<EventBuyerSummary[]>(`/events/${eventId}/buyers`, {
    headers: authHeaders(),
  });
}