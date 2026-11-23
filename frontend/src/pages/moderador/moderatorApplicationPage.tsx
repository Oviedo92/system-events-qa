import { useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  FileCheck2,
  FileText,
  ImagePlus,
  ShieldCheck,
} from 'lucide-react';

import DigitalSignaturePad from '../../components/kyc/DigitalSignaturePad';
import {
  uploadDigitalSignature,
  uploadKycDocument,
} from '../../services/uploads.service';
import { COLOMBIA_LOCATIONS } from '../../utils/colombiaKyc';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function ModeratorApplicationPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [documentType, setDocumentType] = useState<'CC' | 'CE' | 'PASAPORTE'>('CC');
  const [documentNumber, setDocumentNumber] = useState('');
  const [department, setDepartment] = useState('Cesar');
  const [city, setCity] = useState('Valledupar');
  const [address, setAddress] = useState('');
  const [yearsExperience, setYearsExperience] = useState(2);
  const [previousEventsSummary, setPreviousEventsSummary] = useState('');

  const [photoUrl, setPhotoUrl] = useState('');
  const [identityDocPdfUrl, setIdentityDocPdfUrl] = useState('');
  const [experienceCertPdfUrl, setExperienceCertPdfUrl] = useState('');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function handleFile(
    file: File | undefined,
    kind: 'photo' | 'identity' | 'experience',
  ) {
    if (!file) return;
    setError('');
    try {
      const uploaded = await uploadKycDocument(
        file,
        kind === 'photo' ? 'image' : 'pdf',
      );
      if (kind === 'photo') setPhotoUrl(uploaded.url);
      if (kind === 'identity') setIdentityDocPdfUrl(uploaded.url);
      if (kind === 'experience') setExperienceCertPdfUrl(uploaded.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir archivo.');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!identityDocPdfUrl || !experienceCertPdfUrl) {
      setError('Debes adjuntar tu cédula frontal (PDF) y tu certificado o hoja de vida (PDF).');
      return;
    }
    if (!signatureDataUrl) {
      setError('Debes firmar el Acuerdo de Confidencialidad e Imparcialidad.');
      return;
    }

    setSubmitting(true);
    try {
      const digitalSignatureUrl = await uploadDigitalSignature(signatureDataUrl);
      const res = await fetch(`${API_BASE}/moderator-applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          documentType,
          documentNumber: documentNumber.trim(),
          department,
          city,
          address: address.trim(),
          yearsExperience: Number(yearsExperience),
          previousEventsSummary: previousEventsSummary.trim(),
          photoUrl: photoUrl || undefined,
          identityDocPdfUrl,
          experienceCertPdfUrl,
          digitalSignatureUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'No se pudo enviar la postulación.');
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar postulación.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <section
        data-testid="moderator-application-success"
        className="mx-auto my-12 max-w-xl rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-lg"
      >
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <h1 className="mt-4 text-2xl font-extrabold text-[#15172b]">
          Postulación Recibida
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          El Administrador auditará tu hoja de vida, cédula y experiencia en eventos para habilitar tu cuenta oficial de Moderador.
        </p>
      </section>
    );
  }

  return (
    <section
      data-testid="moderator-application-page"
      className="mx-auto my-8 max-w-3xl px-4"
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-sky-600 uppercase">
          <ShieldCheck className="h-4 w-4" />
          Trabaja con Nosotros · Equipo de Auditoría y Control
        </div>
        <h1 className="mt-1 text-2xl font-extrabold text-[#15172b]">
          Postulación a Moderador Oficial EVENTIA
        </h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input
              required
              data-testid="input-mod-firstname"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Nombres *"
              className="rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
            <input
              required
              data-testid="input-mod-lastname"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Apellidos *"
              className="rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input
              required
              type="email"
              data-testid="input-mod-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Correo electrónico *"
              className="rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
            <input
              required
              type="tel"
              data-testid="input-mod-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Teléfono móvil / WhatsApp *"
              className="rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <select
              value={documentType}
              onChange={(e) =>
                setDocumentType(e.target.value as 'CC' | 'CE' | 'PASAPORTE')
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
            >
              <option value="CC">Cédula (CC)</option>
              <option value="CE">Extranjería (CE)</option>
              <option value="PASAPORTE">Pasaporte</option>
            </select>
            <input
              required
              data-testid="input-mod-docnumber"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              placeholder="Número de documento *"
              className="rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
            <input
              required
              type="number"
              min={0}
              data-testid="input-mod-years"
              value={yearsExperience}
              onChange={(e) => setYearsExperience(Number(e.target.value))}
              placeholder="Años de experiencia *"
              className="rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <select
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                setCity(COLOMBIA_LOCATIONS[e.target.value]?.[0] ?? '');
              }}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
            >
              {Object.keys(COLOMBIA_LOCATIONS).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
            >
              {(COLOMBIA_LOCATIONS[department] ?? ['Valledupar']).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Dirección de residencia *"
              className="rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
          </div>

          <textarea
            required
            rows={3}
            minLength={20}
            data-testid="input-mod-experience"
            value={previousEventsSummary}
            onChange={(e) => setPreviousEventsSummary(e.target.value)}
            placeholder="Describe festivales, conciertos, teatros o plataformas donde hayas auditado o coordinado logística..."
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="rounded-2xl border border-dashed border-slate-300 p-3 text-xs">
              <span className="flex items-center gap-1.5 font-bold">
                <ImagePlus className="h-4 w-4 text-sky-500" /> Foto Perfil (JPG/PNG)
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => void handleFile(e.target.files?.[0], 'photo')}
                className="mt-2 w-full"
              />
            </label>

            <label className="rounded-2xl border border-dashed border-slate-300 p-3 text-xs">
              <span className="flex items-center gap-1.5 font-bold">
                <FileText className="h-4 w-4 text-[#ff684a]" /> Cédula Frontal (PDF) *
              </span>
              <input
                type="file"
                accept="application/pdf"
                data-testid="file-mod-identity-pdf"
                onChange={(e) => void handleFile(e.target.files?.[0], 'identity')}
                className="mt-2 w-full"
              />
            </label>

            <label className="rounded-2xl border border-dashed border-slate-300 p-3 text-xs">
              <span className="flex items-center gap-1.5 font-bold">
                <FileCheck2 className="h-4 w-4 text-[#7765f8]" /> Hoja de Vida / Cert. (PDF) *
              </span>
              <input
                type="file"
                accept="application/pdf"
                data-testid="file-mod-experience-pdf"
                onChange={(e) => void handleFile(e.target.files?.[0], 'experience')}
                className="mt-2 w-full"
              />
            </label>
          </div>

          <DigitalSignaturePad onSignatureChange={setSignatureDataUrl} />

          {error && (
            <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            data-testid="btn-submit-moderator-app"
            disabled={submitting}
            className="w-full rounded-xl bg-[#15172b] py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? 'Enviando postulación...' : 'Postularme como Moderador'}
          </button>
        </form>
      </div>
    </section>
  );
}