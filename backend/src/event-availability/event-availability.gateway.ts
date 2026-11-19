import {
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

import { EventAvailability } from './event-availability.service';

@WebSocketGateway({
  cors: {
    origin: true,
  },
})
export class EventAvailabilityGateway {
  @WebSocketServer()
  server!: Server;

  emitAvailability(availability: EventAvailability): void {
    this.server.emit('events:availability', availability);
  }
}