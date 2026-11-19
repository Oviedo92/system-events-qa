
import { CalendarDays, MapPin } from 'lucide-react';
import type { EventAvailability } from '../../types/event';

export interface EventCardProps {
  id: string;
  title: string;
  category: string;
  date: string;
  city: string;
  venue: string;
  price: number;
  image: string;
  availability: EventAvailability;
  onSelect?: (eventId: string) => void;
}

const FALLBACK_IMAGE = '/images/event-placeholder.svg';

function formatPrice(price: number): string {
  if (price <= 0) return 'Consultar precio';

  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(price);
}

export default function EventCard({
  id,
  title,
  category,
  date,
  city,
  venue,
  price,
  image,
  availability,
  onSelect,
}: EventCardProps) {
  const canBuy =
    availability.salesStatus === 'ON_SALE' &&
    availability.availableTickets > 0;

  return (
    <article className="event-card">
      <div className="event-card-image-wrap">
        <img
          className="event-card-image"
          src={image || FALLBACK_IMAGE}
          alt={`Portada de ${title}`}
          loading="lazy"
          onError={(event) => {
            const img = event.currentTarget;

            if (img.dataset.fallback !== 'true') {
              img.dataset.fallback = 'true';
              img.src = FALLBACK_IMAGE;
            }
          }}
        />

        <span className="event-card-category">{category}</span>
      </div>

      <div className="event-card-content">
        <h2 className="event-card-title">{title}</h2>

        <div className="event-card-details">
          <div className="event-card-detail">
            <CalendarDays size={17} aria-hidden="true" />
            <span>{date}</span>
          </div>

          <div className="event-card-detail">
            <MapPin size={17} aria-hidden="true" />
            <span>
              {venue ? `${venue}, ` : ''}
              {city}
            </span>
          </div>
        </div>

        <div className="event-card-footer">
          <div>
            <span className="event-card-price-label">
              Desde
            </span>
            <span className="event-card-price">
              {formatPrice(price)}
            </span>
          </div>

          <button
            type="button"
            className="event-card-button"
            disabled={!canBuy}
            onClick={() => onSelect?.(id)}
          >
            {canBuy ? 'Ver entradas' : 'No disponible'}
          </button>
        </div>
      </div>
    </article>
  );
}
