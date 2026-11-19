
import { apiRequest } from './api';

export interface Reservation {
  id: number;
  userId: number;
  eventId: number;
  cartId: number;
  status: string;
  expiresAt: string;
}

export interface CreateReservationPayload {
  eventId: number;
  cartId: number;
}

function getAuthHeaders(): HeadersInit {
  const accessToken = sessionStorage.getItem('accessToken');

  if (!accessToken) {
    throw new Error('Debes iniciar sesión para reservar.');
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

export function createReservation(
  userId: number,
  payload: CreateReservationPayload,
): Promise<Reservation> {
  if (!Number.isInteger(userId) || userId < 1) {
    throw new Error('El ID del usuario no es válido.');
  }

  if (
    !Number.isInteger(payload.eventId) ||
    payload.eventId < 1 ||
    !Number.isInteger(payload.cartId) ||
    payload.cartId < 1
  ) {
    throw new Error('Los datos del carrito no son válidos.');
  }

  return apiRequest<Reservation>(
    `/users/${userId}/reservations`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    },
  );
}
