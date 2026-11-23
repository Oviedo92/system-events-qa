import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, ShieldCheck, Ticket } from 'lucide-react';

import { useAuth } from '../../contexts/auth-context';
import { apiRequest } from '../../services/api';
import { register } from '../../services/auth.service';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [accountTab, setAccountTab] = useState<'USER' | 'PROMOTER'>('USER');

  // Campos Comprador
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Campos Express Promotor (Fase 1)
  const [brandName, setBrandName] = useState('');
  const [phone, setPhone] = useState('');
  const [personType, setPersonType] = useState<'NATURAL' | 'JURIDICAL'>('NATURAL');
  const [documentNumber, setDocumentNumber] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (accountTab === 'PROMOTER' && !acceptedTerms) {
      setError('Debes aceptar los Términos, Comisiones y la Ley 1581 de 2012.');
      return;
    }

    setLoading(true);

    try {
      const displayName =
        accountTab === 'PROMOTER' ? brandName.trim() : name.trim();

      await register(displayName, email.trim(), password);

      if (accountTab === 'USER') {
        navigate('/login', {
          replace: true,
          state: { message: 'Cuenta creada correctamente. Ahora inicia sesión.' },
        });
        return;
      }

      // Fase 1 Promotor: Autologin + creación de expediente inicial con apiRequest autenticado
      await signIn(email.trim(), password);

      await apiRequest('/promoter-applications', {
        method: 'POST',
        body: JSON.stringify({
          personType,
          kycStepCompleted: 1,
          businessName: brandName.trim(),
          phone: phone.trim(),
          documentType: personType === 'JURIDICAL' ? 'NIT' : 'CC',
          documentNumber: documentNumber.trim() || 'PENDIENTE',
          description: `Productora ${brandName.trim()} registrada en Fase 1 Express.`,
        }),
      });

      navigate('/promoter/application', { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No fue posible crear la cuenta.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      data-testid="register-page"
      className="mx-auto my-10 max-w-xl px-4"
    >
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50 p-1.5">
          <button
            type="button"
            data-testid="tab-register-user"
            onClick={() => {
              setAccountTab('USER');
              setError('');
            }}
            className={`flex items-center justify-center gap-2 rounded-2xl py-3 text-xs font-bold transition ${
              accountTab === 'USER'
                ? 'bg-white text-[#15172b] shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Ticket className="h-4 w-4 text-[#ff684a]" />
            Soy Comprador
          </button>

          <button
            type="button"
            data-testid="tab-register-promoter"
            onClick={() => {
              setAccountTab('PROMOTER');
              setError('');
            }}
            className={`flex items-center justify-center gap-2 rounded-2xl py-3 text-xs font-bold transition ${
              accountTab === 'PROMOTER'
                ? 'bg-white text-[#15172b] shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="h-4 w-4 text-[#7765f8]" />
            Soy Productora / Promotor
          </button>
        </div>

        <div className="p-6 sm:p-8">
          <h1 className="text-2xl font-extrabold text-[#15172b]">
            {accountTab === 'USER'
              ? 'Crea tu cuenta en EVENTIA'
              : 'Registro Express de Promotor (Fase 1)'}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            {accountTab === 'USER'
              ? 'Compra entradas con código QR nominativo y sigue tus eventos favoritos.'
              : 'Crea tu cuenta en 1 minuto y completa luego tu verificación KYC para vender boletería.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {accountTab === 'USER' ? (
              <div>
                <label
                  htmlFor="name"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Nombre completo *
                </label>
                <input
                  id="name"
                  data-testid="input-register-name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Carlos Mendoza"
                  required
                  disabled={loading}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#7765f8] focus:outline-none"
                />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="brandName"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Nombre Comercial / Productora *
                    </label>
                    <input
                      id="brandName"
                      data-testid="input-promoter-brand"
                      type="text"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="Ej. Vallenato Live"
                      required
                      disabled={loading}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#7765f8] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="personType"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Tipo de Persona *
                    </label>
                    <select
                      id="personType"
                      data-testid="select-promoter-person-type"
                      value={personType}
                      onChange={(e) =>
                        setPersonType(e.target.value as 'NATURAL' | 'JURIDICAL')
                      }
                      disabled={loading}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-[#7765f8] focus:outline-none"
                    >
                      <option value="NATURAL">Persona Natural</option>
                      <option value="JURIDICAL">Persona Jurídica (Empresa)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Teléfono Móvil / WhatsApp *
                    </label>
                    <input
                      id="phone"
                      data-testid="input-promoter-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+57 300 123 4567"
                      required
                      disabled={loading}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#7765f8] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="docExpress"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      {personType === 'JURIDICAL'
                        ? 'NIT Preliminar (sin DV) *'
                        : 'Número de Cédula (CC/CE) *'}
                    </label>
                    <input
                      id="docExpress"
                      data-testid="input-promoter-doc-express"
                      type="text"
                      value={documentNumber}
                      onChange={(e) => setDocumentNumber(e.target.value)}
                      placeholder={
                        personType === 'JURIDICAL' ? '901234567' : '1065890123'
                      }
                      required
                      disabled={loading}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#7765f8] focus:outline-none"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700"
              >
                Correo electrónico *
              </label>
              <input
                id="email"
                data-testid="input-register-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                required
                disabled={loading}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#7765f8] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-700"
              >
                Contraseña (mínimo 8 caracteres) *
              </label>
              <input
                id="password"
                data-testid="input-register-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#7765f8] focus:outline-none"
              />
            </div>

            {accountTab === 'PROMOTER' && (
              <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <input
                  type="checkbox"
                  data-testid="checkbox-promoter-terms"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#7765f8]"
                />
                <span>
                  Acepto los <strong>Términos de Servicio, Comisiones</strong> y la{' '}
                  <strong>Política de Tratamiento de Datos (Ley 1581 de 2012)</strong>.
                </span>
              </label>
            )}

            {error && (
              <p
                role="alert"
                data-testid="register-error-message"
                className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              data-testid="btn-submit-register"
              disabled={loading}
              className="w-full rounded-xl bg-[#15172b] py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {loading
                ? 'Procesando registro...'
                : accountTab === 'USER'
                  ? 'Crear cuenta de Comprador'
                  : 'Continuar a Verificación KYC →'}
            </button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
            <span>
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="font-bold text-[#7765f8] hover:underline">
                Inicia sesión
              </Link>
            </span>
            <Link
              to="/moderator/application"
              className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-[#15172b]"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-sky-500" />
              Trabaja como Moderador
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}