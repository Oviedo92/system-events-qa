
import { apiRequest } from './api';

export interface OrderItem {
  id: number;
  orderId: number;
  ticketTypeId: number | null;
  productVariantId: number | null;
  seatId: number | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  ticketType?: {
    id: number;
    name: string;
  } | null;
  productVariant?: {
    id: number;
    product?: {
      id: number;
      name: string;
    };
  } | null;
  seat?: {
    id: number;
    row?: string;
    number?: string;
  } | null;
}

export interface Order {
  id: number;
  userId: number;
  eventId: number;
  reservationId: number;
  cartId: number;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  event?: {
    id: number;
    name: string;
    slug?: string;
  };
  reservation?: {
    id: number;
    status: string;
    expiresAt: string;
  };
}

export interface CreateOrderPayload {
  reservationId: number;
}

function getAuthHeaders(): HeadersInit {
  const accessToken = sessionStorage.getItem('accessToken');

  if (!accessToken) {
    throw new Error('Debes iniciar sesión para gestionar tus pedidos.');
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

/** Consultar los pedidos del usuario autenticado. */
export function getMyOrders(userId: number): Promise<Order[]> {
  return apiRequest<Order[]>(`/users/${userId}/orders`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
}

/** Consultar un pedido por su ID. */
export function getOrder(orderId: number): Promise<Order> {
  return apiRequest<Order>(`/orders/${orderId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
}

/** Crear un pedido a partir de una reserva vigente. */
export function createOrder(
  payload: CreateOrderPayload,
): Promise<Order> {
  if (
    !Number.isInteger(payload.reservationId) ||
    payload.reservationId < 1
  ) {
    throw new Error('El ID de la reserva no es válido.');
  }

  return apiRequest<Order>('/orders', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

/** Cancelar un pedido pendiente. */
export function cancelOrder(orderId: number): Promise<Order> {
  return apiRequest<Order>(`/orders/${orderId}/cancel`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
}
