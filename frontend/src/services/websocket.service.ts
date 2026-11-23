import { io, type Socket } from 'socket.io-client';

const WS_URL =
  import.meta.env.VITE_WS_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:3000';

class WebsocketService {
  private socket: Socket | null = null;

  connect(): Socket {
    if (!this.socket) {
      const token = sessionStorage.getItem('accessToken');
      this.socket = io(WS_URL, {
        transports: ['websocket'],
        auth: token ? { token } : undefined,
        reconnection: true,
        reconnectionAttempts: 5,
      });
    }
    return this.socket;
  }

  joinEventRoom(eventId: number): void {
    const socket = this.connect();
    socket.emit('event:join', { eventId });
  }

  leaveEventRoom(eventId: number): void {
    if (this.socket) {
      this.socket.emit('event:leave', { eventId });
    }
  }

  onSeatUpdated(
    callback: (payload: {
      eventId: number;
      seatId: number;
      row: string;
      number: number;
      status: 'AVAILABLE' | 'RESERVED' | 'SOLD';
    }) => void,
  ): () => void {
    const socket = this.connect();
    socket.on('seat:updated', callback);
    return () => {
      socket.off('seat:updated', callback);
    };
  }

  onEventStatusChanged(
    callback: (payload: {
      eventId: number;
      status: string;
      rejectionReason?: string | null;
    }) => void,
  ): () => void {
    const socket = this.connect();
    socket.on('event:status-changed', callback);
    return () => {
      socket.off('event:status-changed', callback);
    };
  }

  onSaleCompleted(
    callback: (payload: {
      eventId: number;
      buyerName: string;
      buyerEmail: string;
      total: number;
      ticketsCount: number;
      productsCount: number;
      createdAt: string;
    }) => void,
  ): () => void {
    const socket = this.connect();
    socket.on('sale:completed', callback);
    return () => {
      socket.off('sale:completed', callback);
    };
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const websocketService = new WebsocketService();