
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../../contexts/auth-context';
import { eventsService } from '../../services/events.service';
import {
  addCartItem,
  createCart,
  getMyCarts,
  updateCartItem,
} from '../../services/cart.service';
import type { EventCatalogItem } from '../../types/event';

import './tickets.css';

interface TicketType {
  id: number;
  name: string;
  description?: string | null;
  price: number | string;
  available: number;
  status?: string;
  startSaleAt?: string | null;
  endSaleAt?: string | null;
}

type EventWithTicketTypes = EventCatalogItem & {
  ticketTypes?: TicketType[];
};

export default function TicketsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

const [event, setEvent] = useState<EventWithTicketTypes | null>(null);
const [loadedSlug, setLoadedSlug] = useState('');
const [quantities, setQuantities] = useState<Record<number, number>>({});
const [submitting, setSubmitting] = useState(false);
const [error, setError] = useState('');
const [actionError, setActionError] = useState('');

  useEffect(() => {
  if (!slug) return;

  let active = true;

  eventsService
    .getEventBySlug(slug)
    .then((result) => {
      if (!active) return;

      setEvent(result as EventWithTicketTypes);
      setError('');
      setLoadedSlug(slug);
    })
    .catch((err: unknown) => {
      if (!active) return;

      setEvent(null);
      setError(
        err instanceof Error
          ? err.message
          : 'No fue posible cargar las entradas.',
      );
      setLoadedSlug(slug);
    });

  return () => {
    active = false;
  };
}, [slug]);

  const ticketTypes =
    event?.ticketTypes?.filter((ticket) => {
      if (ticket.status && ticket.status !== 'ACTIVE') return false;
      return ticket.available > 0;
    }) ?? [];

  function changeQuantity(
    ticketId: number,
    quantity: number,
    available: number,
  ) {
    setQuantities((current) => ({
      ...current,
      [ticketId]: Math.max(0, Math.min(quantity, available)),
    }));

    setActionError('');
  }

  const selectedCount = Object.values(quantities).reduce(
    (total, quantity) => total + quantity,
    0,
  );

  const selectedTotal = ticketTypes.reduce((total, ticket) => {
    return total + Number(ticket.price) * (quantities[ticket.id] ?? 0);
  }, 0);

  function formatCOP(value: number) {
    return value.toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    });
  }

  async function handleContinueToCart() {
    if (!event || submitting || selectedCount === 0) return;

    if (!isAuthenticated || !user) {
      navigate('/login', {
        state: { from: `/events/${event.slug}/tickets` },
      });
      return;
    }

    const selectedTickets = ticketTypes
      .filter((ticket) => (quantities[ticket.id] ?? 0) > 0)
      .map((ticket) => ({
        ticketTypeId: ticket.id,
        quantity: quantities[ticket.id],
      }));

    setSubmitting(true);
    setActionError('');

    try {
      // Consultar los carritos persistidos del usuario autenticado.
      const carts = await getMyCarts(user.id);

      // Reutilizar el carrito activo del evento si ya existe.
      let cart = carts.find(
        (item) =>
          Number(item.eventId) === Number(event.id) &&
          item.status === 'ACTIVE',
      );

      // Crear un carrito solamente cuando no exista uno activo.
      if (!cart) {
        cart = await createCart(user.id, event.id);
      }

      for (const selected of selectedTickets) {
        const existingItem = cart.items.find(
          (item) =>
            Number(item.ticketTypeId) === selected.ticketTypeId,
        );

        if (existingItem) {
          // Si el tipo ya está en el carrito, actualizar su cantidad.
          await updateCartItem(existingItem.id, {
            quantity: existingItem.quantity + selected.quantity,
          });
        } else {
          // Si no existe, crear la línea del carrito.
          await addCartItem(cart.id, {
            ticketTypeId: selected.ticketTypeId,
            quantity: selected.quantity,
          });
        }
      }

      // Solo navegar cuando todas las operaciones hayan terminado.
      navigate('/cart');
    } catch (err: unknown) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'No se pudieron guardar las entradas en el carrito.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!slug) {
  return (
    <main className="tickets-page">
      <div className="tickets-message" role="alert">
        <h1>Evento no especificado</h1>
        <p>No se indicó qué evento deseas consultar.</p>
        <button type="button" onClick={() => navigate('/events')}>
          Volver a eventos
        </button>
      </div>
    </main>
  );
}

if (loadedSlug !== slug) {
  return (
    <main className="tickets-page">
      <p role="status">Cargando entradas...</p>
    </main>
  );
}

  if (error || !event) {
    return (
      <main className="tickets-page">
        <div className="tickets-message" role="alert">
          <h1>No se pudieron cargar las entradas</h1>
          <p>{error || 'El evento no está disponible.'}</p>
          <button type="button" onClick={() => navigate('/events')}>
            Volver a eventos
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="tickets-page">
      <button
        type="button"
        className="tickets-back"
        onClick={() => navigate(`/events/${event.slug}`)}
      >
        ← Volver al evento
      </button>

      <header className="tickets-header">
        <p className="tickets-eyebrow">EVENTIA · ENTRADAS</p>
        <h1>{event.name}</h1>
        <p>
          {event.city} · {event.venue}
        </p>
        <p>
          {new Date(event.startAt).toLocaleString('es-CO', {
            dateStyle: 'long',
            timeStyle: 'short',
          })}
        </p>
      </header>

      <section className="tickets-content">
        <div className="tickets-list">
          <h2>Selecciona tus entradas</h2>

          {ticketTypes.length === 0 ? (
            <div className="tickets-empty">
              <h3>No hay entradas disponibles</h3>
              <p>
                Este evento no tiene tipos de entrada disponibles para la venta
                en este momento.
              </p>
            </div>
          ) : (
            ticketTypes.map((ticket) => {
              const quantity = quantities[ticket.id] ?? 0;

              return (
                <article className="ticket-option" key={ticket.id}>
                  <div className="ticket-option-info">
                    <h3>{ticket.name}</h3>

                    {ticket.description && <p>{ticket.description}</p>}

                    <p className="ticket-availability">
                      {ticket.available} disponibles
                    </p>

                    <strong>{formatCOP(Number(ticket.price))}</strong>
                  </div>

                  <div className="ticket-quantity">
                    <button
                      type="button"
                      aria-label={`Quitar una entrada ${ticket.name}`}
                      disabled={quantity === 0 || submitting}
                      onClick={() =>
                        changeQuantity(
                          ticket.id,
                          quantity - 1,
                          ticket.available,
                        )
                      }
                    >
                      −
                    </button>

                    <span aria-live="polite">{quantity}</span>

                    <button
                      type="button"
                      aria-label={`Agregar una entrada ${ticket.name}`}
                      disabled={
                        quantity >= ticket.available || submitting
                      }
                      onClick={() =>
                        changeQuantity(
                          ticket.id,
                          quantity + 1,
                          ticket.available,
                        )
                      }
                    >
                      +
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <aside className="tickets-summary">
          <h2>Resumen</h2>

          <p>
            Entradas seleccionadas: <strong>{selectedCount}</strong>
          </p>

          <div className="tickets-total">
            <span>Subtotal estimado</span>
            <strong>{formatCOP(selectedTotal)}</strong>
          </div>

          {actionError && (
            <p className="tickets-action-error" role="alert">
              {actionError}
            </p>
          )}

          <button
            type="button"
            className="tickets-continue"
            disabled={selectedCount === 0 || submitting}
            onClick={handleContinueToCart}
          >
            {submitting
              ? 'Guardando entradas...'
              : 'Continuar al carrito'}
          </button>

          <p className="tickets-disclaimer">
            La selección no reserva las entradas. El backend valida la
            disponibilidad al guardar cada artículo.
          </p>
        </aside>
      </section>
    </main>
  );
}
