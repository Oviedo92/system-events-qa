const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token =
    sessionStorage.getItem('accessToken') ||
    localStorage.getItem('accessToken');

  const incomingHeaders = (options.headers as Record<string, string>) ?? {};

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && !incomingHeaders.Authorization
        ? { Authorization: `Bearer ${token}` }
        : {}),
      ...incomingHeaders,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data?.message ??
      `Error en la solicitud: ${response.status}`;

    throw new Error(
      Array.isArray(message) ? message.join(', ') : message,
    );
  }

  return data as T;
}