
import { apiRequest } from './api';

export interface Payment {
  id: number;
  orderId: number;
  amount: number;
  method: string;
  status: string;
  transactionId?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentPayload {
  orderId: number;
}

function getAuthHeaders(): HeadersInit {
  const accessToken = sessionStorage.getItem('accessToken');

  if (!accessToken) {
    throw new Error('Debes iniciar sesión para realizar el pago.');
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

export function createPayment(
  payload: CreatePaymentPayload,
): Promise<Payment> {
  if (!Number.isInteger(payload.orderId) || payload.orderId < 1) {
    throw new Error('El ID de la orden no es válido.');
  }

  return apiRequest<Payment>('/payments', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

export function simulatePaymentApproval(
  paymentId: number,
): Promise<Payment> {
  if (!Number.isInteger(paymentId) || paymentId < 1) {
    throw new Error('El ID del pago no es válido.');
  }

  return apiRequest<Payment>(
    `/payments/${paymentId}/simulate-approval`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
    },
  );
}

export function getPayment(paymentId: number): Promise<Payment> {
  return apiRequest<Payment>(`/payments/${paymentId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
}
