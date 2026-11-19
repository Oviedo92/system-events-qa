
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import './catalog.css';

import EventGrid, {
  type EventCardData,
} from '../../components/events/eventGrid';
import { eventsService } from '../../services/events.service';
import type { EventCatalogItem } from '../../types/event';

export default function EventsPage() {
  const navigate = useNavigate();

  const [events, setEvents] = useState<EventCatalogItem[]>([]);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('ALL');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalEvents, setTotalEvents] = useState(0);
  const [retryKey, setRetryKey] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Consultar el catálogo al cambiar la página, la búsqueda o la ciudad.
  useEffect(() => {
    let active = true;

    const timer = window.setTimeout(() => {
      setLoading(true);
      setError('');

      eventsService
        .getEvents({
          page,
          limit: 12,
          search,
          city: city === 'ALL' ? undefined : city,
        })
        .then((response) => {
          if (!active) return;

          setEvents(response.data);
          setTotalEvents(response.meta.total);
          setTotalPages(response.meta.totalPages);
        })
        .catch((err: unknown) => {
          if (!active) return;

          setEvents([]);
          setTotalEvents(0);
          setTotalPages(0);

          setError(
            err instanceof Error
              ? err.message
              : 'No fue posible cargar los eventos.',
          );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [page, search, city, retryKey]);

  // Recibir actualizaciones de disponibilidad en tiempo real.
  useEffect(() => {
    const unsubscribe = eventsService.connectAvailability(
      (availability) => {
        setEvents((currentEvents) =>
          currentEvents.map((event) =>
            event.id === availability.eventId
              ? { ...event, availability }
              : event,
          ),
        );
      },
    );

    return unsubscribe;
  }, []);

  // Ciudades disponibles en los eventos cargados.
  const cities = useMemo(
    () =>
      [...new Set(events.map((event) => event.city))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'es')),
    [events],
  );

  const cards: EventCardData[] = events.map((event) => ({
    id: String(event.id),
    title: event.name,
    category: 'Evento',
    date: new Date(event.startAt).toLocaleString('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }),
    city: event.city,
    venue: event.venue,
    price: event.minPrice ?? 0,
    image: event.coverImageUrl || '/images/event-placeholder.svg', availability: event.availability,
  }));

  function openEvent(eventId: string) {
    const event = events.find(
      (item) => String(item.id) === eventId,
    );

    if (event) {
      navigate(`/events/${event.slug}`);
    }
  }

  function resetFilters() {
    setSearch('');
    setCity('ALL');
    setPage(1);
  }


  return (
    <section className="events-page">
      <header className="events-page-header">
        <p className="events-eyebrow">EVENTIA / CATÁLOGO</p>
        <h1>Encuentra tu próximo evento</h1>
        <p className="events-page-description">
          Música, deportes, teatro y experiencias para vivir en persona.
        </p>
      </header>

      <div className="events-page-filters">
        <label className="events-filter-field">
          <span>Buscar eventos</span>
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="¿Qué evento buscas?"
          />
        </label>

        <label className="events-filter-field">
          <span>Ciudad</span>
          <select
            value={city}
            onChange={(event) => {
              setCity(event.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">Todas las ciudades</option>
            {cities.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="events-filter-reset"
          onClick={resetFilters}
        >
          Limpiar filtros
        </button>
      </div>

      {loading ? (
        <div className="events-page-loading" role="status">
          <p>Cargando eventos...</p>
          <div className="events-loading-grid" aria-hidden="true">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="events-skeleton" key={index} />
            ))}
          </div>
        </div>
      ) : error ? (
        <div role="alert" className="events-page-error">
          <h2>No se pudo cargar el catálogo</h2>
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setRetryKey((current) => current + 1)}
          >
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <div className="events-results-bar">
            <h2>Eventos disponibles</h2>
            <span className="events-results-count">
              {totalEvents}{' '}
              {totalEvents === 1 ? 'evento encontrado' : 'eventos encontrados'}
            </span>
          </div>

          {events.length > 0 ? (
            <EventGrid events={cards} onSelectEvent={openEvent} />
          ) : (
            <div className="events-page-empty">
              <h2>No encontramos eventos</h2>
              <p>
                Prueba con otro nombre o selecciona otra ciudad.
              </p>
              <button type="button" onClick={resetFilters}>
                Limpiar filtros
              </button>
            </div>
          )}

          {totalPages > 1 && (
            <nav
              className="catalog-pagination"
              aria-label="Paginación de eventos"
            >
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Anterior
              </button>

              {Array.from(
                { length: totalPages },
                (_, index) => index + 1,
              ).map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  className={pageNumber === page ? 'active' : ''}
                  aria-current={pageNumber === page ? 'page' : undefined}
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              ))}

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Siguiente
              </button>
            </nav>
          )}

          <p className="catalog-pagination-info">
            {totalEvents > 0
              ? `Página ${page} de ${totalPages}`
              : 'No hay eventos disponibles'}
          </p>
        </>
      )}
    </section>
  );

}
