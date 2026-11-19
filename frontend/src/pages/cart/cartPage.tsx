
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    CalendarDays,
    Minus,
    Plus,
    ShoppingCart,
    Trash2,
} from 'lucide-react';

import { useAuth } from '../../contexts/auth-context';
import {
    getMyCarts,
    updateCartItem,
    removeCartItem,
    type Cart,
    type CartItem,
} from '../../services/cart.service';
import { createReservation } from '../../services/reservations.service';
import { createOrder } from '../../services/oders.service';
import {
    createPayment,
    simulatePaymentApproval,
    type Payment,
} from '../../services/payments.service';

const currencyFormatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
});

function formatPrice(value: number): string {
    return currencyFormatter.format(Number(value));
}

function getItemName(item: CartItem): string {
    if (item.ticketType) {
        return item.ticketType.name;
    }

    if (item.productVariant?.product?.name) {
        return item.productVariant.product.name;
    }

    return item.productVariant?.name ?? 'Producto';
}

function getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
        ACTIVE: 'Activo',
        RESERVED: 'Reservado',
        CANCELLED: 'Cancelado',
        EXPIRED: 'Vencido',
        COMPLETED: 'Completado',
        PENDING: 'Pendiente',
        APPROVED: 'Aprobado',
        REJECTED: 'Rechazado',
        PAID: 'Pagado',
        CONFIRMED: 'Confirmado',
    };

    return labels[status] ?? status;
}

interface CheckoutSession {
    cartId: number;
    reservationId?: number;
    orderId?: number;
    payment?: Payment;
}

export default function CartPage() {
    const { user, isAuthenticated } = useAuth();

    const [carts, setCarts] = useState<Cart[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [pendingItemId, setPendingItemId] = useState<number | null>(null);

    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [approvalLoading, setApprovalLoading] = useState(false);
    const [checkoutSession, setCheckoutSession] =
        useState<CheckoutSession | null>(null);

    const loadCarts = useCallback(async () => {
        if (!user) {
            setCarts([]);
            setLoading(false);
            return;
        }

        setError('');

        try {
            const result = await getMyCarts(user.id);
            setCarts(result);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'No fue posible cargar tus carritos.',
            );
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        let cancelled = false;

        async function fetchCarts() {
            if (!user) {
                setCarts([]);
                setLoading(false);
                return;
            }

            setError('');

            try {
                const result = await getMyCarts(user.id);

                if (!cancelled) {
                    setCarts(result);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : 'No fue posible cargar tus carritos.',
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void fetchCarts();

        return () => {
            cancelled = true;
        };
    }, [user]);

    async function handleUpdateQuantity(
        item: CartItem,
        newQuantity: number,
    ) {
        if (newQuantity < 1 || pendingItemId !== null) {
            return;
        }

        setPendingItemId(item.id);
        setError('');

        try {
            await updateCartItem(item.id, { quantity: newQuantity });
            await loadCarts();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'No fue posible actualizar la cantidad.',
            );
        } finally {
            setPendingItemId(null);
        }
    }

    async function handleRemoveItem(itemId: number) {
        if (pendingItemId !== null) {
            return;
        }

        setPendingItemId(itemId);
        setError('');

        try {
            await removeCartItem(itemId);
            await loadCarts();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'No fue posible eliminar el artículo.',
            );
        } finally {
            setPendingItemId(null);
        }
    }

    async function handleCheckout(cart: Cart) {
        if (!user || !isAuthenticated) {
            setCheckoutError('Debes iniciar sesión para continuar.');
            return;
        }

        if (cart.items.length === 0) {
            setCheckoutError('No puedes reservar un carrito vacío.');
            return;
        }

        if (checkoutLoading || pendingItemId !== null) {
            return;
        }

        // Evita iniciar otro checkout mientras existe un pago pendiente
        // asociado a otro carrito en esta sesión de la página.
        if (
            checkoutSession &&
            checkoutSession.cartId !== cart.id &&
            checkoutSession.payment?.status === 'PENDING'
        ) {
            setCheckoutError(
                'Tienes un pago pendiente en otro carrito. Finaliza ese proceso antes de iniciar otro.',
            );
            return;
        }

        setCheckoutLoading(true);
        setCheckoutError(null);

        try {
            // Reutiliza los identificadores que ya se hayan creado
            // si un paso anterior del checkout falló.
            let session: CheckoutSession =
                checkoutSession?.cartId === cart.id
                    ? { ...checkoutSession }
                    : { cartId: cart.id };

            if (session.payment) {
                setCheckoutError(
                    session.payment.status === 'APPROVED'
                        ? 'Este pago ya fue aprobado.'
                        : 'Ya existe un pago para este carrito. Continúa desde el resumen del pago.',
                );
                return;
            }

            if (!session.reservationId) {
                const reservation = await createReservation(user.id, {
                    eventId: cart.eventId,
                    cartId: cart.id,
                });

                session = {
                    ...session,
                    reservationId: reservation.id,
                };

                setCheckoutSession(session);
            }

            if (!session.orderId) {
                const order = await createOrder({
                    reservationId: session.reservationId!,
                });

                session = {
                    ...session,
                    orderId: order.id,
                };

                setCheckoutSession(session);
            }

            const payment = await createPayment({
                orderId: session.orderId!,
            });

            session = {
                ...session,
                payment,
            };

            setCheckoutSession(session);
        } catch (err) {
            setCheckoutError(
                err instanceof Error
                    ? err.message
                    : 'No fue posible completar el proceso de reserva y pago.',
            );
        } finally {
            setCheckoutLoading(false);
        }
    }

    async function handleSimulateApproval() {
        const payment = checkoutSession?.payment;

        if (!payment || payment.status !== 'PENDING' || approvalLoading) {
            return;
        }

        setApprovalLoading(true);
        setCheckoutError(null);

        try {
            const approvedPayment = await simulatePaymentApproval(payment.id);

            setCheckoutSession((current) => {
                if (!current || current.payment?.id !== payment.id) {
                    return current;
                }

                return {
                    ...current,
                    payment: approvedPayment,
                };
            });

            // Actualiza los carritos después de confirmar el pago.
            await loadCarts();
        } catch (err) {
            setCheckoutError(
                err instanceof Error
                    ? err.message
                    : 'No se pudo simular la aprobación del pago.',
            );
        } finally {
            setApprovalLoading(false);
        }
    }

    if (!isAuthenticated || !user) {
        return (
            <section className="cart-page">
                <div className="cart-container cart-message">
                    <ShoppingCart size={42} />
                    <h1>Mi carrito</h1>
                    <p>Inicia sesión para consultar tus carritos.</p>
                    <Link className="cart-primary-button" to="/login">
                        Iniciar sesión
                    </Link>
                </div>
            </section>
        );
    }

    if (loading) {
        return (
            <section className="cart-page">
                <div className="cart-container cart-message">
                    <p>Cargando tus carritos...</p>
                </div>
            </section>
        );
    }

    const activeCarts = carts.filter((cart) => cart.status === 'ACTIVE');
    const otherCarts = carts.filter((cart) => cart.status !== 'ACTIVE');


    return (
        <section className="cart-page">
            <div className="cart-container">
                <Link className="cart-back-link" to="/">
                    <ArrowLeft size={17} />
                    Seguir explorando eventos
                </Link>

                <header className="cart-heading">
                    <div>
                        <span className="cart-eyebrow">EVENTIA</span>
                        <h1>Mi carrito</h1>
                        <p>
                            Revisa los artículos seleccionados antes de continuar.
                        </p>
                    </div>

                    <ShoppingCart size={32} />
                </header>

                {error && (
                    <div className="cart-error" role="alert">
                        {error}
                        <button
                            type="button"
                            onClick={() => void loadCarts()}
                        >
                            Reintentar
                        </button>
                    </div>
                )}

                {checkoutError && (
                    <div className="cart-error" role="alert">
                        {checkoutError}
                        <button
                            type="button"
                            onClick={() => setCheckoutError(null)}
                        >
                            Cerrar
                        </button>
                    </div>
                )}

                {carts.length === 0 && !error && (
                    <div className="cart-message">
                        <ShoppingCart size={46} />
                        <h2>Tu carrito está vacío</h2>
                        <p>
                            Explora los eventos disponibles y selecciona tus entradas.
                        </p>
                        <Link className="cart-primary-button" to="/#eventos">
                            Explorar eventos
                        </Link>
                    </div>
                )}

                {activeCarts.map((cart) => (
                    <article className="cart-card" key={cart.id}>
                        <div className="cart-event-heading">
                            <div>
                                <span className="cart-status cart-status-active">
                                    {getStatusLabel(cart.status)}
                                </span>
                                <h2>
                                    {cart.event?.name ?? `Evento #${cart.eventId}`}
                                </h2>
                                <p>Carrito #{cart.id}</p>
                            </div>

                            <CalendarDays size={24} />
                        </div>

                        {cart.items.length === 0 ? (
                            <p className="cart-empty-items">
                                Todavía no has añadido entradas ni productos a este
                                carrito.
                            </p>
                        ) : (
                            <div className="cart-items">
                                {cart.items.map((item) => (
                                    <div className="cart-item" key={item.id}>
                                        <div className="cart-item-info">
                                            <h3>{getItemName(item)}</h3>
                                            <p>
                                                Precio unitario:{' '}
                                                {formatPrice(item.unitPrice)}
                                            </p>
                                            <strong>
                                                {formatPrice(item.subtotal)}
                                            </strong>
                                        </div>

                                        <div className="cart-item-actions">
                                            <div className="cart-quantity">
                                                <button
                                                    type="button"
                                                    aria-label={`Disminuir cantidad de ${getItemName(item)}`}
                                                    disabled={
                                                        item.quantity <= 1 ||
                                                        pendingItemId !== null ||
                                                        checkoutLoading
                                                    }
                                                    onClick={() =>
                                                        void handleUpdateQuantity(
                                                            item,
                                                            item.quantity - 1,
                                                        )
                                                    }
                                                >
                                                    <Minus size={15} />
                                                </button>

                                                <span>{item.quantity}</span>

                                                <button
                                                    type="button"
                                                    aria-label={`Aumentar cantidad de ${getItemName(item)}`}
                                                    disabled={
                                                        pendingItemId !== null ||
                                                        checkoutLoading
                                                    }
                                                    onClick={() =>
                                                        void handleUpdateQuantity(
                                                            item,
                                                            item.quantity + 1,
                                                        )
                                                    }
                                                >
                                                    <Plus size={15} />
                                                </button>
                                            </div>

                                            <button
                                                type="button"
                                                className="cart-remove-button"
                                                disabled={
                                                    pendingItemId !== null ||
                                                    checkoutLoading
                                                }
                                                onClick={() =>
                                                    void handleRemoveItem(item.id)
                                                }
                                            >
                                                <Trash2 size={16} />
                                                Eliminar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="cart-summary">
                            <div>
                                <span>Subtotal</span>
                                <strong>{formatPrice(cart.subtotal)}</strong>
                            </div>

                            <div>
                                <span>Descuento</span>
                                <strong>- {formatPrice(cart.discount)}</strong>
                            </div>

                            <div className="cart-total">
                                <span>Total</span>
                                <strong>{formatPrice(cart.total)}</strong>
                            </div>
                        </div>

                        <p className="cart-checkout-note">
                            El inventario se valida nuevamente al crear la reserva.
                            El contenido del carrito no garantiza la disponibilidad.
                        </p>

                        <button
                            type="button"
                            className="cart-primary-button"
                            disabled={
                                cart.items.length === 0 ||
                                pendingItemId !== null ||
                                checkoutLoading ||
                                (
                                    checkoutSession?.cartId === cart.id &&
                                    checkoutSession.payment?.status === 'PENDING'
                                )
                            }
                            onClick={() => void handleCheckout(cart)}
                        >
                            {checkoutLoading &&
                                checkoutSession?.cartId === cart.id
                                ? 'Procesando reserva...'
                                : checkoutSession?.cartId === cart.id &&
                                    checkoutSession.payment?.status === 'PENDING'
                                    ? 'Pago pendiente'
                                    : 'Continuar con la reserva'}
                        </button>
                    </article>
                ))}

                {checkoutSession?.payment && (
                    <section className="cart-card" aria-live="polite">
                        <div className="cart-event-heading">
                            <div>
                                <span className="cart-eyebrow">
                                    CHECKOUT
                                </span>
                                <h2>Resumen del pago</h2>
                                <p>
                                    Carrito #{checkoutSession.cartId}
                                </p>
                            </div>
                        </div>

                        <div className="cart-summary">
                            <div>
                                <span>Orden</span>
                                <strong>
                                    #{checkoutSession.payment.orderId}
                                </strong>
                            </div>

                            <div>
                                <span>Pago</span>
                                <strong>
                                    #{checkoutSession.payment.id}
                                </strong>
                            </div>

                            <div>
                                <span>Importe</span>
                                <strong>
                                    {formatPrice(checkoutSession.payment.amount)}
                                </strong>
                            </div>

                            <div className="cart-total">
                                <span>Estado</span>
                                <strong>
                                    {getStatusLabel(checkoutSession.payment.status)}
                                </strong>
                            </div>
                        </div>

                        {checkoutSession.payment.status === 'PENDING' && (
                            <>
                                <p className="cart-checkout-note">
                                    Este pago es simulado. No se realizará ningún
                                    cobro bancario.
                                </p>

                                <button
                                    type="button"
                                    className="cart-primary-button"
                                    disabled={approvalLoading}
                                    onClick={() =>
                                        void handleSimulateApproval()
                                    }
                                >
                                    {approvalLoading
                                        ? 'Procesando aprobación...'
                                        : 'Simular aprobación del pago'}
                                </button>
                            </>
                        )}

                        {checkoutSession.payment.status === 'APPROVED' && (
                            <p role="status">
                                Pago aprobado. El backend ha ejecutado el proceso
                                de confirmación de la reserva y emisión de entradas.
                            </p>
                        )}

                        {checkoutSession.payment.status === 'REJECTED' && (
                            <p role="alert">
                                El pago fue rechazado. Consulta el estado de la orden
                                antes de intentar otro pago.
                            </p>
                        )}
                    </section>
                )}

                {otherCarts.length > 0 && (
                    <section className="cart-history">
                        <h2>Otros carritos</h2>
                        <p>
                            Estos carritos no están activos, por lo que no puedes
                            modificar sus artículos desde esta página.
                        </p>

                        {otherCarts.map((cart) => (
                            <div className="cart-history-item" key={cart.id}>
                                <div>
                                    <strong>
                                        {cart.event?.name ??
                                            `Evento #${cart.eventId}`}
                                    </strong>
                                    <p>Carrito #{cart.id}</p>
                                </div>

                                <span className="cart-status">
                                    {getStatusLabel(cart.status)}
                                </span>

                                <strong>{formatPrice(cart.total)}</strong>
                            </div>
                        ))}
                    </section>
                )}
            </div>
        </section>
    );
}
