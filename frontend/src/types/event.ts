
export interface EventCatalogItem {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  capacity: number;
  city: string;
  venue: string;
  address: string | null;
  coverImageUrl: string | null;
  startAt: string;
  endAt: string;
  status: string;
  minPrice: number | null;
  availability: EventAvailability;
}

export type EventSalesStatus =
  | 'UPCOMING'
  | 'ON_SALE'
  | 'SOLD_OUT'
  | 'CANCELLED'
  | 'POSTPONED';

export interface EventZoneAvailability {
  zoneId: string;
  name: string;
  capacity: number;
  soldTickets: number;
  availableTickets: number;
  status: 'AVAILABLE' | 'LOW_AVAILABILITY' | 'SOLD_OUT';
}

export interface EventAvailability {
  eventId: number;
  capacity: number;
  soldTickets: number;
  reservedTickets: number;
  availableTickets: number;
  occupancyPercentage: number;
  salesStatus: EventSalesStatus;
  zones: EventZoneAvailability[];
}
