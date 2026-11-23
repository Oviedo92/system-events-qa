import { apiRequest } from './api';

export interface PromoterApplicationItem {
  id: number;
  businessName: string;
  documentNumber: string;
  documentUrl?: string | null;
  phone: string;
  description: string;
  rejectionReason?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
  moderator?: {
    id: number;
    name: string;
    email: string;
  } | null;
}

export interface ModeratorCandidate {
  id: number;
  name: string;
  email: string;
  isBusy: boolean;
  currentAssignmentType?: 'PROMOTER_APPLICATION' | 'EVENT' | null;
}

export interface PendingModerationEvent {
  id: number;
  name: string;
  city: string;
  venue: string;
  capacity: number;
  startAt: string;
  coverImageUrl?: string | null;
  status: string;
  organizer: {
    id: number;
    name: string;
    email: string;
  };
  moderator?: {
    id: number;
    name: string;
    email: string;
  } | null;
  category?: { name: string };
  template?: { name: string };
}

export interface ModeratorJobApplication {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  documentNumber: string;
  experience: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

function authHeaders(): HeadersInit {
  const token = sessionStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// 1. Postulaciones públicas / usuario
export async function submitPromoterApplication(payload: {
  businessName: string;
  documentNumber: string;
  documentUrl?: string;
  phone: string;
  description: string;
}) {
  return apiRequest('/promoter-applications', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function submitModeratorJobApplication(payload: {
  fullName: string;
  email: string;
  phone: string;
  documentNumber: string;
  experience: string;
}) {
  return apiRequest('/moderator-applications', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// 2. Cola exclusiva 1:1 del Moderador
export async function getMyAssignedPromoterApplication(): Promise<PromoterApplicationItem | null> {
  return apiRequest<PromoterApplicationItem | null>(
    '/promoter-applications/my-assignment',
    { headers: authHeaders() },
  );
}

export async function reviewAssignedPromoterApplication(
  applicationId: number,
  decision: 'APPROVE' | 'REJECT',
  rejectionReason?: string,
) {
  return apiRequest(`/promoter-applications/${applicationId}/review`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ decision, rejectionReason }),
  });
}

export async function getPendingEventsForModeration(): Promise<PendingModerationEvent[]> {
  return apiRequest<PendingModerationEvent[]>('/events/moderation/pending', {
    headers: authHeaders(),
  });
}

export async function reviewAssignedEvent(
  eventId: number,
  decision: 'APPROVE' | 'REJECT',
  rejectionReason?: string,
) {
  return apiRequest(`/events/${eventId}/review`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ decision, rejectionReason }),
  });
}

// 3. Gestión global y delegación 1:1 del Administrador
export async function getAllPromoterApplications(): Promise<PromoterApplicationItem[]> {
  return apiRequest<PromoterApplicationItem[]>('/promoter-applications', {
    headers: authHeaders(),
  });
}

export async function getModeratorsAvailability(): Promise<ModeratorCandidate[]> {
  return apiRequest<ModeratorCandidate[]>('/users/moderators/availability', {
    headers: authHeaders(),
  });
}

export async function assignModeratorToPromoterApp(
  applicationId: number,
  moderatorId: number,
) {
  return apiRequest(`/promoter-applications/${applicationId}/assign-moderator`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ moderatorId }),
  });
}

export async function assignModeratorToEvent(
  eventId: number,
  moderatorId: number,
) {
  return apiRequest(`/events/${eventId}/assign-moderator`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ moderatorId }),
  });
}

export async function getAllModeratorJobApplications(): Promise<ModeratorJobApplication[]> {
  return apiRequest<ModeratorJobApplication[]>('/moderator-applications', {
    headers: authHeaders(),
  });
}

export async function decideModeratorJobApplication(
  id: number,
  decision: 'APPROVE' | 'REJECT',
) {
  return apiRequest(`/moderator-applications/${id}/review`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ decision }),
  });
}