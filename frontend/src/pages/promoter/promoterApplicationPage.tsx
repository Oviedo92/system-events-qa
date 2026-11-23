import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  AtSign,
  Building2,
  Clock,
  FileCheck2,
  FileText,
  Globe,
  ImagePlus,
  Phone,
  User,
  XCircle,
} from 'lucide-react';

import VerifiedBadge from '../../components/common/VerifiedBadge';
import DigitalSignaturePad from '../../components/kyc/DigitalSignaturePad';
import { useAuth } from '../../contexts/auth-context';
import { apiRequest } from '../../services/api';
import {
  uploadDigitalSignature,
  uploadKycDocument,
} from '../../services/uploads.service';
import {
  calculateColombianNitDv,
  COLOMBIA_LOCATIONS,
} from '../../utils/colombiaKyc';
import { register } from '../../services/auth.service';

type MyPromoterApplicationResponse = {
  status: string;
  rejectionReason?: string | null;
  personType?: 'NATURAL' | 'JURIDICAL';
  businessName?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  documentType?: 'CC' | 'CE' | 'PASAPORTE' | 'NIT';
  documentNumber?: string;
  department?: string;
  city?: string;
  address?: string;
  identityDocPdfUrl?: string;
  rutPdfUrl?: string;
  chamberCommercePdfUrl?: string;
  logoUrl?: string;
  description?: string;
  supportEmail?: string;
  supportPhone?: string;
  instagramUrl?: string;
};

export default function PromoterApplicationPage() {
  const { isAuthenticated, signIn } = useAuth();

  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');

  const [personType, setPersonType] = useState<'NATURAL' | 'JURIDICAL'>('NATURAL');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');

  // Persona Natural
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [documentType, setDocumentType] = useState<'CC' | 'CE' | 'PASAPORTE' | 'NIT'>('CC');
  const [documentNumber, setDocumentNumber] = useState('');
  const [documentIssueDate, setDocumentIssueDate] = useState('');
  const [birthDate, setBirthDate] = useState('');

  // Ubicación
  const [department, setDepartment] = useState('Cesar');
  const [city, setCity] = useState('Valledupar');
  const [address, setAddress] = useState('');

  // Persona Jurídica (Representante Legal)
  const [repLegalFirstName, setRepLegalFirstName] = useState('');
  const [repLegalLastName, setRepLegalLastName] = useState('');
  const [repLegalDocType, setRepLegalDocType] = useState<'CC' | 'CE' | 'PASAPORTE'>('CC');
  const [repLegalDocNumber, setRepLegalDocNumber] = useState('');
  const [repLegalDocIssueDate, setRepLegalDocIssueDate] = useState('');

  // URLs de Documentos y Logo subidos
  const [identityDocPdfUrl, setIdentityDocPdfUrl] = useState('');
  const [rutPdfUrl, setRutPdfUrl] = useState('');
  const [chamberCommercePdfUrl, setChamberCommercePdfUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  // Perfil Público y Redes
  const [description, setDescription] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  // Estado del expediente
  const [existingStatus, setExistingStatus] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const nitVerificationDigit = useMemo(
    () => (personType === 'JURIDICAL' ? calculateColombianNitDv(documentNumber) : ''),
    [personType, documentNumber],
  );

  const availableCities = useMemo(
    () => COLOMBIA_LOCATIONS[department] ?? ['Valledupar'],
    [department],
  );

  useEffect(() => {
    if (!isAuthenticated) return;

    apiRequest<MyPromoterApplicationResponse | null>('/promoter-applications/me')
      .then((app) => {
        if (!app) return;
        setExistingStatus(app.status);
        setRejectionReason(app.rejectionReason ?? null);
        if (app.personType) setPersonType(app.personType);
        if (app.businessName) setBusinessName(app.businessName);
        if (app.phone) setPhone(app.phone);
        if (app.firstName) setFirstName(app.firstName);
        if (app.lastName) setLastName(app.lastName);
        if (app.documentType) setDocumentType(app.documentType);
        if (app.documentNumber && app.documentNumber !== 'PENDIENTE') {
          setDocumentNumber(app.documentNumber);
        }
        if (app.department) setDepartment(app.department);
        if (app.city) setCity(app.city);
        if (app.address) setAddress(app.address);
        if (app.identityDocPdfUrl) setIdentityDocPdfUrl(app.identityDocPdfUrl);
        if (app.rutPdfUrl) setRutPdfUrl(app.rutPdfUrl);
        if (app.chamberCommercePdfUrl) setChamberCommercePdfUrl(app.chamberCommercePdfUrl);
        if (app.logoUrl) setLogoUrl(app.logoUrl);
        if (app.description) setDescription(app.description);
        if (app.supportEmail) setSupportEmail(app.supportEmail);
        if (app.supportPhone) setSupportPhone(app.supportPhone);
        if (app.instagramUrl) setInstagramUrl(app.instagramUrl);
      })
      .catch(() => {});
  }, [isAuthenticated]);

  async function handleFileUpload(
    file: File | undefined,
    field: 'identity' | 'rut' | 'chamber' | 'logo',
  ) {
    if (!file) return;
    setError('');
    setUploadingField(field);
    try {
      const uploaded = await uploadKycDocument(
        file,
        field === 'logo' ? 'image' : 'pdf',
      );
      if (field === 'identity') setIdentityDocPdfUrl(uploaded.url);
      if (field === 'rut') setRutPdfUrl(uploaded.url);
      if (field === 'chamber') setChamberCommercePdfUrl(uploaded.url);
      if (field === 'logo') setLogoUrl(uploaded.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error subiendo archivo.');
    } finally {
      setUploadingField(null);
    }
  }

  async function handleSubmitKyc(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!isAuthenticated) {
      if (!accountEmail.trim() || accountPassword.length < 8) {
        setError(
          'Ingresa un correo electrónico y una contraseña (mínimo 8 caracteres) para crear tu cuenta de promotor.',
        );
        return;
      }
    }

    if (
      !businessName.trim() ||
      !documentNumber.trim() ||
      !address.trim() ||
      !phone.trim() ||
      !description.trim()
    ) {
      setError(
        'Completa todos los campos obligatorios: Razón Social/Marca, Documento/NIT, Dirección, Teléfono y Biografía.',
      );
      return;
    }

    if (
      personType === 'NATURAL' &&
      (!firstName.trim() || !lastName.trim() || !birthDate || !documentIssueDate)
    ) {
      setError(
        'Para Persona Natural debes completar Nombres, Apellidos, Fecha de Nacimiento y Fecha de Expedición.',
      );
      return;
    }

    if (
      personType === 'JURIDICAL' &&
      (!repLegalFirstName.trim() || !repLegalLastName.trim() || !repLegalDocNumber.trim())
    ) {
      setError(
        'Para Persona Jurídica debes completar Nombres, Apellidos y Documento del Representante Legal.',
      );
      return;
    }

    if (!identityDocPdfUrl || !rutPdfUrl) {
      setError('Debes adjuntar el documento de identidad frontal (PDF) y el RUT (PDF).');
      return;
    }

    if (personType === 'JURIDICAL' && !chamberCommercePdfUrl) {
      setError('Para Persona Jurídica es obligatorio adjuntar la Cámara de Comercio (PDF).');
      return;
    }

    if (!signatureDataUrl) {
      setError('Debes firmar digitalmente el Contrato de Mandato y Ley 1581.');
      return;
    }

    setSubmitting(true);
    try {
      const digitalSignatureUrl = await uploadDigitalSignature(signatureDataUrl);

      if (!isAuthenticated) {
        await register(businessName.trim(), accountEmail.trim(), accountPassword);
        await signIn(accountEmail.trim(), accountPassword);
      }

      await apiRequest('/promoter-applications', {
        method: 'POST',
        body: JSON.stringify({
          personType,
          kycStepCompleted: 2,
          businessName: businessName.trim(),
          phone: phone.trim(),
          firstName: personType === 'NATURAL' ? firstName.trim() : undefined,
          lastName: personType === 'NATURAL' ? lastName.trim() : undefined,
          documentType: personType === 'JURIDICAL' ? 'NIT' : documentType,
          documentNumber: documentNumber.trim(),
          nitVerificationDigit: nitVerificationDigit || undefined,
          documentIssueDate:
            personType === 'NATURAL' && documentIssueDate ? documentIssueDate : undefined,
          birthDate: personType === 'NATURAL' && birthDate ? birthDate : undefined,
          department,
          city,
          address: address.trim(),
          repLegalFirstName:
            personType === 'JURIDICAL' ? repLegalFirstName.trim() : undefined,
          repLegalLastName:
            personType === 'JURIDICAL' ? repLegalLastName.trim() : undefined,
          repLegalDocType: personType === 'JURIDICAL' ? repLegalDocType : undefined,
          repLegalDocNumber:
            personType === 'JURIDICAL' ? repLegalDocNumber.trim() : undefined,
          repLegalDocIssueDate:
            personType === 'JURIDICAL' && repLegalDocIssueDate
              ? repLegalDocIssueDate
              : undefined,
          identityDocPdfUrl,
          rutPdfUrl,
          chamberCommercePdfUrl:
            personType === 'JURIDICAL' ? chamberCommercePdfUrl : undefined,
          logoUrl: logoUrl || undefined,
          digitalSignatureUrl,
          description: description.trim(),
          supportEmail: supportEmail.trim() || undefined,
          supportPhone: supportPhone.trim() || undefined,
          instagramUrl: instagramUrl.trim() || undefined,
          tiktokUrl: tiktokUrl.trim() || undefined,
          websiteUrl: websiteUrl.trim() || undefined,
        }),
      });

      setExistingStatus('PENDING');
      setSuccessMsg(
        'Expediente KYC enviado correctamente. Un moderador auditará tus documentos en exclusiva (1:1).',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar el formulario KYC.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      data-testid="promoter-kyc-page"
      className="mx-auto max-w-6xl px-4 py-8 sm:px-6"
    >
      {!isAuthenticated && (
        <div className="mb-6 space-y-4 rounded-3xl border border-indigo-200 bg-indigo-50/50 p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-extrabold text-[#15172b]">
              0. Crea tu Cuenta de Acceso (o{' '}
              <Link to="/login" className="text-[#5b46e8] underline">
                inicia sesión aquí
              </Link>
              )
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="kyc-account-email"
                className="block text-xs font-semibold text-slate-700"
              >
                Correo electrónico *
              </label>
              <input
                id="kyc-account-email"
                type="email"
                data-testid="input-kyc-email"
                value={accountEmail}
                onChange={(e) => setAccountEmail(e.target.value)}
                placeholder="productora@ejemplo.com"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="kyc-account-password"
                className="block text-xs font-semibold text-slate-700"
              >
                Contraseña (mínimo 8 caracteres) *
              </label>
              <input
                id="kyc-account-password"
                type="password"
                data-testid="input-kyc-password"
                value={accountPassword}
                onChange={(e) => setAccountPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold tracking-wider text-[#5b46e8] uppercase">
            Fase 2 · Verificación de Identidad y Facturación (KYC Colombia)
          </span>
          <h1 className="mt-1 text-2xl font-extrabold text-[#15172b] sm:text-3xl">
            Expediente Legal del Promotor
          </h1>
        </div>

        {existingStatus && (
          <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold shadow-2xs">
            {existingStatus === 'APPROVED' ? (
              <>
                <VerifiedBadge isVerified size="md" />
                <span className="text-emerald-700">Verificado Oficialmente</span>
              </>
            ) : existingStatus === 'REJECTED' ? (
              <>
                <XCircle className="h-4 w-4 text-rose-600" />
                <span className="text-rose-700">Rechazado — Corrige y reenvía</span>
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 text-amber-600" />
                <span className="text-amber-800">En Auditoría 1:1</span>
              </>
            )}
          </div>
        )}
      </div>

      {rejectionReason && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          <strong>Observación del Moderador:</strong> {rejectionReason}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <form noValidate onSubmit={handleSubmitKyc} className="space-y-6 lg:col-span-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-sm font-extrabold text-[#15172b]">
              1. Naturaleza Jurídica del Organizador
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                data-testid="btn-kyc-natural"
                onClick={() => {
                  setPersonType('NATURAL');
                  setDocumentType('CC');
                }}
                className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                  personType === 'NATURAL'
                    ? 'border-[#5b46e8] bg-[#5b46e8]/5'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <User className="h-5 w-5 text-[#5b46e8]" />
                <div>
                  <p className="text-xs font-bold text-[#15172b]">Persona Natural</p>
                  <p className="text-[11px] text-slate-600">
                    Organizador independiente (CC / CE + RUT)
                  </p>
                </div>
              </button>

              <button
                type="button"
                data-testid="btn-kyc-juridical"
                onClick={() => {
                  setPersonType('JURIDICAL');
                  setDocumentType('NIT');
                }}
                className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                  personType === 'JURIDICAL'
                    ? 'border-[#5b46e8] bg-[#5b46e8]/5'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Building2 className="h-5 w-5 text-[#c93b2b]" />
                <div>
                  <p className="text-xs font-bold text-[#15172b]">Persona Jurídica</p>
                  <p className="text-[11px] text-slate-600">
                    Empresa / Productora (NIT + Cámara de Comercio)
                  </p>
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-sm font-extrabold text-[#15172b]">
              2. Datos de Identificación y Tributarios
            </h2>

            {personType === 'NATURAL' ? (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="kyc-firstname"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Nombres *
                    </label>
                    <input
                      id="kyc-firstname"
                      required
                      data-testid="input-kyc-firstname"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="kyc-lastname"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Apellidos *
                    </label>
                    <input
                      id="kyc-lastname"
                      required
                      data-testid="input-kyc-lastname"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label
                      htmlFor="kyc-doctype"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Tipo Documento *
                    </label>
                    <select
                      id="kyc-doctype"
                      data-testid="select-kyc-doctype"
                      value={documentType}
                      onChange={(e) =>
                        setDocumentType(e.target.value as 'CC' | 'CE' | 'PASAPORTE')
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="CC">Cédula de Ciudadanía (CC)</option>
                      <option value="CE">Cédula de Extranjería (CE)</option>
                      <option value="PASAPORTE">Pasaporte</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="kyc-docnumber"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Número Documento *
                    </label>
                    <input
                      id="kyc-docnumber"
                      required
                      data-testid="input-kyc-docnumber"
                      value={documentNumber}
                      onChange={(e) => setDocumentNumber(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="kyc-issuedate"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Fecha Expedición Doc. *
                    </label>
                    <input
                      id="kyc-issuedate"
                      required
                      type="date"
                      data-testid="input-kyc-issuedate"
                      value={documentIssueDate}
                      onChange={(e) => setDocumentIssueDate(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="kyc-birthdate"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Fecha de Nacimiento (Mayor de 18 años) *
                    </label>
                    <input
                      id="kyc-birthdate"
                      required
                      type="date"
                      data-testid="input-kyc-birthdate"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="kyc-businessname"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Nombre Comercial / Marca *
                    </label>
                    <input
                      id="kyc-businessname"
                      required
                      data-testid="input-kyc-businessname"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                  <div className="sm:col-span-6">
                    <label
                      htmlFor="kyc-razonsocial"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Razón Social (Nombre Legal en RUT) *
                    </label>
                    <input
                      id="kyc-razonsocial"
                      required
                      data-testid="input-kyc-razonsocial"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Ej. Producciones Vallenatas S.A.S."
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label
                      htmlFor="kyc-nit"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      NIT (sin puntos ni guión) *
                    </label>
                    <input
                      id="kyc-nit"
                      required
                      data-testid="input-kyc-nit"
                      value={documentNumber}
                      onChange={(e) => setDocumentNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="901234567"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="kyc-nit-dv"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      DV Auto
                    </label>
                    <input
                      id="kyc-nit-dv"
                      readOnly
                      data-testid="input-kyc-nit-dv"
                      value={nitVerificationDigit}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-center font-mono text-sm font-bold text-[#5b46e8]"
                    />
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs font-bold text-[#15172b]">
                    Datos del Representante Legal
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input
                      aria-label="Nombres del Representante Legal"
                      required
                      data-testid="input-replegal-firstname"
                      value={repLegalFirstName}
                      onChange={(e) => setRepLegalFirstName(e.target.value)}
                      placeholder="Nombres del Representante Legal *"
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                    />
                    <input
                      aria-label="Apellidos del Representante Legal"
                      required
                      data-testid="input-replegal-lastname"
                      value={repLegalLastName}
                      onChange={(e) => setRepLegalLastName(e.target.value)}
                      placeholder="Apellidos del Representante Legal *"
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <select
                      aria-label="Tipo de documento del Representante Legal"
                      data-testid="select-replegal-doctype"
                      value={repLegalDocType}
                      onChange={(e) =>
                        setRepLegalDocType(e.target.value as 'CC' | 'CE' | 'PASAPORTE')
                      }
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                    >
                      <option value="CC">CC</option>
                      <option value="CE">CE</option>
                      <option value="PASAPORTE">Pasaporte</option>
                    </select>
                    <input
                      aria-label="Número de documento del Representante Legal"
                      required
                      data-testid="input-replegal-docnumber"
                      value={repLegalDocNumber}
                      onChange={(e) => setRepLegalDocNumber(e.target.value)}
                      placeholder="Número Documento *"
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                    />
                    <input
                      aria-label="Fecha de expedición del documento del Representante Legal"
                      required
                      type="date"
                      data-testid="input-replegal-issuedate"
                      value={repLegalDocIssueDate}
                      onChange={(e) => setRepLegalDocIssueDate(e.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="kyc-department"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Departamento *
                </label>
                <select
                  id="kyc-department"
                  data-testid="select-kyc-department"
                  value={department}
                  onChange={(e) => {
                    const nextDept = e.target.value;
                    setDepartment(nextDept);
                    setCity(COLOMBIA_LOCATIONS[nextDept]?.[0] ?? '');
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {Object.keys(COLOMBIA_LOCATIONS).map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="kyc-city"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Ciudad / Municipio *
                </label>
                <select
                  id="kyc-city"
                  data-testid="select-kyc-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {availableCities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="kyc-address"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Dirección Fiscal / Residencia *
                </label>
                <input
                  id="kyc-address"
                  required
                  data-testid="input-kyc-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Cra 12 # 15-40"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-sm font-extrabold text-[#15172b]">
              3. Soportes Documentales (PDF máx. 5 MB)
            </h2>

            {personType === 'JURIDICAL' && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  El <strong>Certificado de Cámara de Comercio</strong> debe tener una fecha de
                  expedición <strong>no mayor a 30 días</strong>.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label
                htmlFor="file-kyc-identity"
                className="flex cursor-pointer flex-col justify-between rounded-2xl border border-dashed border-slate-300 p-4 hover:border-[#5b46e8]"
              >
                <span className="flex items-center gap-2 text-xs font-bold text-[#15172b]">
                  <FileText className="h-4 w-4 text-[#c93b2b]" />
                  {personType === 'JURIDICAL'
                    ? 'Cédula Frontal Rep. Legal (PDF) *'
                    : 'Cédula Frontal Titular (PDF) *'}
                </span>
                <span className="mt-1 text-[11px] text-slate-600">
                  {identityDocPdfUrl ? 'PDF cargado correctamente' : 'Seleccionar archivo .PDF'}
                </span>
                <input
                  id="file-kyc-identity"
                  type="file"
                  accept="application/pdf"
                  data-testid="file-kyc-identity-pdf"
                  onChange={(e) => void handleFileUpload(e.target.files?.[0], 'identity')}
                  className="mt-2 text-xs"
                />
              </label>

              <label
                htmlFor="file-kyc-rut"
                className="flex cursor-pointer flex-col justify-between rounded-2xl border border-dashed border-slate-300 p-4 hover:border-[#5b46e8]"
              >
                <span className="flex items-center gap-2 text-xs font-bold text-[#15172b]">
                  <FileCheck2 className="h-4 w-4 text-[#5b46e8]" />
                  RUT Actualizado DIAN (PDF) *
                </span>
                <span className="mt-1 text-[11px] text-slate-600">
                  {rutPdfUrl ? 'RUT cargado correctamente' : 'Seleccionar archivo .PDF'}
                </span>
                <input
                  id="file-kyc-rut"
                  type="file"
                  accept="application/pdf"
                  data-testid="file-kyc-rut-pdf"
                  onChange={(e) => void handleFileUpload(e.target.files?.[0], 'rut')}
                  className="mt-2 text-xs"
                />
              </label>

              {personType === 'JURIDICAL' && (
                <label
                  htmlFor="file-kyc-chamber"
                  className="flex cursor-pointer flex-col justify-between rounded-2xl border border-dashed border-slate-300 p-4 hover:border-[#5b46e8] sm:col-span-2"
                >
                  <span className="flex items-center gap-2 text-xs font-bold text-[#15172b]">
                    <Building2 className="h-4 w-4 text-emerald-700" />
                    Certificado de Cámara de Comercio (PDF) *
                  </span>
                  <span className="mt-1 text-[11px] text-slate-600">
                    {chamberCommercePdfUrl
                      ? 'Cámara de Comercio cargada'
                      : 'Vigencia menor a 30 días (.PDF)'}
                  </span>
                  <input
                    id="file-kyc-chamber"
                    type="file"
                    accept="application/pdf"
                    data-testid="file-kyc-chamber-pdf"
                    onChange={(e) => void handleFileUpload(e.target.files?.[0], 'chamber')}
                    className="mt-2 text-xs"
                  />
                </label>
              )}
            </div>

            {uploadingField && (
              <p className="text-xs font-semibold text-[#5b46e8]">
                Subiendo archivo al servidor...
              </p>
            )}
          </div>

          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-sm font-extrabold text-[#15172b]">
              4. Perfil Público de la Productora y Firma Digital
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label
                htmlFor="file-kyc-logo-input"
                className="flex cursor-pointer flex-col justify-between rounded-2xl border border-dashed border-slate-300 p-4 hover:border-[#5b46e8]"
              >
                <span className="flex items-center gap-2 text-xs font-bold text-[#15172b]">
                  <ImagePlus className="h-4 w-4 text-sky-700" />
                  Logo / Avatar Oficial (PNG/JPG máx 2MB)
                </span>
                <input
                  id="file-kyc-logo-input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  data-testid="file-kyc-logo"
                  onChange={(e) => void handleFileUpload(e.target.files?.[0], 'logo')}
                  className="mt-2 text-xs"
                />
              </label>

              <div>
                <label
                  htmlFor="kyc-phone"
                  className="block text-xs font-semibold text-slate-700"
                >
                  WhatsApp / Teléfono Soporte en Boletos *
                </label>
                <input
                  id="kyc-phone"
                  required
                  data-testid="input-kyc-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+57 300 000 0000"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="kyc-description"
                className="block text-xs font-semibold text-slate-700"
              >
                Biografía / Trayectoria de la Productora *
              </label>
              <textarea
                id="kyc-description"
                required
                rows={3}
                maxLength={300}
                data-testid="input-kyc-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe el tipo de conciertos, festivales o eventos que organizas..."
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input
                aria-label="Usuario de Instagram de la productora"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="@instagram_productora"
                className="rounded-xl border border-slate-300 px-3 py-2 text-xs"
              />
              <input
                aria-label="Usuario de TikTok de la productora"
                value={tiktokUrl}
                onChange={(e) => setTiktokUrl(e.target.value)}
                placeholder="@tiktok_productora"
                className="rounded-xl border border-slate-300 px-3 py-2 text-xs"
              />
              <input
                aria-label="Sitio web oficial de la productora"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://tuproductora.com"
                className="rounded-xl border border-slate-300 px-3 py-2 text-xs"
              />
            </div>

            <DigitalSignaturePad onSignatureChange={setSignatureDataUrl} />
          </div>

          {error && (
            <p
              role="alert"
              data-testid="kyc-error-message"
              className="rounded-2xl bg-rose-50 p-4 text-xs font-semibold text-rose-800"
            >
              {error}
            </p>
          )}

          {successMsg && (
            <p
              role="status"
              data-testid="kyc-success-message"
              className="rounded-2xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-800"
            >
              {successMsg}
            </p>
          )}

          <button
            type="submit"
            data-testid="btn-submit-kyc"
            disabled={submitting || Boolean(uploadingField)}
            className="w-full rounded-2xl bg-[#9f2518] py-3.5 text-sm font-bold !text-white shadow-lg transition hover:bg-[#a82e20] disabled:opacity-50"
          >
            {submitting
              ? 'Enviando expediente a auditoría...'
              : 'Enviar Expediente KYC y Solicitar Sello Verificado'}
          </button>
        </form>

        <aside className="lg:col-span-4">
          <div className="sticky top-24 space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <span className="text-[11px] font-bold tracking-wider text-slate-600 uppercase">
              Vista Previa del Perfil Público
            </span>

            <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo productora"
                  className="h-14 w-14 rounded-2xl object-cover ring-2 ring-sky-500/30"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#15172b] text-sm font-extrabold text-white">
                  {(businessName || 'EV').slice(0, 2).toUpperCase()}
                </div>
              )}

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-base font-extrabold text-[#15172b]">
                    {businessName || 'Nombre de Productora'}
                  </h3>
                  <VerifiedBadge isVerified size="md" />
                </div>
                <p className="text-xs text-slate-600">
                  {personType === 'JURIDICAL'
                    ? `NIT ${documentNumber || '---'}-${nitVerificationDigit || '0'}`
                    : `${documentType} ${documentNumber || '---'}`}
                </p>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-slate-700">
              {description ||
                'Aquí aparecerá la descripción oficial de tu productora en todos los eventos publicados.'}
            </p>

            <div className="space-y-1.5 text-xs text-slate-600">
              <p className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-[#5b46e8]" />
                Soporte: {supportPhone || phone || 'Pendiente'}
              </p>
              {instagramUrl && (
                <p className="flex items-center gap-2">
                  <AtSign className="h-3.5 w-3.5 text-[#c93b2b]" />
                  {instagramUrl}
                </p>
              )}
              {websiteUrl && (
                <p className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-sky-700" />
                  {websiteUrl}
                </p>
              )}
            </div>

            <div className="rounded-2xl bg-slate-50 p-3 text-[11px] text-slate-700">
              <p className="font-bold text-[#15172b]">Checklist de Auditoría:</p>
              <ul className="mt-1.5 space-y-1">
                <li>{identityDocPdfUrl ? '✅' : '⏳'} Cédula frontal PDF</li>
                <li>{rutPdfUrl ? '✅' : '⏳'} RUT actualizado PDF</li>
                {personType === 'JURIDICAL' && (
                  <li>{chamberCommercePdfUrl ? '✅' : '⏳'} Cámara de Comercio PDF</li>
                )}
                <li>{signatureDataUrl ? '✅' : '⏳'} Firma digital manuscrita</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}