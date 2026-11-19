
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { eventsService } from '../../services/events.service';
import type {
  EventCatalogItem,
  EventAvailability,
} from '../../types/event';

import './eventDetail.css';

export default function EventDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  const [event, setEvent] = useState<EventCatalogItem | null>(null);
  const [loadedSlug, setLoadedSlug] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
  if (!slug) return;

  let active = true;

  eventsService
    .getEventBySlug(slug)
    .then((data) => {
      if (!active) return;

      setEvent(data);
      setError('');
      setLoadedSlug(slug);
    })
    .catch(() => {
      if (!active) return;

      setEvent(null);
      setError('No fue posible encontrar este evento.');
      setLoadedSlug(slug);
    });

  return () => {
    active = false;
  };
}, [slug]);

  const eventId = event?.id;

  useEffect(() => {
    if (eventId === undefined) return;

    return eventsService.connectAvailability(
      (availability: EventAvailability) => {
        setEvent((current) =>
          current && Number(current.id) === availability.eventId
            ? { ...current, availability }
            : current,
        );
      },
      eventId,
    );
  }, [eventId]);

  if (!slug) {
    return (
      <main className="event-detail">
        <p role="alert">No se especificó el evento.</p>
        <Link to="/events">Volver al catálogo</Link>
      </main>
    );
  }

  if (loadedSlug !== slug) {
    return (
      <main className="event-detail event-detail-state">
        <p role="status">Cargando información del evento...</p>
      </main>
    );
  }

  if (error || !event) {
    return (
      <main className="event-detail event-detail-state">
        <p role="alert">{error || 'Evento no disponible.'}</p>
        <Link to="/events">Volver al catálogo</Link>
      </main>
    );
  }

  const availability = event.availability;
  const occupancy = Math.max(
    0,
    Math.min(100, Number(availability.occupancyPercentage) || 0),
  );

  const canBuy =
    availability.salesStatus === 'ON_SALE' &&
    availability.availableTickets > 0;

  const dateText = new Date(event.startAt).toLocaleString('es-CO', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const formatNumber = (value: number) =>
    Number(value).toLocaleString('es-CO');

  return (
    <main className="event-detail">
      <Link className="event-detail-back" to="/events">
        ← Volver a eventos
      </Link>

      <section className="event-detail-hero">
        {event.coverImageUrl ? (
          <img
            className="event-detail-cover"
            src={event.coverImageUrl}
            alt={`Imagen de ${event.name}`}
          />
        ) : (
          <div className="event-detail-cover event-detail-cover-placeholder">
            EVENTIA
          </div>
        )}

        <div className="event-detail-hero-content">
          <p className="event-detail-eyebrow">
            {event.city} · {event.venue}
          </p>

          <h1>{event.name}</h1>

          <p className="event-detail-date">{dateText}</p>

          {event.address && (
            <p className="event-detail-address">{event.address}</p>
          )}

          {event.description && (
            <p className="event-detail-description">
              {event.description}
            </p>
          )}

          <button
            type="button"
            className="event-detail-buy"
            disabled={!canBuy}
            onClick={() => {
              window.location.assign(`/events/${event.slug}/tickets`);
            }}
          >
            {canBuy ? 'Seleccionar entradas' : 'Entradas no disponibles'}
          </button>
        </div>
      </section>

      <section className="event-detail-availability">
        <div className="event-detail-section-heading">
          <p className="event-detail-eyebrow">DISPONIBILIDAD EN TIEMPO REAL</p>
          <h2>Estado de las entradas</h2>
        </div>

        <div className="event-detail-availability-grid">
          <article className="event-detail-occupancy-card">
            <div
              className="event-occupancy-ring"
              role="progressbar"
              aria-label="Porcentaje de ocupación del evento"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={occupancy}
              style={{
                background: `conic-gradient(#7257e8 ${occupancy}%, #e8e7ef ${occupancy}% 100%)`,
              }}
            >
              <div className="event-occupancy-ring-center">
                <strong>{occupancy.toFixed(0)}%</strong>
                <span>ocupado</span>
              </div>
            </div>

            <h3>Ocupación del evento</h3>
            <p>
              Porcentaje reportado por el servicio de disponibilidad de EVENTIA.
            </p>
          </article>

          <div className="event-detail-stats">
            <article className="event-detail-stat">
              <span className="event-detail-stat-label">Capacidad total</span>
              <strong>{formatNumber(availability.capacity)}</strong>
              <span className="event-detail-stat-caption">
                Aforo configurado
              </span>
            </article>

            <article className="event-detail-stat">
              <span className="event-detail-stat-label">Entradas vendidas</span>
              <strong>{formatNumber(availability.soldTickets)}</strong>
              <span className="event-detail-stat-caption">
                Ventas registradas
              </span>
            </article>

            <article className="event-detail-stat">
              <span className="event-detail-stat-label">Entradas reservadas</span>
              <strong>{formatNumber(availability.reservedTickets)}</strong>
              <span className="event-detail-stat-caption">
                Reservas reportadas por el backend
              </span>
            </article>

            <article className="event-detail-stat event-detail-stat-available">
              <span className="event-detail-stat-label">
                Entradas disponibles
              </span>
              <strong>{formatNumber(availability.availableTickets)}</strong>
              <span className="event-detail-stat-caption">
                Disponibilidad reportada por el backend
              </span>
            </article>
          </div>
        </div>

        <section className="event-detail-zones">
          <h3>Disponibilidad por zona</h3>

          {availability.zones.length === 0 ? (
            <p>No hay información de disponibilidad por zona.</p>
          ) : (
            <div className="event-detail-zone-list">
              {availability.zones.map((zone) => (
                <article className="event-detail-zone" key={zone.zoneId}>
                  <div>
                    <h4>{zone.name}</h4>
                    <p>
                      {formatNumber(zone.availableTickets)} de{' '}
                      {formatNumber(zone.capacity)} disponibles
                    </p>
                  </div>

                  <span
                    className={`event-detail-zone-status event-detail-zone-status-${zone.status.toLowerCase()}`}
                  >
                    {zone.status === 'SOLD_OUT'
                      ? 'Agotada'
                      : zone.status === 'LOW_AVAILABILITY'
                        ? 'Pocas entradas'
                        : 'Disponible'}
                  </span>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
