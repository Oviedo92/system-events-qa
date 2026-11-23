import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileText,
  LogOut,
  PenTool,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import VerifiedBadge from '../../components/common/VerifiedBadge';
import { useAuth } from '../../contexts/auth-context';
import {
  getMyAssignedPromoterApplication,
  getPendingEventsForModeration,
  reviewAssignedEvent,
  reviewAssignedPromoterApplication,
  type PendingModerationEvent,
  type PromoterApplicationItem,
} from '../../services/moderation.service';

type ExtendedPromoterApplication = PromoterApplicationItem & {
  personType?: 'NATURAL' | 'JURIDICAL';
  firstName?: string | null;
  lastName?: string | null;
  documentType?: string;
  nitVerificationDigit?: string | null;
  department?: string | null;
  city?: string | null;
  address?: string | null;
  repLegalFirstName?: string | null;
  repLegalLastName?: string | null;
  repLegalDocType?: string | null;
  repLegalDocNumber?: string | null;
  identityDocPdfUrl?: string | null;
  rutPdfUrl?: string | null;
  chamberCommercePdfUrl?: string | null;
  logoUrl?: string | null;
  digitalSignatureUrl?: string | null;
};

export default function ModeratorDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [assignedApp, setAssignedApp] = useState<ExtendedPromoterApplication | null>(null);
  const [assignedEvent, setAssignedEvent] = useState<PendingModerationEvent | null>(null);
  const [activeDocTab, setActiveDocTab] = useState<'identity' | 'rut' | 'chamber'>('identity');
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function loadAssignedCase(showSpinner = true) {
    if (showSpinner) setLoading(true);
    try {
      const [appResult, eventsResult] = await Promise.all([
        getMyAssignedPromoterApplication().catch(() => null),
        getPendingEventsForModeration().catch(() => [] as PendingModerationEvent[]),
      ]);

      setAssignedApp(appResult as ExtendedPromoterApplication | null);
      setAssignedEvent(eventsResult.length > 0 ? eventsResult[0] : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando asignación 1:1');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      getMyAssignedPromoterApplication().catch(() => null),
      getPendingEventsForModeration().catch(() => [] as PendingModerationEvent[]),
    ])
      .then(([appResult, eventsResult]) => {
        if (!active) return;
        setAssignedApp(appResult as ExtendedPromoterApplication | null);
        setAssignedEvent(eventsResult.length > 0 ? eventsResult[0] : null);
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Error cargando asignación 1:1');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    await signOut();
    navigate('/login', { replace: true });
  }

  async function handleApplicationDecision(decision: 'APPROVE' | 'REJECT') {
    if (!assignedApp) return;
    if (decision === 'REJECT' && !rejectionReason.trim()) {
      setError('Debes escribir el motivo del rechazo antes de continuar.');
      return;
    }

    setProcessing(true);
    setError(null);
    try {
      await reviewAssignedPromoterApplication(
        assignedApp.id,
        decision,
        decision === 'REJECT' ? rejectionReason.trim() : undefined,
      );
      setAssignedApp(null);
      setRejectionReason('');
      setFeedback(
        decision === 'APPROVE'
          ? 'Solicitud aprobada. El organizador recibió su Sello Verificado Azul y tu cupo 1:1 quedó libre.'
          : 'Solicitud rechazada con motivo registrado. Tu cupo 1:1 quedó libre.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar decisión');
    } finally {
      setProcessing(false);
    }
  }

  async function handleEventDecision(decision: 'APPROVE' | 'REJECT') {
    if (!assignedEvent) return;
    if (decision === 'REJECT' && !rejectionReason.trim()) {
      setError('Debes indicar el motivo por el cual rechazas la publicación del evento.');
      return;
    }

    setProcessing(true);
    setError(null);
    try {
      await reviewAssignedEvent(
        assignedEvent.id,
        decision,
        decision === 'REJECT' ? rejectionReason.trim() : undefined,
      );
      setAssignedEvent(null);
      setRejectionReason('');
      setFeedback(
        decision === 'APPROVE'
          ? 'Evento aprobado y publicado automáticamente en cartelera.'
          : 'Evento devuelto al promotor con observaciones.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al auditar el evento');
    } finally {
      setProcessing(false);
    }
  }

  const currentPdfUrl =
    activeDocTab === 'identity'
      ? assignedApp?.identityDocPdfUrl || assignedApp?.documentUrl
      : activeDocTab === 'rut'
        ? assignedApp?.rutPdfUrl
        : assignedApp?.chamberCommercePdfUrl;

  return (
    <section
      data-testid="moderator-dashboard"
      className="min-h-screen bg-[#f7f7fb] px-4 py-8 sm:px-6 lg:px-10"
    >
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col justify-between gap-4 rounded-3xl bg-[#15172b] p-6 text-white shadow-lg sm:flex-row sm:items-center sm:p-8">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 uppercase">
              <ShieldCheck className="h-3.5 w-3.5" /> Cola Exclusiva 1 a 1
            </span>
            <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold">
              Panel de Auditoría y Moderación
              <VerifiedBadge isVerified label="Moderador Certificado EVENTIA" size="md" />
            </h1>
            <p className="text-sm text-slate-300">
              Auditor: <strong>{user?.name}</strong> · Atiendes 1 expediente a la vez.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              data-testid="btn-moderator-refresh"
              onClick={() => void loadAssignedCase()}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/20"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Actualizar
            </button>
            <button
              type="button"
              data-testid="btn-moderator-logout"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/20"
            >
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </button>
          </div>
        </header>

        {error && (
          <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {feedback && (
          <div
            data-testid="moderator-feedback"
            className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl bg-white p-12 text-center text-slate-500">
            Verificando tu asignación 1:1...
          </div>
        ) : assignedApp ? (
          <article
            data-testid="assigned-promoter-application-card"
            className="space-y-6 rounded-3xl border border-[#e8e8f0] bg-white p-6 shadow-sm sm:p-8"
          >
            {/* Encabezado con Logo y Naturaleza Jurídica */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-4">
                {assignedApp.logoUrl ? (
                  <img
                    src={assignedApp.logoUrl}
                    alt={assignedApp.businessName}
                    className="h-14 w-14 rounded-2xl object-cover ring-2 ring-slate-200"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#15172b] text-base font-extrabold text-white">
                    {assignedApp.businessName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <span className="text-xs font-bold tracking-wider text-[#7765f8] uppercase">
                    Auditoría KYC ·{' '}
                    {assignedApp.personType === 'JURIDICAL'
                      ? 'Persona Jurídica'
                      : 'Persona Natural'}
                  </span>
                  <h2 className="mt-0.5 text-xl font-extrabold text-[#15172b]">
                    {assignedApp.businessName}
                  </h2>
                </div>
              </div>
              <span className="rounded-full bg-amber-100 px-3.5 py-1 text-xs font-bold text-amber-800">
                PENDIENTE DE DICTAMEN
              </span>
            </div>

            {/* Datos Legales del Expediente */}
            <div className="grid grid-cols-1 gap-4 rounded-2xl bg-[#f7f7fb] p-5 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500">Titular / Cuenta</p>
                <p className="font-semibold text-[#15172b]">
                  {assignedApp.firstName
                    ? `${assignedApp.firstName} ${assignedApp.lastName ?? ''}`
                    : assignedApp.user.name}
                </p>
                <p className="text-xs text-slate-600">{assignedApp.user.email}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Identificación Tributaria</p>
                <p className="font-semibold text-[#15172b]">
                  {assignedApp.documentType ?? 'DOC'} {assignedApp.documentNumber}
                  {assignedApp.nitVerificationDigit
                    ? `-${assignedApp.nitVerificationDigit}`
                    : ''}
                </p>
                <p className="text-xs text-slate-600">Tel: {assignedApp.phone}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Domicilio Fiscal / Residencia</p>
                <p className="font-semibold text-[#15172b]">
                  {assignedApp.city ?? 'Colombia'}
                  {assignedApp.department ? `, ${assignedApp.department}` : ''}
                </p>
                <p className="text-xs text-slate-600">
                  {assignedApp.address ?? 'Sin dirección registrada'}
                </p>
              </div>

              {assignedApp.personType === 'JURIDICAL' && assignedApp.repLegalFirstName && (
                <div className="rounded-xl border border-slate-200 bg-white p-3 sm:col-span-3">
                  <p className="text-[11px] font-bold text-slate-500 uppercase">
                    Representante Legal Acreditado
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-[#15172b]">
                    {assignedApp.repLegalFirstName} {assignedApp.repLegalLastName} ·{' '}
                    {assignedApp.repLegalDocType} {assignedApp.repLegalDocNumber}
                  </p>
                </div>
              )}

              <div className="sm:col-span-3">
                <p className="text-xs text-slate-500">Descripción de la Productora</p>
                <p className="mt-1 text-slate-700">{assignedApp.description}</p>
              </div>
            </div>

            {/* Visor Embebido de Documentos PDF + Firma Digital */}
            <div
              data-testid="kyc-document-viewer"
              className="space-y-3 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-950 uppercase">
                  <FileText className="h-4 w-4 text-[#7765f8]" />
                  Visor Documental KYC
                </span>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveDocTab('identity')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      activeDocTab === 'identity'
                        ? 'bg-[#7765f8] text-white'
                        : 'bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    1. Cédula Frontal PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDocTab('rut')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      activeDocTab === 'rut'
                        ? 'bg-[#7765f8] text-white'
                        : 'bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    2. RUT DIAN PDF
                  </button>
                  {assignedApp.personType === 'JURIDICAL' && (
                    <button
                      type="button"
                      onClick={() => setActiveDocTab('chamber')}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        activeDocTab === 'chamber'
                          ? 'bg-[#7765f8] text-white'
                          : 'bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      3. Cámara Comercio PDF
                    </button>
                  )}
                </div>
              </div>

              {currentPdfUrl ? (
                <div className="space-y-2">
                  <iframe
                    src={currentPdfUrl}
                    title="Visor PDF KYC"
                    className="h-80 w-full rounded-xl border border-slate-300 bg-white"
                  />
                  <a
                    href={currentPdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#7765f8] hover:underline"
                  >
                    Abrir documento en pestaña nueva <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ) : (
                <p className="rounded-xl bg-white p-4 text-xs text-slate-500">
                  Este documento PDF aún no fue cargado en esta pestaña.
                </p>
              )}

              {assignedApp.digitalSignatureUrl && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 uppercase">
                    <PenTool className="h-3.5 w-3.5 text-[#7765f8]" />
                    Firma Digital del Contrato de Mandato y Ley 1581
                  </p>
                  <img
                    src={assignedApp.digitalSignatureUrl}
                    alt="Firma digital del promotor"
                    className="mt-2 h-20 rounded-lg border border-slate-100 bg-slate-50 object-contain px-3"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Observaciones / Motivo de rechazo (obligatorio si rechazas)
              </label>
              <textarea
                rows={3}
                data-testid="input-moderation-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ej. Documento ilegible o NIT no coincide con razón social..."
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
              />
            </div>

            <div className="flex flex-wrap justify-end gap-3 pt-2">
              <button
                type="button"
                data-testid="btn-reject-application"
                disabled={processing}
                onClick={() => handleApplicationDecision('REJECT')}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-5 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100"
              >
                <XCircle className="h-4 w-4" /> Rechazar Solicitud
              </button>

              <button
                type="button"
                data-testid="btn-approve-application"
                disabled={processing}
                onClick={() => handleApplicationDecision('APPROVE')}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4" /> Aprobar y Otorgar Sello Azul
              </button>
            </div>
          </article>
        ) : assignedEvent ? (
          <article
            data-testid="assigned-event-review-card"
            className="space-y-6 rounded-3xl border border-[#e8e8f0] bg-white p-8 shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold tracking-wider text-[#ff684a] uppercase">
                  Auditoría de Evento (1:1) · {assignedEvent.category?.name}
                </span>
                <h2 className="mt-1 text-xl font-bold text-[#15172b]">
                  {assignedEvent.name}
                </h2>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                EN REVISIÓN
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 rounded-2xl bg-[#f7f7fb] p-5 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500">Organizador</p>
                <p className="font-semibold text-[#15172b]">{assignedEvent.organizer.name}</p>
                <p className="text-xs text-slate-600">{assignedEvent.organizer.email}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Ubicación y Aforo</p>
                <p className="font-semibold text-[#15172b]">
                  {assignedEvent.city} — {assignedEvent.venue}
                </p>
                <p className="text-xs text-slate-600">Capacidad: {assignedEvent.capacity} asistentes</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Motivo de rechazo (si no cumple políticas)
              </label>
              <textarea
                rows={3}
                data-testid="input-event-moderation-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                data-testid="btn-reject-event"
                disabled={processing}
                onClick={() => handleEventDecision('REJECT')}
                className="rounded-xl border border-rose-300 bg-rose-50 px-5 py-2.5 text-sm font-semibold text-rose-700"
              >
                Rechazar Evento
              </button>
              <button
                type="button"
                data-testid="btn-approve-event"
                disabled={processing}
                onClick={() => handleEventDecision('APPROVE')}
                className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white"
              >
                Aprobar y Publicar Evento
              </button>
            </div>
          </article>
        ) : (
          <div
            data-testid="moderator-empty-assignment"
            className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center"
          >
            <ShieldCheck className="mx-auto h-10 w-10 text-emerald-500" />
            <h2 className="mt-3 text-lg font-bold text-[#15172b]">
              Sin casos asignados actualmente
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Tu estado es <strong>Disponible</strong>. Cuando el Administrador te delegue una solicitud de promotor o un evento (1:1), aparecerá aquí automáticamente.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}