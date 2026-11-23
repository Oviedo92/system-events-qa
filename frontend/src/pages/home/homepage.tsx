import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { demoEvents } from '../../data/demoEvents';

import { Link } from 'react-router-dom';

import {
    ArrowRight,
    BriefcaseBusiness,
    CalendarDays,
    CheckCircle2,
    Dumbbell,
    HeartHandshake,
    MapPin,
    Mic2,
    Music2,
    Search,
    ShieldCheck,
    Sparkles,
    Ticket,
    Theater,
} from 'lucide-react';

import './home.css';

type EventCategory =
    | 'Música'
    | 'Festivales'
    | 'Deportes'
    | 'Teatro'
    | 'Conferencias'
    | 'Comedia';

interface Event {
    id: number;
    title: string;
    category: EventCategory;
    date: string;
    city: string;
    venue: string;
    price: number;
    image: string;
    badge: string;
}

const categories: {
    name: EventCategory;
    icon: typeof Music2;
}[] = [
        { name: 'Música', icon: Music2 },
        { name: 'Festivales', icon: Sparkles },
        { name: 'Deportes', icon: Dumbbell },
        { name: 'Teatro', icon: Theater },
        { name: 'Conferencias', icon: BriefcaseBusiness },
        { name: 'Comedia', icon: Mic2 },
    ];

const events: Event[] = [
    {
        id: 1,
        title: 'Una noche para recordar',
        category: 'Música',
        date: '20 NOV · 8:00 PM',
        city: 'Valledupar',
        venue: 'Plaza de eventos',
        price: 65000,
        image:
            'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1000&q=85',
        badge: 'DESTACADO',
    },
    {
        id: 2,
        title: 'Festival de nuevas experiencias',
        category: 'Festivales',
        date: '28 NOV · 5:00 PM',
        city: 'Medellín',
        venue: 'Complejo cultural',
        price: 45000,
        image:
            'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1000&q=85',
        badge: 'POPULAR',
    },
    {
        id: 3,
        title: 'Corre por tus metas 10K',
        category: 'Deportes',
        date: '06 DIC · 6:00 AM',
        city: 'Bogotá',
        venue: 'Parque metropolitano',
        price: 35000,
        image:
            'https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=1000&q=85',
        badge: 'INSCRIPCIONES',
    },
    {
        id: 4,
        title: 'Historias sobre el escenario',
        category: 'Teatro',
        date: '12 DIC · 7:00 PM',
        city: 'Medellín',
        venue: 'Teatro central',
        price: 55000,
        image:
            'https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=1000&q=85',
        badge: 'CULTURA',
    },
    {
        id: 5,
        title: 'Ideas que transforman',
        category: 'Conferencias',
        date: '18 DIC · 9:00 AM',
        city: 'Bogotá',
        venue: 'Centro de convenciones',
        price: 80000,
        image:
            'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1000&q=85',
        badge: 'APRENDE',
    },
    {
        id: 6,
        title: 'Una noche de risas',
        category: 'Comedia',
        date: '20 DIC · 8:30 PM',
        city: 'Valledupar',
        venue: 'Auditorio principal',
        price: 40000,
        image:
            'https://images.unsplash.com/photo-1527224857830-43a7acc85260?auto=format&fit=crop&w=1000&q=85',
        badge: 'ENTRETENIMIENTO',
    },
];

const cities = [
    'Todas las ciudades',
    'Valledupar',
    'Bogotá',
    'Medellín',
];

const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
    }).format(price);

export default function HomePage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCity, setSelectedCity] = useState(
        'Todas las ciudades',
    );
    const [selectedCategory, setSelectedCategory] = useState('Todos');

    const availabilityById = new Map(
        demoEvents.map((event) => [event.id, event.availability]),
    );

    const filteredEvents = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLocaleLowerCase('es');

        return events.filter((event) => {
            const searchableText =
                `${event.title} ${event.category} ${event.city} ${event.venue}`
                    .toLocaleLowerCase('es');

            const matchesSearch =
                normalizedSearch.length === 0 ||
                searchableText.includes(normalizedSearch);

            const matchesCity =
                selectedCity === 'Todas las ciudades' ||
                event.city === selectedCity;

            const matchesCategory =
                selectedCategory === 'Todos' ||
                event.category === selectedCategory;

            return matchesSearch && matchesCity && matchesCategory;
        });
    }, [searchTerm, selectedCity, selectedCategory]);

    const handleSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        document.getElementById('eventos')?.scrollIntoView({
            behavior: 'smooth',
        });
    };

    const resetFilters = () => {
        setSearchTerm('');
        setSelectedCity('Todas las ciudades');
        setSelectedCategory('Todos');
    };

    const scrollToEvents = () => {
        document.getElementById('eventos')?.scrollIntoView({
            behavior: 'smooth',
        });
    };

    return (
        <>
            {/* Hero y buscador */}
            <section className="hero-section" id="inicio">
                <div className="container">
                    <div className="hero-content">
                        <span className="hero-badge">
                            <span className="hero-badge-dot" />
                            TU PRÓXIMA GRAN EXPERIENCIA COMIENZA AQUÍ
                        </span>

                        <h1 className="hero-title">
                            No solo salgas.
                            <br />
                            <span className="highlight">Vive algo único.</span>
                        </h1>

                        <p className="hero-description">
                            Conecta con los eventos que te emocionan. Descubre música,
                            cultura, deporte y experiencias que merecen un lugar en tu
                            historia.
                        </p>

                        <div className="hero-actions">
                            <Link className="button button-coral" to="/events">
                                Explorar eventos
                                <ArrowRight size={18} />
                            </Link>

                            <a className="button button-outline" href="#categorias">
                                Descubrir categorías
                            </a>
                        </div>

                        <div className="hero-note">
                            <span>
                                <CheckCircle2 size={16} />
                                Diferentes experiencias
                            </span>
                            <span>
                                <ShieldCheck size={16} />
                                Una experiencia sencilla
                            </span>
                            <span>
                                <HeartHandshake size={16} />
                                Para compartir
                            </span>
                        </div>
                    </div>

                    <form className="search-panel" onSubmit={handleSearch}>
                        <div className="search-field">
                            <Search className="search-field-icon" size={21} />

                            <div className="search-field-content">
                                <label htmlFor="event-search">
                                    ¿Qué quieres vivir?
                                </label>
                                <input
                                    id="event-search"
                                    type="search"
                                    placeholder="Nombre, evento o lugar"
                                    value={searchTerm}
                                    onChange={(event) =>
                                        setSearchTerm(event.target.value)
                                    }
                                />
                            </div>
                        </div>

                        <div className="search-field">
                            <MapPin className="search-field-icon" size={21} />

                            <div className="search-field-content">
                                <label htmlFor="city-search">¿Dónde?</label>
                                <select
                                    id="city-search"
                                    value={selectedCity}
                                    onChange={(event) =>
                                        setSelectedCity(event.target.value)
                                    }
                                >
                                    {cities.map((city) => (
                                        <option key={city} value={city}>
                                            {city}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="search-field">
                            <CalendarDays className="search-field-icon" size={21} />

                            <div className="search-field-content">
                                <label htmlFor="category-search">
                                    Tipo de experiencia
                                </label>
                                <select
                                    id="category-search"
                                    value={selectedCategory}
                                    onChange={(event) =>
                                        setSelectedCategory(event.target.value)
                                    }
                                >
                                    <option value="Todos">Todas las categorías</option>
                                    {categories.map((category) => (
                                        <option key={category.name} value={category.name}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <button
                            className="button button-primary search-button"
                            type="submit"
                        >
                            <Search size={18} />
                            Buscar
                        </button>
                    </form>
                </div>
            </section>

            {/* Categorías */}
            <section className="categories-section" id="categorias">
                <div className="container">
                    <div className="section-heading">
                        <div>
                            <p className="eyebrow">ENCUENTRA TU PLAN</p>
                            <h2 className="section-title">¿Qué te mueve?</h2>
                        </div>

                        <Link className="text-link" to="/events">
                            Explorar todo
                            <ArrowRight size={17} />
                        </Link>
                    </div>

                    <div className="category-list">
                        {categories.map(({ name, icon: Icon }) => (
                            <button
                                className={`category-card ${selectedCategory === name ? 'active' : ''
                                    }`}
                                key={name}
                                type="button"
                                aria-pressed={selectedCategory === name}
                                onClick={() => {
                                    setSelectedCategory((current) =>
                                        current === name ? 'Todos' : name,
                                    );
                                    scrollToEvents();
                                }}
                            >
                                <span className="category-icon">
                                    <Icon size={22} />
                                </span>
                                <span className="category-name">{name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Catálogo de eventos */}
            <section className="section events-section" id="eventos">
                <div className="container">
                    <div className="section-heading">
                        <div>
                            <p className="eyebrow">PLANES QUE INSPIRAN</p>

                            <h2 className="section-title">
                                {selectedCategory === 'Todos'
                                    ? 'Encuentra tu próximo plan'
                                    : `Descubre ${selectedCategory.toLowerCase()}`}
                            </h2>

                            <p className="section-description">
                                Nuevos lugares, buenas historias y experiencias para
                                recordar. Encuentra una opción que encaje contigo.
                            </p>
                        </div>

                        <button
                            className="text-link"
                            type="button"
                            onClick={resetFilters}
                        >
                            Ver todos
                            <ArrowRight size={17} />
                        </button>
                    </div>

                    <div className="events-grid">
                        {filteredEvents.length > 0 ? (
                            filteredEvents.map((event) => (
                                <article className="event-card" key={event.id}>
                                    <div className="event-image-wrap">
                                        <img
                                            className="event-image"
                                            src={event.image}
                                            alt={event.title}
                                            loading="lazy"
                                        />
                                        <span className="event-badge">
                                            {event.badge}
                                        </span>
                                    </div>

                                    <div className="event-content">
                                        <div className="event-date">
                                            <CalendarDays size={16} />
                                            {event.date}
                                        </div>

                                        <h3 className="event-title">{event.title}</h3>

                                        <p className="event-location">
                                            <MapPin size={16} />
                                            {event.venue}, {event.city}
                                        </p>

                                        <div className="event-divider" />

                                        <div className="event-availability">
                                            <div className="event-availability-header">
                                                <span>Ocupación</span>
                                                <strong>
                                                    {availabilityById.get(event.id)?.occupancyPercentage ?? 0}%
                                                </strong>
                                            </div>

                                            <div
                                                className="event-availability-circle"
                                                role="progressbar"
                                                aria-label={`Ocupación de ${event.title}`}
                                                aria-valuemin={0}
                                                aria-valuemax={100}
                                                aria-valuenow={availabilityById.get(event.id)?.occupancyPercentage ?? 0}
                                                style={{
                                                    background: `conic-gradient(
      #ff684a 0% ${availabilityById.get(event.id)?.occupancyPercentage ?? 0}%,
      #ececf2 ${availabilityById.get(event.id)?.occupancyPercentage ?? 0}% 100%
    )`,
                                                }}
                                            >
                                                <div className="event-availability-circle-center">
                                                    {availabilityById.get(event.id)?.occupancyPercentage ?? 0}%
                                                </div>
                                            </div>

                                            <span className="event-availability-remaining">
                                                {availabilityById.get(event.id)?.availableTickets ?? 0} entradas disponibles
                                            </span>
                                        </div>

                                        <div className="event-bottom">
                                            <div>
                                                <span className="event-price-label">
                                                    Entrada desde
                                                </span>
                                                <span className="event-price">
                                                    {formatPrice(event.price)}
                                                </span>
                                            </div>

                                            <button
                                                className="event-arrow"
                                                type="button"
                                                aria-label={`Filtrar eventos de ${event.category}`}
                                                title={`Ver categoría: ${event.category}`}
                                                onClick={() => {
                                                    setSelectedCategory(event.category);
                                                    scrollToEvents();
                                                }}
                                            >
                                                <ArrowRight size={19} />
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            ))
                        ) : (
                            <div className="empty-state">
                                <Search size={30} />
                                <h3>No encontramos ese plan</h3>
                                <p>
                                    Prueba otra búsqueda o cambia la ciudad y la categoría.
                                </p>
                                <button
                                    className="button button-outline"
                                    type="button"
                                    onClick={resetFilters}
                                >
                                    Limpiar filtros
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Invitación para organizadores */}
            <section className="organizer-section" id="organizadores">
                <div className="container">
                    <div className="organizer-banner">
                        <div className="organizer-copy">
                            <p className="eyebrow">TU EVENTO MERECE SER VIVIDO</p>

                            <h2 className="organizer-title">
                                Tú creas el momento.
                                <br />
                                Nosotros te ayudamos a compartirlo.
                            </h2>

                            <p className="organizer-description">
                                Una propuesta para que los organizadores presenten sus
                                experiencias, conecten con su público y gestionen sus
                                eventos desde un mismo lugar.
                            </p>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                <Link
                                    className="button button-coral"
                                    data-testid="home-btn-apply-promoter"
                                    to="/promoter/application"
                                >
                                    Postularme como Promotor
                                    <ArrowRight size={18} />
                                </Link>

                                <Link
                                    className="button button-outline"
                                    data-testid="home-btn-apply-moderator"
                                    to="/moderator/application"
                                >
                                    Trabaja con nosotros (Moderador)
                                </Link>
                            </div>
                        </div>

                        <div className="organizer-visual" aria-hidden="true">
                            <Sparkles className="organizer-sparkle" size={28} />

                            <div className="organizer-orbit">
                                <div className="organizer-ticket">
                                    <Ticket size={52} strokeWidth={1.5} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
