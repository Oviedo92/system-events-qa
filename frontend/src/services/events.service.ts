
import { io } from 'socket.io-client';
import type { EventAvailability, EventCatalogItem } from '../types/event';

const API_URL = (
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
).replace(/\/$/, '');

const SOCKET_URL = (
  import.meta.env.VITE_SOCKET_URL ?? API_URL
).replace(/\/$/, '');

const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket'],
});

export interface EventCatalogResponse {
  data: EventCatalogItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface EventCatalogFilters {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);

  if (!response.ok) {
    throw new Error(`Error consultando eventos: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const eventsService = {
  getEvents(
    filters: EventCatalogFilters = {},
  ): Promise<EventCatalogResponse> {
    const params = new URLSearchParams({
      page: String(filters.page ?? 1),
      limit: String(filters.limit ?? 12),
    });

    if (filters.search?.trim()) {
      params.set('search', filters.search.trim());
    }

    if (filters.city && filters.city !== 'Todas las ciudades') {
      params.set('city', filters.city);
    }

    return request<EventCatalogResponse>(`/events?${params.toString()}`);
  },

  getEventBySlug(slug: string): Promise<EventCatalogItem> {
    return request<EventCatalogItem>(
      `/events/slug/${encodeURIComponent(slug)}`,
    );
  },

  connectAvailability(
    onUpdate: (availability: EventAvailability) => void,
    eventId?: number,
  ): () => void {
    const listener = (availability: EventAvailability) => {
      if (
        eventId === undefined ||
        availability.eventId === eventId
      ) {
        onUpdate(availability);
      }
    };

    socket.on('events:availability', listener);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off('events:availability', listener);

      if (socket.listeners('events:availability').length === 0) {
        socket.disconnect();
      }
    };
  },
};
