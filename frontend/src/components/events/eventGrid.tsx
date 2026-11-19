
import EventCard from './eventCard';
import type { EventAvailability } from '../../types/event';

export interface EventCardData {
  id: string;
  title: string;
  category: string;
  date: string;
  city: string;
  venue: string;
  price: number;
  image: string;
  availability: EventAvailability;
}

interface EventGridProps {
  events: EventCardData[];
  onSelectEvent?: (eventId: string) => void;
}

export default function EventGrid({
  events,
  onSelectEvent,
}: EventGridProps) {
  if (events.length === 0) {
    return (
      <div className="events-page-empty">
        <h2>No encontramos eventos</h2>
        <p>Prueba con otro nombre o selecciona otra ciudad.</p>
      </div>
    );
  }

  return (
    <div className="event-grid">
      {events.map((event) => (
        <EventCard
          key={event.id}
          {...event}
          onSelect={onSelectEvent}
        />
      ))}
    </div>
  );
}
