
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const templates = [
  {
    name: 'Auditorio con asientos',
    description: 'Plantilla para eventos con asientos individuales.',
    usesZones: false,
    usesSeats: true,
    usesProducts: false,
    usesPromotions: true,
    usesQr: true,
  },
  {
    name: 'Festival por zonas',
    description: 'Plantilla para eventos organizados por zonas.',
    usesZones: true,
    usesSeats: false,
    usesProducts: true,
    usesPromotions: true,
    usesQr: true,
  },
  {
    name: 'Evento libre',
    description: 'Plantilla base configurable para diferentes tipos de eventos.',
    usesZones: false,
    usesSeats: false,
    usesProducts: true,
    usesPromotions: true,
    usesQr: true,
  },
  {
    name: 'Auditorio con zonas y asientos',
    description: 'Plantilla para eventos con zonas y asientos individuales.',
    usesZones: true,
    usesSeats: true,
    usesProducts: false,
    usesPromotions: true,
    usesQr: true,
  },
];

const categories = [
  {
    name: 'Música',
    slug: 'musica',
    description: 'Conciertos y espectáculos musicales.',
  },
  {
    name: 'Festivales',
    slug: 'festivales',
    description: 'Festivales y ferias culturales o temáticas.',
  },
  {
    name: 'Deportes',
    slug: 'deportes',
    description: 'Competiciones y actividades deportivas.',
  },
  {
    name: 'Teatro',
    slug: 'teatro',
    description: 'Obras y representaciones teatrales.',
  },
  {
    name: 'Conferencias',
    slug: 'conferencias',
    description: 'Congresos, charlas y encuentros profesionales.',
  },
  {
    name: 'Comedia',
    slug: 'comedia',
    description: 'Stand-up y espectáculos de humor.',
  },
];

const image = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

const events = [
  {
    name: 'Festival Vallenato 2027',
    slug: 'festival-vallenato-2027',
    categorySlug: 'festivales',
    description:
      'Una celebración de la música vallenata con artistas invitados, acordeones y cultura del Caribe colombiano.',
    startAt: '2027-04-29T18:00:00-05:00',
    endAt: '2027-04-30T23:30:00-05:00',
    venue: 'Parque de la Leyenda Vallenata',
    address: 'Avenida Hurtado',
    city: 'Valledupar',
    capacity: 1500,
    price: 80000,
    imageUrl: image('photo-1501386761578-eac5c94b800a'),
    altText: 'Público disfrutando de un concierto en vivo',
  },
  {
    name: 'Caribe Sonoro: Concierto en Vivo',
    slug: 'caribe-sonoro-2027',
    categorySlug: 'musica',
    description:
      'Una noche de música en vivo con sonidos caribeños, artistas invitados y una puesta en escena especial.',
    startAt: '2027-03-20T19:00:00-05:00',
    endAt: '2027-03-20T23:59:00-05:00',
    venue: 'Plaza de Eventos',
    address: 'Centro de Valledupar',
    city: 'Valledupar',
    capacity: 800,
    price: 50000,
    imageUrl: image('photo-1459749411175-04bf5292ceea'),
    altText: 'Escenario iluminado durante un concierto',
  },
  {
    name: 'Noche Electrónica',
    slug: 'noche-electronica-2027',
    categorySlug: 'musica',
    description:
      'Música electrónica, iluminación inmersiva y una experiencia nocturna para los amantes de los DJ.',
    startAt: '2027-02-13T20:00:00-05:00',
    endAt: '2027-02-14T02:00:00-05:00',
    venue: 'Arena Caribe',
    address: 'Zona de eventos',
    city: 'Valledupar',
    capacity: 600,
    price: 65000,
    imageUrl: image('photo-1470229722913-7c0e2dbbafd3'),
    altText: 'DJ tocando música electrónica en un escenario',
  },
  {
    name: 'Feria de Emprendimiento Caribe',
    slug: 'feria-emprendimiento-caribe-2027',
    categorySlug: 'conferencias',
    description:
      'Encuentro para descubrir emprendimientos, productos locales, innovación y nuevas oportunidades comerciales.',
    startAt: '2027-05-15T09:00:00-05:00',
    endAt: '2027-05-15T18:00:00-05:00',
    venue: 'Centro de Convenciones',
    address: 'Zona norte',
    city: 'Valledupar',
    capacity: 500,
    price: 20000,
    imageUrl: image('photo-1511795409834-ef04bbd61622'),
    altText: 'Personas reunidas en un evento organizado',
  },
  {
    name: 'Teatro: La Última Función',
    slug: 'teatro-la-ultima-funcion-2027',
    categorySlug: 'teatro',
    description:
      'Obra teatral sobre las decisiones, los secretos y las segundas oportunidades.',
    startAt: '2027-02-27T19:00:00-05:00',
    endAt: '2027-02-27T21:00:00-05:00',
    venue: 'Teatro Municipal',
    address: 'Centro histórico',
    city: 'Valledupar',
    capacity: 250,
    price: 35000,
    imageUrl: image('photo-1503095396549-807759245b35'),
    altText: 'Escenario teatral preparado para una función',
  },
  {
    name: 'Stand-up Comedy: Sin Filtro',
    slug: 'stand-up-sin-filtro-2027',
    categorySlug: 'comedia',
    description:
      'Una noche de comedia en vivo con historias cotidianas, humor y participación del público.',
    startAt: '2027-03-06T20:00:00-05:00',
    endAt: '2027-03-06T22:00:00-05:00',
    venue: 'Auditorio Central',
    address: 'Zona urbana',
    city: 'Valledupar',
    capacity: 300,
    price: 40000,
    imageUrl: image('photo-1506157786151-b8491531f063'),
    altText: 'Escenario preparado para un espectáculo en vivo',
  },
  {
    name: 'Carrera Caribe 10K',
    slug: 'carrera-caribe-10k-2027',
    categorySlug: 'deportes',
    description:
      'Carrera recreativa de 10 kilómetros para corredores aficionados y experimentados.',
    startAt: '2027-06-13T06:00:00-05:00',
    endAt: '2027-06-13T10:00:00-05:00',
    venue: 'Parque de la Vida',
    address: 'Avenida principal',
    city: 'Valledupar',
    capacity: 1000,
    price: 30000,
    imageUrl: image('photo-1461896836934-ffe607ba8211'),
    altText: 'Atletas participando en una carrera',
  },
  {
    name: 'Final del Torneo Caribe de Fútbol',
    slug: 'final-torneo-caribe-futbol-2027',
    categorySlug: 'deportes',
    description:
      'Partido final de un torneo de fútbol con ambiente deportivo y actividades para los asistentes.',
    startAt: '2027-04-11T16:00:00-05:00',
    endAt: '2027-04-11T19:00:00-05:00',
    venue: 'Estadio Municipal',
    address: 'Complejo deportivo',
    city: 'Valledupar',
    capacity: 1200,
    price: 25000,
    imageUrl: image('photo-1574629810360-7efbbe195018'),
    altText: 'Partido de fútbol en un estadio',
  },
  {
    name: 'Congreso de IA y Tecnología 2027',
    slug: 'congreso-ia-tecnologia-2027',
    categorySlug: 'conferencias',
    description:
      'Conferencias sobre inteligencia artificial, desarrollo de software, innovación y transformación digital.',
    startAt: '2027-07-22T08:30:00-05:00',
    endAt: '2027-07-22T17:30:00-05:00',
    venue: 'Centro de Convenciones',
    address: 'Zona empresarial',
    city: 'Valledupar',
    capacity: 400,
    price: 60000,
    imageUrl: image('photo-1540575467063-178a50c2df87'),
    altText: 'Audiencia asistiendo a una conferencia tecnológica',
  },
  {
    name: 'Festival Gastronómico Sabores del Cesar',
    slug: 'sabores-del-cesar-2027',
    categorySlug: 'festivales',
    description:
      'Muestra gastronómica de sabores regionales, cocina tradicional y propuestas de restaurantes locales.',
    startAt: '2027-05-22T11:00:00-05:00',
    endAt: '2027-05-22T20:00:00-05:00',
    venue: 'Plaza Principal',
    address: 'Centro de Valledupar',
    city: 'Valledupar',
    capacity: 700,
    price: 15000,
    imageUrl: image('photo-1517457373958-b7fea7aa7e8e'),
    altText: 'Espacio de encuentro para una feria gastronómica',
  },
  {
    name: 'Fiesta Tropical: Noche Caribe',
    slug: 'fiesta-tropical-noche-caribe-2027',
    categorySlug: 'musica',
    description:
      'Una fiesta con ritmos tropicales, baile y música para disfrutar la noche caribeña.',
    startAt: '2027-08-14T20:00:00-05:00',
    endAt: '2027-08-15T02:00:00-05:00',
    venue: 'Terraza Caribe',
    address: 'Zona de entretenimiento',
    city: 'Valledupar',
    capacity: 500,
    price: 45000,
    imageUrl: image('photo-1514525253161-7a46d19cd819'),
    altText: 'Público bailando durante un evento musical',
  },
  {
    name: 'Expo Videojuegos y Cultura Geek',
    slug: 'expo-videojuegos-cultura-geek-2027',
    categorySlug: 'festivales',
    description:
      'Encuentro de videojuegos, tecnología, cultura geek y entretenimiento para aficionados.',
    startAt: '2027-09-18T10:00:00-05:00',
    endAt: '2027-09-18T19:00:00-05:00',
    venue: 'Pabellón de Exposiciones',
    address: 'Zona urbana',
    city: 'Valledupar',
    capacity: 600,
    price: 25000,
    imageUrl: image('photo-1542751371-adc38448a05e'),
    altText: 'Estación de videojuegos en un evento de gaming',
  },
];

async function main() {
  // Crear o actualizar las seis categorías sin duplicarlas.
  for (const category of categories) {
    await prisma.eventCategory.upsert({
      where: { slug: category.slug },
      create: category,
      update: {
        name: category.name,
        description: category.description,
      },
    });
  }

  // Mantener las cuatro plantillas del proyecto.
  for (const [index, template] of templates.entries()) {
    await prisma.eventTemplate.upsert({
      where: { id: index + 1 },
      create: template,
      update: template,
    });
  }

  const organizer = await prisma.user.findUnique({
    where: { id: 1 },
  });

  if (!organizer) {
    throw new Error('No existe el usuario organizador con ID 1.');
  }

  const template = await prisma.eventTemplate.findUnique({
    where: { id: 3 },
  });

  if (!template) {
    throw new Error('No existe la plantilla Evento libre con ID 3.');
  }

  for (const item of events) {
    const category = await prisma.eventCategory.findUnique({
      where: { slug: item.categorySlug },
    });

    if (!category) {
      throw new Error(
        `No existe la categoría "${item.categorySlug}" para "${item.name}".`,
      );
    }

    const eventData = {
      name: item.name,
      description: item.description,
      capacity: item.capacity,
      organizerId: organizer.id,
      templateId: template.id,
      categoryId: category.id,
      address: item.address,
      city: item.city,
      coverImageUrl: item.imageUrl,
      endAt: new Date(item.endAt),
      slug: item.slug,
      startAt: new Date(item.startAt),
      status: 'PUBLISHED',
      venue: item.venue,
    };

    const event = await prisma.event.upsert({
      where: { slug: item.slug },
      create: eventData,
      update: eventData,
    });

    await prisma.eventConfiguration.upsert({
      where: { eventId: event.id },
      create: {
        eventId: event.id,
        usesZones: false,
        usesSeats: false,
        usesProducts: true,
        usesPromotions: true,
        usesQr: true,
      },
      update: {
        usesZones: false,
        usesSeats: false,
        usesProducts: true,
        usesPromotions: true,
        usesQr: true,
      },
    });

    // publicId es un identificador local de seed, no un ID de Cloudinary.
    const existingImage = await prisma.eventImage.findFirst({
      where: { eventId: event.id, position: 0 },
    });

    if (existingImage) {
      await prisma.eventImage.update({
        where: { id: existingImage.id },
        data: {
          url: item.imageUrl,
          altText: item.altText,
          publicId: `external-seed-${item.slug}`,
        },
      });
    } else {
      await prisma.eventImage.create({
        data: {
          eventId: event.id,
          url: item.imageUrl,
          publicId: `external-seed-${item.slug}`,
          altText: item.altText,
          position: 0,
        },
      });
    }

    const existingTicketType = await prisma.ticketType.findFirst({
      where: {
        eventId: event.id,
        name: 'Entrada general',
      },
    });

    if (!existingTicketType) {
      await prisma.ticketType.create({
        data: {
          eventId: event.id,
          name: 'Entrada general',
          description: `Entrada general para ${item.name}`,
          price: item.price,
          currency: 'COP',
          quantity: item.capacity,
          available: item.capacity,
          status: 'ACTIVE',
        },
      });
    }

    console.log(
      `Evento preparado: ${event.name} (${event.slug}) [${category.name}]`,
    );
  }

  console.log(`Carga finalizada: ${events.length} eventos procesados.`);
}

main()
  .catch((error: unknown) => {
    console.error('Error cargando eventos:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
