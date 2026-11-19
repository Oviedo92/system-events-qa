
import { apiRequest } from './api';

export interface CartItem {
  id: number;
  cartId: number;
  ticketTypeId: number | null;
  productVariantId: number | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  ticketType?: {
    id: number;
    name: string;
    price: number;
  } | null;
  productVariant?: {
    id: number;
    name?: string;
    price: number;
    product?: {
      id: number;
      name: string;
    };
  } | null;
}

export interface Cart {
  id: number;
  userId: number;
  eventId: number;
  status: string;
  promotionId: number | null;
  subtotal: number;
  discount: number;
  total: number;
  items: CartItem[];
  event?: {
    id: number;
    name: string;
    slug?: string;
  };
}

export interface CreateCartItemPayload {
  ticketTypeId?: number;
  productVariantId?: number;
  quantity: number;
}

export interface UpdateCartItemPayload {
  quantity: number;
}

export interface UpdateCartPayload {
  promotionId?: number;
}

function getAuthHeaders(): HeadersInit {
  const accessToken = sessionStorage.getItem('accessToken');

  if (!accessToken) {
    throw new Error('Debes iniciar sesión para gestionar el carrito.');
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

/** Consultar los carritos del usuario autenticado. */
export function getMyCarts(userId: number): Promise<Cart[]> {
  return apiRequest<Cart[]>(`/users/${userId}/cart`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
}

/** Crear un carrito para un evento. */
export function createCart(
  userId: number,
  eventId: number,
): Promise<Cart> {
  return apiRequest<Cart>(`/users/${userId}/cart`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ eventId }),
  });
}

/** Consultar un carrito por su ID. */
export function getCart(cartId: number): Promise<Cart> {
  return apiRequest<Cart>(`/carts/${cartId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
}

/** Aplicar o quitar una promoción del carrito. */
export function updateCart(
  cartId: number,
  payload: UpdateCartPayload,
): Promise<Cart> {
  return apiRequest<Cart>(`/carts/${cartId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

/** Eliminar un carrito. */
export function removeCart(cartId: number): Promise<void> {
  return apiRequest<void>(`/carts/${cartId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
}

/** Añadir entradas o productos al carrito. */
export function addCartItem(
  cartId: number,
  payload: CreateCartItemPayload,
): Promise<CartItem> {
  const hasTicketType = payload.ticketTypeId !== undefined;
  const hasProductVariant = payload.productVariantId !== undefined;

  if (hasTicketType === hasProductVariant) {
    throw new Error(
      'Debes indicar exactamente un tipo de entrada o una variante de producto.',
    );
  }

  if (!Number.isInteger(payload.quantity) || payload.quantity < 1) {
    throw new Error('La cantidad debe ser un entero mayor que cero.');
  }

  return apiRequest<CartItem>(`/carts/${cartId}/items`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

/** Modificar la cantidad de un artículo. */
export function updateCartItem(
  itemId: number,
  payload: UpdateCartItemPayload,
): Promise<CartItem> {
  if (!Number.isInteger(payload.quantity) || payload.quantity < 1) {
    throw new Error('La cantidad debe ser un entero mayor que cero.');
  }

  return apiRequest<CartItem>(`/cart-items/${itemId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

/** Eliminar un artículo del carrito. */
export function removeCartItem(itemId: number): Promise<CartItem> {
  return apiRequest<CartItem>(`/cart-items/${itemId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
}
