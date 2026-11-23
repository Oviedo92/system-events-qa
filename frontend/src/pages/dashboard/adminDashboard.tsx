import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  LogOut,
  Shield,
  UserCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '../../contexts/auth-context';
import {
  assignModeratorToEvent,
  assignModeratorToPromoterApp,
  decideModeratorJobApplication,
  getAllModeratorJobApplications,
  getAllPromoterApplications,
  getModeratorsAvailability,
  getPendingEventsForModeration,
  type ModeratorCandidate,
  type ModeratorJobApplication,
  type PendingModerationEvent,
  type PromoterApplicationItem,
} from '../../services/moderation.service';

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<'PROMOTERS' | 'EVENTS' | 'MOD_JOBS'>('PROMOTERS');
  const [promoterApps, setPromoterApps] = useState<PromoterApplicationItem[]>([]);
  const [pendingEvents, setPendingEvents] = useState<PendingModerationEvent[]>([]);
  const [modJobs, setModJobs] = useState<ModeratorJobApplication[]>([]);
  const [moderators, setModerators] = useState<ModeratorCandidate[]>([]);
  const [selectedModByItem, setSelectedModByItem] = useState<Record<number, number>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refreshAll() {
    const [apps, evs, jobs, mods] = await Promise.all([
      getAllPromoterApplications().catch(() => [] as PromoterApplicationItem[]),
      getPendingEventsForModeration().catch(() => [] as PendingModerationEvent[]),
      getAllModeratorJobApplications().catch(() => [] as ModeratorJobApplication[]),
      getModeratorsAvailability().catch(() => [] as ModeratorCandidate[]),
    ]);
    setPromoterApps(apps);
    setPendingEvents(evs);
    setModJobs(jobs);
    setModerators(mods);
  }

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const [apps, evs, jobs, mods] = await Promise.all([
        getAllPromoterApplications().catch(() => [] as PromoterApplicationItem[]),
        getPendingEventsForModeration().catch(() => [] as PendingModerationEvent[]),
        getAllModeratorJobApplications().catch(() => [] as ModeratorJobApplication[]),
        getModeratorsAvailability().catch(() => [] as ModeratorCandidate[]),
      ]);
      if (!cancelled) {
        setPromoterApps(apps);
        setPendingEvents(evs);
        setModJobs(jobs);
        setModerators(mods);
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  const availableModerators = moderators.filter((m) => !m.isBusy);

  async function handleAssignPromoterApp(appId: number) {
    const modId = selectedModByItem[appId] ?? availableModerators[0]?.id;
    if (!modId) {
      setError('No hay moderadores disponibles en este momento (todos están en atención 1:1).');
      return;
    }
    setError(null);
    try {
      await assignModeratorToPromoterApp(appId, modId);
      setFeedback(`Solicitud #${appId} delegada en exclusiva (1:1) al moderador #${modId}.`);
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error delegando solicitud');
    }
  }

  async function handleAssignEvent(eventId: number) {
    const modId = selectedModByItem[eventId] ?? availableModerators[0]?.id;
    if (!modId) {
      setError('No hay moderadores disponibles en este momento.');
      return;
    }
    setError(null);
    try {
      await assignModeratorToEvent(eventId, modId);
      setFeedback(`Evento #${eventId} delegado en exclusiva (1:1) al moderador #${modId}.`);
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error delegando evento');
    }
  }

  async function handleModJobDecision(jobId: number, decision: 'APPROVE' | 'REJECT') {
    setError(null);
    try {
      await decideModeratorJobApplication(jobId, decision);
      setFeedback(
        decision === 'APPROVE'
          ? 'Aspirante aprobado y habilitado con rol MODERATOR.'
          : 'Postulación rechazada.',
      );
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error procesando postulación');
    }
  }

  async function handleLogout() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <section
      data-testid="admin-dashboard"
      className="min-h-screen bg-[#f7f7fb] px-4 py-8 sm:px-6 lg:px-10"
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col justify-between gap-4 rounded-3xl bg-[#15172b] p-6 text-white shadow-lg sm:flex-row sm:items-center sm:p-8">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#7765f8]/30 px-3 py-1 text-xs font-semibold text-[#d2cbff] uppercase">
              <Shield className="h-3.5 w-3.5" /> Torre de Control EVENTIA
            </span>
            <h1 className="mt-2 text-2xl font-bold">Administración Central</h1>
            <p className="text-sm text-slate-300">
              Admin: <strong>{user?.name}</strong> · Moderadores libres para asignación 1:1:{' '}
              <strong>
                {availableModerators.length} / {moderators.length}
              </strong>
            </p>
          </div>

          <button
            type="button"
            data-testid="btn-admin-logout"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/20"
          >
            <LogOut className="h-4 w-4" /> Salir
          </button>
        </header>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {error}
          </div>
        )}
        {feedback && (
          <div
            data-testid="admin-feedback"
            className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Pestañas de gestión */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="tab-admin-promoters"
            onClick={() => setTab('PROMOTERS')}
            className={`rounded-2xl px-4 py-2.5 text-xs font-semibold transition ${
              tab === 'PROMOTERS'
                ? 'bg-[#15172b] text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            Solicitudes de Promotor ({promoterApps.filter((a) => a.status === 'PENDING').length})
          </button>

          <button
            type="button"
            data-testid="tab-admin-events"
            onClick={() => setTab('EVENTS')}
            className={`rounded-2xl px-4 py-2.5 text-xs font-semibold transition ${
              tab === 'EVENTS'
                ? 'bg-[#15172b] text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            Eventos Pendientes de Revisión ({pendingEvents.length})
          </button>

          <button
            type="button"
            data-testid="tab-admin-mod-jobs"
            onClick={() => setTab('MOD_JOBS')}
            className={`rounded-2xl px-4 py-2.5 text-xs font-semibold transition ${
              tab === 'MOD_JOBS'
                ? 'bg-[#15172b] text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            Aspirantes a Moderador ({modJobs.filter((j) => j.status === 'PENDING').length})
          </button>
        </div>

        {/* PESTAÑA 1: SOLICITUDES DE PROMOTOR -> DELEGACIÓN 1:1 */}
        {tab === 'PROMOTERS' && (
          <div className="space-y-4">
            {promoterApps.length === 0 ? (
              <div className="rounded-3xl bg-white p-10 text-center text-sm text-slate-500">
                No hay solicitudes de promotor registradas.
              </div>
            ) : (
              promoterApps.map((app) => (
                <div
                  key={app.id}
                  data-testid={`admin-promoter-app-${app.id}`}
                  className="flex flex-col justify-between gap-4 rounded-3xl border border-[#e8e8f0] bg-white p-6 shadow-sm sm:flex-row sm:items-center"
                >
                  <div>
                    <span className="text-xs font-bold text-[#7765f8] uppercase">
                      {app.status} · NIT {app.documentNumber}
                    </span>
                    <h3 className="text-lg font-bold text-[#15172b]">{app.businessName}</h3>
                    <p className="text-xs text-slate-500">
                      Solicitante: {app.user.name} ({app.user.email}) · Tel: {app.phone}
                    </p>
                  </div>

                  {app.status === 'PENDING' && (
                    <div className="flex flex-wrap items-center gap-2">
                      {app.moderator ? (
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-800">
                          <UserCheck className="h-4 w-4" /> Asignado 1:1 a {app.moderator.name}
                        </span>
                      ) : (
                        <>
                          <select
                            data-testid={`select-mod-for-app-${app.id}`}
                            value={selectedModByItem[app.id] ?? availableModerators[0]?.id ?? ''}
                            onChange={(e) =>
                              setSelectedModByItem({
                                ...selectedModByItem,
                                [app.id]: Number(e.target.value),
                              })
                            }
                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                          >
                            {availableModerators.length === 0 ? (
                              <option value="">Sin moderadores libres</option>
                            ) : (
                              availableModerators.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name} (Disponible)
                                </option>
                              ))
                            )}
                          </select>

                          <button
                            type="button"
                            data-testid={`btn-assign-mod-app-${app.id}`}
                            disabled={availableModerators.length === 0}
                            onClick={() => handleAssignPromoterApp(app.id)}
                            className="rounded-xl bg-[#ff684a] px-4 py-2 text-xs font-semibold text-white hover:bg-[#f25536] disabled:opacity-50"
                          >
                            Delegar 1:1
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* PESTAÑA 2: EVENTOS EN REVISIÓN -> DELEGACIÓN 1:1 */}
        {tab === 'EVENTS' && (
          <div className="space-y-4">
            {pendingEvents.length === 0 ? (
              <div className="rounded-3xl bg-white p-10 text-center text-sm text-slate-500">
                No hay eventos pendientes de auditoría.
              </div>
            ) : (
              pendingEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex flex-col justify-between gap-4 rounded-3xl border border-[#e8e8f0] bg-white p-6 shadow-sm sm:flex-row sm:items-center"
                >
                  <div>
                    <span className="text-xs font-bold text-[#ff684a] uppercase">
                      {ev.city} · {ev.venue}
                    </span>
                    <h3 className="text-lg font-bold text-[#15172b]">{ev.name}</h3>
                    <p className="text-xs text-slate-500">
                      Promotor: {ev.organizer.name} · Aforo: {ev.capacity}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {ev.moderator ? (
                      <span className="rounded-xl bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-800">
                        En revisión 1:1 por {ev.moderator.name}
                      </span>
                    ) : (
                      <>
                        <select
                          value={selectedModByItem[ev.id] ?? availableModerators[0]?.id ?? ''}
                          onChange={(e) =>
                            setSelectedModByItem({
                              ...selectedModByItem,
                              [ev.id]: Number(e.target.value),
                            })
                          }
                          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                        >
                          {availableModerators.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} (Disponible)
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={availableModerators.length === 0}
                          onClick={() => handleAssignEvent(ev.id)}
                          className="rounded-xl bg-[#7765f8] px-4 py-2 text-xs font-semibold text-white"
                        >
                          Asignar Moderador 1:1
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* PESTAÑA 3: ASPIRANTES A MODERADOR ("TRABAJA CON NOSOTROS") */}
        {tab === 'MOD_JOBS' && (
          <div className="space-y-4">
            {modJobs.length === 0 ? (
              <div className="rounded-3xl bg-white p-10 text-center text-sm text-slate-500">
                No hay hojas de vida de aspirantes a moderador aún.
              </div>
            ) : (
              modJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex flex-col justify-between gap-4 rounded-3xl border border-[#e8e8f0] bg-white p-6 shadow-sm sm:flex-row sm:items-center"
                >
                  <div>
                    <span className="text-xs font-bold text-emerald-700 uppercase">
                      {job.status} · Doc: {job.documentNumber}
                    </span>
                    <h3 className="text-lg font-bold text-[#15172b]">{job.fullName}</h3>
                    <p className="text-xs text-slate-500">
                      {job.email} · {job.phone}
                    </p>
                    <p className="mt-1 text-xs text-slate-700">{job.experience}</p>
                  </div>

                  {job.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleModJobDecision(job.id, 'REJECT')}
                        className="rounded-xl border border-rose-300 px-3.5 py-2 text-xs font-semibold text-rose-700"
                      >
                        Rechazar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleModJobDecision(job.id, 'APPROVE')}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
                      >
                        <Users className="h-3.5 w-3.5" /> Aprobar como Moderador
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </section>
  );
}