import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../services/api';

export default function PromoterApplicationPage() {
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await apiRequest('/promoter-applications', {
        method: 'POST',
        body: JSON.stringify({
          businessName: businessName.trim(),
          phone: phone.trim(),
          documentNumber: documentNumber.trim(),
          description: description.trim(),
        }),
      });

      setSuccess(
        'Tu solicitud fue enviada. EVENTIA la revisará antes de habilitar tu cuenta como promotor.',
      );

      setBusinessName('');
      setPhone('');
      setDocumentNumber('');
      setDescription('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No fue posible enviar la solicitud.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1>Solicitud para ser promotor</h1>

        <p>
          Registra la información de tu organización para solicitar
          acceso a las herramientas de publicación y gestión de eventos
          de EVENTIA.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="businessName">
            Nombre de la empresa u organización
          </label>
          <input
            id="businessName"
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            autoComplete="organization"
            required
            maxLength={120}
            disabled={loading}
          />

          <label htmlFor="documentNumber">
            NIT o documento de identificación
          </label>
          <input
            id="documentNumber"
            value={documentNumber}
            onChange={(event) => setDocumentNumber(event.target.value)}
            required
            maxLength={30}
            disabled={loading}
          />

          <label htmlFor="phone">Teléfono de contacto</label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            autoComplete="tel"
            required
            maxLength={30}
            disabled={loading}
          />

          <label htmlFor="description">
            Describe los eventos que deseas organizar
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
            minLength={20}
            maxLength={1500}
            rows={5}
            disabled={loading}
          />

          {error && <p role="alert">{error}</p>}
          {success && <p role="status">{success}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Enviando solicitud...' : 'Enviar solicitud'}
          </button>
        </form>

        <p>
          <Link to="/">Volver al inicio</Link>
        </p>
      </div>
    </section>
  );
}
