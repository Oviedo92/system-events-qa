import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Armchair,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  Layers,
  LogOut,
  MapPin,
  Plus,
  QrCode,
  Radio,
  Send,
  ShoppingBag,
  Tag,
  Ticket,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/auth-context';
import {
  createPromoterEvent,
  getEventBuyers,
  getEventCategories,
  getEventTemplates,
  getMyPromoterEvents,
  safeUpdatePromoterEvent,
  submitEventForReview,
  type EventBuyerSummary,
  type EventCategoryOption,
  type EventTemplateOption,
  type PromoterEventItem,
} from '../../services/promoter.service';
import { websocketService } from '../../services/websocket.service';
import LocationMapPicker from '../../components/maps/LocationMapPicker';

const MAX_ACTIVE_EVENTS = 2;

const FALLBACK_CATEGORIES: EventCategoryOption[] = [
  { id: 1, name: 'Música', slug: 'musica' },
  { id: 2, name: 'Festivales', slug: 'festivales' },
  { id: 3, name: 'Deportes', slug: 'deportes' },
  { id: 4, name: 'Teatro', slug: 'teatro' },
  { id: 5, name: 'Conferencias', slug: 'conferencias' },
  { id: 6, name: 'Comedia', slug: 'comedia' },
];

const FALLBACK_TEMPLATES: EventTemplateOption[] = [
  {
    id: 1,
    name: 'Estadio / Concierto Gran Formato',
    description: 'Zonas diferenciadas, mapa de sillas en tiempo real, merchandising, cupones y acceso QR.',
    usesZones: true,
    usesSeats: true,
    usesProducts: true,
    usesPromotions: true,
    usesQr: true,
  },
  {
    id: 2,
    name: 'Festival / Admisión General',
    description: 'Localidades por etapas sin silla numerada, tienda de productos oficiales, promociones y QR.',
    usesZones: true,
    usesSeats: false,
    usesProducts: true,
    usesPromotions: true,
    usesQr: true,
  },
  {
    id: 3,
    name: 'Teatro / Comedia Numerado',
    description: 'Selección de silletería por fila y número con validación QR en puerta.',
    usesZones: false,
    usesSeats: true,
    usesProducts: false,
    usesPromotions: false,
    usesQr: true,
  },
  {
    id: 4,
    name: 'Conferencia / Acceso Express QR',
    description: 'Entrada general rápida con código QR único por asistente.',
    usesZones: false,
    usesSeats: false,
    usesProducts: false,
    usesPromotions: true,
    usesQr: true,
  },
];

const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  Valledupar: { lat: 10.46314, lng: -73.25322 },
  Bogotá: { lat: 4.64862, lng: -74.07764 },
  Medellín: { lat: 6.2442, lng: -75.5812 },
  Barranquilla: { lat: 10.96854, lng: -74.78132 },
  Cali: { lat: 3.45164, lng: -76.53198 },
  Cartagena: { lat: 10.39104, lng: -75.47942 },
};

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function PromoterDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState<PromoterEventItem[]>([]);
  const [categories, setCategories] = useState<EventCategoryOption[]>(FALLBACK_CATEGORIES);
  const [templates, setTemplates] = useState<EventTemplateOption[]>(FALLBACK_TEMPLATES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Modal de creación
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Campos base del evento
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number>(1);
  const [templateId, setTemplateId] = useState<number>(1);
  const [city, setCity] = useState('Bogotá');
  const [venue, setVenue] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number>(10.46314);
  const [longitude, setLongitude] = useState<number>(-73.25322);
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [capacity, setCapacity] = useState<number>(200);
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');

  // Campos dinámicos impulsados por la plantilla (Server-Driven)
  const [zones, setZones] = useState([{ name: 'VIP', capacity: 80, price: 180000 }]);
  const [seatRows, setSeatRows] = useState<number>(8);
  const [seatsPerRow, setSeatsPerRow] = useState<number>(10);
  const [products, setProducts] = useState([{ name: 'Camiseta Oficial Tour', price: 75000, stock: 50 }]);
  const [promoName, setPromoName] = useState('Preventa Madrugadores');
  const [promoCode, setPromoCode] = useState('EARLY20');
  const [promoDiscount, setPromoDiscount] = useState<number>(20);
  const [generalTicketPrice, setGeneralTicketPrice] = useState<number>(90000);

  // Modal de edición segura (para eventos con compras activas)
  const [editingEvent, setEditingEvent] = useState<PromoterEventItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCoverUrl, setEditCoverUrl] = useState('');
  const [editAddress, setEditAddress] = useState('');

  // Drawer de compradores y analítica en vivo
  const [selectedEventForBuyers, setSelectedEventForBuyers] = useState<PromoterEventItem | null>(null);
  const [buyers, setBuyers] = useState<EventBuyerSummary[]>([]);
  const [loadingBuyers, setLoadingBuyers] = useState(false);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === Number(templateId)) ?? templates[0],
    [templates, templateId],
  );

  const activeEventsCount = useMemo(
    () =>
      events.filter((e) =>
        ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED'].includes(e.status),
      ).length,
    [events],
  );

  const canCreateMoreEvents = activeEventsCount < MAX_ACTIVE_EVENTS;

  const totals = useMemo(() => {
    return events.reduce(
      (acc, ev) => {
        const m = ev.metrics;
        if (!m) return acc;
        acc.ticketsSold += m.ticketsSold;
        acc.productsSold += m.productsSold;
        acc.totalRevenue += m.totalRevenue;
        return acc;
      },
      { ticketsSold: 0, productsSold: 0, totalRevenue: 0 },
    );
  }, [events]);


 useEffect(() => {
    let cancelled = false;

    async function fetchInitialData() {
      try {
        const myEventsData = await getMyPromoterEvents();
        if (!cancelled) {
          setEvents(myEventsData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudieron cargar tus eventos guardados',
          );
        }
      }

      try {
        const [catData, tplData] = await Promise.all([
          getEventCategories().catch(() => FALLBACK_CATEGORIES),
          getEventTemplates().catch(() => FALLBACK_TEMPLATES),
        ]);
        if (!cancelled) {
          if (catData.length > 0) {
            setCategories(catData);
            setCategoryId(catData[0].id);
          }
          if (tplData.length > 0) {
            setTemplates(tplData);
            setTemplateId(tplData[0].id);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchInitialData();

    return () => {
      cancelled = true;
    };
  }, []);

  // Suscripción WebSocket en tiempo real para estado de moderación, ventas y sillas
  useEffect(() => {
    const socket = websocketService.connect();
    const handleConnect = () => setWsConnected(true);
    const handleDisconnect = () => setWsConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    events.forEach((ev) => websocketService.joinEventRoom(ev.id));

    const offStatus = websocketService.onEventStatusChanged(
      ({ eventId, status, rejectionReason }) => {
        setEvents((prev) =>
          prev.map((ev) =>
            ev.id === eventId
              ? { ...ev, status, rejectionReason: rejectionReason ?? null }
              : ev,
          ),
        );
        setFeedback(`Actualización en tiempo real: el evento #${eventId} cambió a estado ${status}.`);
      },
    );

    const offSale = websocketService.onSaleCompleted((sale) => {
      setEvents((prev) =>
        prev.map((ev) => {
          if (ev.id !== sale.eventId) return ev;
          const prevMetrics = ev.metrics ?? {
            ticketsSold: 0,
            ticketsRevenue: 0,
            productsSold: 0,
            productsRevenue: 0,
            totalRevenue: 0,
            occupiedSeats: 0,
            totalSeats: ev.capacity,
          };
          return {
            ...ev,
            metrics: {
              ...prevMetrics,
              ticketsSold: prevMetrics.ticketsSold + sale.ticketsCount,
              productsSold: prevMetrics.productsSold + sale.productsCount,
              totalRevenue: prevMetrics.totalRevenue + sale.total,
            },
          };
        }),
      );
      if (selectedEventForBuyers?.id === sale.eventId) {
        setBuyers((prev) => [
          {
            orderId: Date.now(),
            buyerName: sale.buyerName,
            buyerEmail: sale.buyerEmail,
            ticketsCount: sale.ticketsCount,
            productsCount: sale.productsCount,
            totalPaid: sale.total,
            purchasedAt: sale.createdAt,
          },
          ...prev,
        ]);
      }
    });

    const offSeat = websocketService.onSeatUpdated(({ eventId, status }) => {
      if (status !== 'SOLD') return;
      setEvents((prev) =>
        prev.map((ev) => {
          if (ev.id !== eventId || !ev.metrics) return ev;
          return {
            ...ev,
            metrics: {
              ...ev.metrics,
              occupiedSeats: ev.metrics.occupiedSeats + 1,
            },
          };
        }),
      );
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      offStatus();
      offSale();
      offSeat();
    };
  }, [events, selectedEventForBuyers?.id]);

  async function handleLogout() {
    websocketService.disconnect();
    await signOut();
    navigate('/login', { replace: true });
  }

  async function handleCreateEvent(e: FormEvent) {
    e.preventDefault();
    if (!canCreateMoreEvents) {
      setError('Has alcanzado el límite máximo de 2 eventos activos permitidos para promotores.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setFeedback(null);

    try {
      const created = await createPromoterEvent({
        name: name.trim(),
        description: description.trim() || undefined,
        categoryId: Number(categoryId),
        templateId: Number(templateId),
        city: city.trim(),
        venue: venue.trim(),
        address: address.trim() || undefined,
        latitude,
        longitude,
        coverImageUrl: coverImageUrl.trim() || undefined,
        capacity: Number(capacity),
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        zones: selectedTemplate?.usesZones ? zones : undefined,
        seatGrid: selectedTemplate?.usesSeats
          ? { rows: Number(seatRows), seatsPerRow: Number(seatsPerRow) }
          : undefined,
        products: selectedTemplate?.usesProducts ? products : undefined,
        promotions:
          selectedTemplate?.usesPromotions && promoCode.trim()
            ? [{ name: promoName.trim(), code: promoCode.trim().toUpperCase(), discountPercent: Number(promoDiscount) }]
            : undefined,
        generalTickets: !selectedTemplate?.usesZones
          ? [{ name: 'Entrada General', price: Number(generalTicketPrice), quantity: Number(capacity) }]
          : undefined,
      });

      setEvents((prev) => [created, ...prev]);
      setShowCreateModal(false);
      setName('');
      setDescription('');
      setVenue('');
      setAddress('');
      setCoverImageUrl('');
      setFeedback(
        'Evento creado como borrador. Envíalo a revisión para que un moderador valide su publicación.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el evento');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendToModeration(eventId: number) {
    setError(null);
    try {
      const updated = await submitEventForReview(eventId);
      setEvents((prev) => prev.map((ev) => (ev.id === eventId ? { ...ev, ...updated } : ev)));
      setFeedback('Evento enviado a la cola de moderación. Un moderador lo revisará en exclusiva (1:1).');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar a moderación');
    }
  }

  function openSafeEdit(ev: PromoterEventItem) {
    setEditingEvent(ev);
    setEditName(ev.name);
    setEditDescription(ev.description ?? '');
    setEditCoverUrl(ev.coverImageUrl ?? '');
    setEditAddress(ev.address ?? '');
  }

  async function handleSafeUpdateSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editingEvent) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await safeUpdatePromoterEvent(editingEvent.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        coverImageUrl: editCoverUrl.trim() || undefined,
        address: editAddress.trim() || undefined,
      });
      setEvents((prev) =>
        prev.map((ev) => (ev.id === editingEvent.id ? { ...ev, ...updated } : ev)),
      );
      setEditingEvent(null);
      setFeedback('Información pública actualizada sin afectar localidades, sillas ni compras previas.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el evento');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOpenBuyers(ev: PromoterEventItem) {
    setSelectedEventForBuyers(ev);
    setLoadingBuyers(true);
    try {
      const list = await getEventBuyers(ev.id);
      setBuyers(list);
    } catch {
      setBuyers([]);
    } finally {
      setLoadingBuyers(false);
    }
  }

  function renderStatusBadge(status: string) {
    switch (status) {
      case 'PUBLISHED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5" /> Publicado y Activo
          </span>
        );
      case 'PENDING_REVIEW':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            <Clock className="h-3.5 w-3.5" /> En Revisión (Moderador 1:1)
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800">
            <XCircle className="h-3.5 w-3.5" /> Rechazado por Moderación
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
            <Edit3 className="h-3.5 w-3.5" /> Borrador
          </span>
        );
    }
  }

  return (
    <section
      data-testid="promoter-dashboard"
      className="min-h-screen bg-[#f7f7fb] px-4 py-8 sm:px-6 lg:px-10"
    >
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Cabecera Ejecutiva */}
        <header className="flex flex-col justify-between gap-4 rounded-3xl bg-[#15172b] p-6 text-white shadow-lg sm:flex-row sm:items-center sm:p-8">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-[#7765f8]/25 px-3 py-1 text-xs font-semibold tracking-wide text-[#c5bdff] uppercase">
                Panel Oficial de Promotor
              </span>
              <span
                data-testid="ws-status-indicator"
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                  wsConnected
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                <Radio className="h-3.5 w-3.5" />
                {wsConnected ? 'Tiempo real conectado' : 'Sincronizando socket'}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Hola, {user?.name ?? 'Promotor'}
            </h1>
            <p className="text-sm text-slate-300">
              Gestiona tus eventos con plantillas configurables, validación por moderación 1:1 y métricas de ventas en vivo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div
              data-testid="promoter-quota-badge"
              className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-right"
            >
              <p className="text-xs text-slate-300">Cupo de eventos activos</p>
              <p className="text-lg font-bold text-white">
                {activeEventsCount} / {MAX_ACTIVE_EVENTS}
              </p>
            </div>

            <button
              type="button"
              data-testid="btn-open-create-event"
              disabled={!canCreateMoreEvents}
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#ff684a] px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#ff5432] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {canCreateMoreEvents ? 'Crear Nuevo Evento' : 'Límite de 2 Eventos Alcanzado'}
            </button>

            <button
              type="button"
              data-testid="btn-promoter-logout"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15"
            >
              <LogOut className="h-4 w-4" />
              Salir
            </button>
          </div>
        </header>

        {/* Alertas de Feedback / Error */}
        {error && (
          <div
            data-testid="promoter-error-alert"
            className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {feedback && (
          <div
            data-testid="promoter-feedback-alert"
            className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              <span>{feedback}</span>
            </div>
            <button type="button" onClick={() => setFeedback(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Tarjetas de KPIs Globales */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-[#e8e8f0] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-sm font-medium">Eventos Activos</span>
              <Calendar className="h-5 w-5 text-[#7765f8]" />
            </div>
            <p className="mt-3 text-3xl font-bold text-[#15172b]">
              {activeEventsCount} <span className="text-base font-normal text-slate-400">/ 2 máx.</span>
            </p>
          </div>

          <div className="rounded-3xl border border-[#e8e8f0] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-sm font-medium">Entradas Vendidas</span>
              <Ticket className="h-5 w-5 text-[#ff684a]" />
            </div>
            <p className="mt-3 text-3xl font-bold text-[#15172b]">{totals.ticketsSold}</p>
          </div>

          <div className="rounded-3xl border border-[#e8e8f0] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-sm font-medium">Productos / Merch</span>
              <ShoppingBag className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-[#15172b]">{totals.productsSold}</p>
          </div>

          <div className="rounded-3xl border border-[#e8e8f0] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-sm font-medium">Recaudación Total</span>
              <BarChart3 className="h-5 w-5 text-[#7765f8]" />
            </div>
            <p className="mt-3 text-2xl font-bold text-[#15172b]">
              {formatCOP(totals.totalRevenue)}
            </p>
          </div>
        </div>

        {/* Listado de Eventos del Promotor */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#15172b]">Mis Publicaciones de Eventos</h2>
            <span className="text-xs text-slate-500">
              Máximo 2 publicaciones simultáneas por promotor verificado
            </span>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-[#e8e8f0] bg-white p-12 text-center text-slate-500">
              Cargando tus eventos y configuraciones...
            </div>
          ) : events.length === 0 ? (
            <div
              data-testid="promoter-empty-state"
              className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center"
            >
              <Calendar className="mx-auto h-10 w-10 text-slate-400" />
              <h3 className="mt-3 text-lg font-semibold text-[#15172b]">
                Aún no tienes eventos creados
              </h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                Selecciona una plantilla según tu formato (estadio con sillas, festival con zonas, teatro o conferencia) y envíalo a moderación.
              </p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#7765f8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6552f5]"
              >
                <Plus className="h-4 w-4" /> Crear mi primer evento
              </button>
            </div>
          ) : (
            <div
              data-testid="promoter-events-list"
              className="grid grid-cols-1 gap-6 lg:grid-cols-2"
            >
              {events.map((ev) => {
                const cfg = ev.configuration ?? ev.template;
                const metrics = ev.metrics ?? {
                  ticketsSold: 0,
                  ticketsRevenue: 0,
                  productsSold: 0,
                  productsRevenue: 0,
                  totalRevenue: 0,
                  occupiedSeats: 0,
                  totalSeats: ev.capacity,
                };

                return (
                  <article
                    key={ev.id}
                    data-testid={`promoter-event-card-${ev.id}`}
                    className="flex flex-col justify-between rounded-3xl border border-[#e8e8f0] bg-white p-6 shadow-sm transition hover:shadow-md"
                  >
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-semibold tracking-wider text-[#7765f8] uppercase">
                            {ev.category?.name ?? 'Evento'} · {ev.template?.name}
                          </span>
                          <h3 className="mt-1 text-xl font-bold text-[#15172b]">
                            {ev.name}
                          </h3>
                        </div>
                        {renderStatusBadge(ev.status)}
                      </div>

                      <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-[#ff684a]" />
                          {ev.city} — {ev.venue}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-[#7765f8]" />
                          {new Date(ev.startAt).toLocaleDateString('es-CO', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Módulos activos por Server-Driven Template */}
                      <div className="flex flex-wrap gap-2">
                        {cfg?.usesZones && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                            <Layers className="h-3 w-3" /> Zonas
                          </span>
                        )}
                        {cfg?.usesSeats && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
                            <Armchair className="h-3 w-3" /> Sillas Live ({metrics.occupiedSeats}/{metrics.totalSeats})
                          </span>
                        )}
                        {cfg?.usesProducts && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            <ShoppingBag className="h-3 w-3" /> Productos ({metrics.productsSold})
                          </span>
                        )}
                        {cfg?.usesPromotions && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                            <Tag className="h-3 w-3" /> Promociones
                          </span>
                        )}
                        {cfg?.usesQr && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                            <QrCode className="h-3 w-3" /> Ticket QR
                          </span>
                        )}
                      </div>

                      {ev.status === 'REJECTED' && ev.rejectionReason && (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                          <strong>Motivo del moderador:</strong> {ev.rejectionReason}
                        </div>
                      )}

                      {/* Resumen comercial del evento */}
                      <div className="grid grid-cols-3 gap-3 rounded-2xl bg-[#f7f7fb] p-3.5 text-center">
                        <div>
                          <p className="text-[11px] text-slate-500">Entradas</p>
                          <p className="text-sm font-bold text-[#15172b]">
                            {metrics.ticketsSold} / {ev.capacity}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-500">Productos</p>
                          <p className="text-sm font-bold text-[#15172b]">{metrics.productsSold}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-500">Ingresos</p>
                          <p className="text-sm font-bold text-emerald-700">
                            {formatCOP(metrics.totalRevenue)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Acciones según estado */}
                    <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
                      {(ev.status === 'DRAFT' || ev.status === 'REJECTED') && (
                        <button
                          type="button"
                          data-testid={`btn-submit-review-${ev.id}`}
                          onClick={() => handleSendToModeration(ev.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#7765f8] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#6450f2]"
                        >
                          <Send className="h-3.5 w-3.5" /> Enviar a Moderación
                        </button>
                      )}

                      <button
                        type="button"
                        data-testid={`btn-safe-edit-${ev.id}`}
                        onClick={() => openSafeEdit(ev)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Edit3 className="h-3.5 w-3.5" /> Edición Segura
                      </button>

                      <button
                        type="button"
                        data-testid={`btn-view-buyers-${ev.id}`}
                        onClick={() => handleOpenBuyers(ev)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#15172b] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                      >
                        <Users className="h-3.5 w-3.5" /> Compradores
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: CREAR EVENTO CON PLANTILLA SERVER-DRIVEN */}
      {showCreateModal && (
        <div
          data-testid="create-event-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xs"
        >
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            {/* Cabecera fija del modal */}
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-100 bg-white/95 px-6 py-4 backdrop-blur-xs sm:px-8">
              <div>
                <span className="text-[11px] font-bold tracking-wider text-[#ff684a] uppercase">
                  Estudio de Creación · Cupo {activeEventsCount + 1} de {MAX_ACTIVE_EVENTS}
                </span>
                <h2 className="text-lg font-bold text-[#15172b] sm:text-xl">
                  Configurar Nuevo Evento
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateEvent}
              className="grid grid-cols-1 gap-8 p-6 sm:p-8 lg:grid-cols-12"
            >
              {/* COLUMNA IZQUIERDA (7 cols): Formulario Estructurado en Pasos */}
              <div className="space-y-6 lg:col-span-7">
                {/* Bloque 1: Estructura y Plantilla */}
                <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5">
                  <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                    1. Estructura y Categoría
                  </h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Categoría del Evento *
                      </label>
                      <select
                        data-testid="select-event-category"
                        value={categoryId}
                        onChange={(e) => setCategoryId(Number(e.target.value))}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-[#7765f8] focus:outline-none"
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Plantilla Operativa (Server-Driven) *
                      </label>
                      <select
                        data-testid="select-event-template"
                        value={templateId}
                        onChange={(e) => setTemplateId(Number(e.target.value))}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-[#7765f8] focus:outline-none"
                      >
                        {templates.map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {selectedTemplate && (
                    <div
                      data-testid="template-capabilities-preview"
                      className="rounded-xl border border-[#7765f8]/25 bg-[#7765f8]/5 p-3.5"
                    >
                      <p className="text-xs font-bold text-[#15172b]">
                        {selectedTemplate.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-600">
                        {selectedTemplate.description}
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                        <span className={`rounded-md px-2 py-0.5 ${selectedTemplate.usesZones ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200/70 text-slate-500'}`}>
                          Zonas: {selectedTemplate.usesZones ? 'Activo' : 'No'}
                        </span>
                        <span className={`rounded-md px-2 py-0.5 ${selectedTemplate.usesSeats ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200/70 text-slate-500'}`}>
                          Sillas Live: {selectedTemplate.usesSeats ? 'Activo' : 'No'}
                        </span>
                        <span className={`rounded-md px-2 py-0.5 ${selectedTemplate.usesProducts ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200/70 text-slate-500'}`}>
                          Productos: {selectedTemplate.usesProducts ? 'Activo' : 'No'}
                        </span>
                        <span className={`rounded-md px-2 py-0.5 ${selectedTemplate.usesPromotions ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200/70 text-slate-500'}`}>
                          Cupones: {selectedTemplate.usesPromotions ? 'Activo' : 'No'}
                        </span>
                        <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-indigo-800">
                          QR: Obligatorio
                        </span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Nombre Oficial del Evento *
                    </label>
                    <input
                      required
                      data-testid="input-event-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ej. Festival Vallenato Sin Fronteras 2026"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#7765f8] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        URL Cartel / Banner Vertical (3:4)
                      </label>
                      <input
                        data-testid="input-event-cover"
                        value={coverImageUrl}
                        onChange={(e) => setCoverImageUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#7765f8] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Descripción para Compradores
                      </label>
                      <input
                        data-testid="input-event-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Artistas invitados, apertura de puertas..."
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#7765f8] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Bloque 2: Ubicación y Mapa Interactivo */}
                <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5">
                  <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                    2. Recinto y Geolocalización Estandarizada
                  </h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Ciudad *
                      </label>
                      <select
                        data-testid="input-event-city"
                        value={city}
                        onChange={(e) => {
                          const nextCity = e.target.value;
                          setCity(nextCity);
                          const coords = CITY_COORDINATES[nextCity];
                          if (coords) {
                            setLatitude(coords.lat);
                            setLongitude(coords.lng);
                          }
                        }}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-[#7765f8] focus:outline-none"
                      >
                        {Object.keys(CITY_COORDINATES).map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Nombre del Recinto / Estadio / Teatro *
                      </label>
                      <input
                        required
                        data-testid="input-event-venue"
                        value={venue}
                        onChange={(e) => setVenue(e.target.value)}
                        placeholder="Ej. Parque de la Leyenda Vallenata"
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#7765f8] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Dirección Estandarizada (Autocompletada por el mapa o editable)
                    </label>
                    <input
                      data-testid="input-event-address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Carrera 19 # 14-20, Valledupar, Colombia"
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-700"
                    />
                  </div>

                  <LocationMapPicker
                    latitude={latitude}
                    longitude={longitude}
                    city={city}
                    address={venue || address}
                    onLocationChange={(loc) => {
                      setLatitude(loc.latitude);
                      setLongitude(loc.longitude);
                      setAddress(loc.standardizedAddress);
                      if (CITY_COORDINATES[loc.city]) {
                        setCity(loc.city);
                      }
                    }}
                  />
                </div>

                {/* Bloque 3: Fechas, Aforo y Precios */}
                <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5">
                  <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                    3. Fecha, Aforo y Entradas
                  </h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Inicio *
                      </label>
                      <input
                        required
                        type="datetime-local"
                        data-testid="input-event-start"
                        value={startAt}
                        onChange={(e) => setStartAt(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Finalización *
                      </label>
                      <input
                        required
                        type="datetime-local"
                        data-testid="input-event-end"
                        value={endAt}
                        onChange={(e) => setEndAt(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Aforo Total *
                      </label>
                      <input
                        required
                        type="number"
                        min={1}
                        data-testid="input-event-capacity"
                        value={capacity}
                        onChange={(e) => setCapacity(Number(e.target.value))}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold"
                      />
                    </div>
                  </div>

                  {!selectedTemplate?.usesZones ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Precio Entrada General (COP) *
                      </label>
                      <input
                        type="number"
                        min={0}
                        data-testid="input-general-ticket-price"
                        value={generalTicketPrice}
                        onChange={(e) => setGeneralTicketPrice(Number(e.target.value))}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2 rounded-xl bg-slate-50 p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">
                          Localidades / Zonas
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setZones([...zones, { name: 'Platea', capacity: 100, price: 95000 }])
                          }
                          className="text-xs font-semibold text-[#7765f8] hover:underline"
                        >
                          + Agregar zona
                        </button>
                      </div>
                      {zones.map((z, idx) => (
                        <div key={idx} className="grid grid-cols-3 gap-2">
                          <input
                            value={z.name}
                            onChange={(e) => {
                              const copy = [...zones];
                              copy[idx].name = e.target.value;
                              setZones(copy);
                            }}
                            placeholder="Zona"
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                          />
                          <input
                            type="number"
                            value={z.capacity}
                            onChange={(e) => {
                              const copy = [...zones];
                              copy[idx].capacity = Number(e.target.value);
                              setZones(copy);
                            }}
                            placeholder="Cupos"
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                          />
                          <input
                            type="number"
                            value={z.price}
                            onChange={(e) => {
                              const copy = [...zones];
                              copy[idx].price = Number(e.target.value);
                              setZones(copy);
                            }}
                            placeholder="Precio COP"
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedTemplate?.usesSeats && (
                    <div className="grid grid-cols-2 gap-3 rounded-xl bg-indigo-50/70 p-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-indigo-950">
                          Filas de Sillas (A, B, C...)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={seatRows}
                          onChange={(e) => setSeatRows(Number(e.target.value))}
                          className="mt-1 w-full rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-indigo-950">
                          Sillas por Fila (Total: {seatRows * seatsPerRow})
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={seatsPerRow}
                          onChange={(e) => setSeatsPerRow(Number(e.target.value))}
                          className="mt-1 w-full rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {selectedTemplate?.usesProducts && (
                    <div className="space-y-2 rounded-xl bg-amber-50/70 p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-950">
                          Merchandising / Productos
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setProducts([...products, { name: 'Gorra Oficial', price: 45000, stock: 40 }])
                          }
                          className="text-xs font-semibold text-amber-800 hover:underline"
                        >
                          + Agregar producto
                        </button>
                      </div>
                      {products.map((prod, idx) => (
                        <div key={idx} className="grid grid-cols-3 gap-2">
                          <input
                            value={prod.name}
                            onChange={(e) => {
                              const copy = [...products];
                              copy[idx].name = e.target.value;
                              setProducts(copy);
                            }}
                            className="rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-xs"
                          />
                          <input
                            type="number"
                            value={prod.price}
                            onChange={(e) => {
                              const copy = [...products];
                              copy[idx].price = Number(e.target.value);
                              setProducts(copy);
                            }}
                            className="rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-xs"
                          />
                          <input
                            type="number"
                            value={prod.stock}
                            onChange={(e) => {
                              const copy = [...products];
                              copy[idx].stock = Number(e.target.value);
                              setProducts(copy);
                            }}
                            className="rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedTemplate?.usesPromotions && (
                    <div className="grid grid-cols-3 gap-2 rounded-xl bg-emerald-50/70 p-3.5">
                      <input
                        value={promoName}
                        onChange={(e) => setPromoName(e.target.value)}
                        placeholder="Nombre promo"
                        className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-xs"
                      />
                      <input
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder="Código (EARLY20)"
                        className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-xs uppercase"
                      />
                      <input
                        type="number"
                        min={1}
                        max={90}
                        value={promoDiscount}
                        onChange={(e) => setPromoDiscount(Number(e.target.value))}
                        placeholder="% Dcto"
                        className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-xs"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* COLUMNA DERECHA (5 cols): Vista Previa en Tiempo Real como en el Catálogo */}
              <div className="lg:col-span-5">
                <div className="sticky top-24 space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-[#f7f7fb] p-5">
                    <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      Vista Previa en Cartelera Pública
                    </span>

                    <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="relative aspect-16/10 w-full bg-slate-100">
                        {coverImageUrl ? (
                          <img
                            src={coverImageUrl}
                            alt="Vista previa"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#15172b] to-[#2e295e] text-xs font-bold tracking-widest text-white/60">
                            EVENTIA LIVE PREVIEW
                          </div>
                        )}
                        <span className="absolute top-3 left-3 rounded-lg bg-white/95 px-2.5 py-1 text-[11px] font-bold text-[#15172b]">
                          {categories.find((c) => c.id === Number(categoryId))?.name ?? 'Música'}
                        </span>
                      </div>

                      <div className="space-y-2.5 p-4">
                        <h4 className="line-clamp-2 text-base font-extrabold text-[#15172b]">
                          {name.trim() || 'Nombre de tu próximo evento'}
                        </h4>

                        <p className="flex items-center gap-1.5 text-xs text-slate-600">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-[#ff684a]" />
                          <span>
                            {venue.trim() || 'Recinto por definir'} · {city}
                          </span>
                        </p>

                        {address && (
                          <p className="text-[11px] text-slate-400">{address}</p>
                        )}

                        <p className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Calendar className="h-3.5 w-3.5 shrink-0 text-[#7765f8]" />
                          <span>
                            {startAt
                              ? new Date(startAt).toLocaleString('es-CO', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })
                              : 'Selecciona fecha y hora'}
                          </span>
                        </p>

                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                          <div>
                            <span className="block text-[10px] text-slate-400">
                              Entrada desde
                            </span>
                            <strong className="text-sm font-extrabold text-[#15172b]">
                              {formatCOP(
                                selectedTemplate?.usesZones
                                  ? Math.min(...zones.map((z) => Number(z.price) || 0))
                                  : Number(generalTicketPrice) || 0,
                              )}
                            </strong>
                          </div>
                          <span className="rounded-lg bg-[#ff684a]/10 px-2.5 py-1 text-[11px] font-bold text-[#ff684a]">
                            {capacity} cupos
                          </span>
                        </div>
                      </div>
                    </div>

                    {selectedTemplate?.usesSeats && seatRows * seatsPerRow > capacity && (
                      <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                        Aviso: Tienes configuradas <strong>{seatRows * seatsPerRow}</strong> sillas, pero el aforo total es de <strong>{capacity}</strong>.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2.5 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 rounded-xl border border-slate-300 bg-white py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      data-testid="btn-submit-create-event"
                      disabled={submitting}
                      className="flex-2 rounded-xl bg-[#ff684a] py-3 text-xs font-bold text-white shadow-md transition hover:bg-[#f25536] disabled:opacity-50"
                    >
                      {submitting ? 'Guardando...' : 'Guardar Borrador de Evento'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDICIÓN SEGURA (NO ROMPE COMPRAS NI LOCALIDADES EXISTENTES) */}
      {editingEvent && (
        <div
          data-testid="safe-edit-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[#15172b]">
              Edición Segura del Evento
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Para proteger las compras y sillas ya reservadas por asistentes, solo se permite modificar metadatos informativos.
            </p>
            <form onSubmit={handleSafeUpdateSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Título del Evento</label>
                <input
                  type="text"
                  data-testid="input-safe-edit-name"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Descripción</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Dirección Exacta</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingEvent(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  data-testid="btn-save-safe-edit"
                  disabled={submitting}
                  className="rounded-xl bg-[#7765f8] px-5 py-2 text-xs font-semibold text-white"
                >
                  Guardar Cambios Seguros
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: COMPRADORES Y VENTAS EN TIEMPO REAL */}
      {selectedEventForBuyers && (
        <div
          data-testid="buyers-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-[#15172b]">
                  Compradores — {selectedEventForBuyers.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Actualizado en vivo mediante WebSockets ante cada orden confirmada.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEventForBuyers(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingBuyers ? (
              <p className="py-8 text-center text-sm text-slate-500">Cargando compradores...</p>
            ) : buyers.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                Aún no se registran compras confirmadas para este evento.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-2">Asistente</th>
                      <th className="py-2">Entradas</th>
                      <th className="py-2">Productos</th>
                      <th className="py-2">Total Pagado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {buyers.map((b) => (
                      <tr key={b.orderId}>
                        <td className="py-2.5">
                          <p className="font-semibold text-[#15172b]">{b.buyerName}</p>
                          <p className="text-[11px] text-slate-500">{b.buyerEmail}</p>
                        </td>
                        <td className="py-2.5 font-medium">{b.ticketsCount}</td>
                        <td className="py-2.5 font-medium">{b.productsCount}</td>
                        <td className="py-2.5 font-bold text-emerald-700">
                          {formatCOP(b.totalPaid)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}