const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface UploadedFileResponse {
  url: string;
  originalName: string;
  size: number;
  mimetype: string;
}

export async function uploadKycDocument(
  file: File,
  expectedType: 'pdf' | 'image',
): Promise<UploadedFileResponse> {
  if (expectedType === 'pdf') {
    if (file.type !== 'application/pdf') {
      throw new Error('Formato inválido: el documento debe ser un archivo PDF.');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('El PDF supera el peso máximo permitido de 5 MB.');
    }
  } else {
    const allowedImages = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedImages.includes(file.type)) {
      throw new Error('Formato inválido: la imagen debe ser PNG, JPG o WEBP.');
    }
    if (file.size > 2 * 1024 * 1024) {
      throw new Error('La imagen supera el peso máximo permitido de 2 MB.');
    }
  }

  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/uploads/kyc-file`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'No se pudo subir el archivo al servidor.');
  }

  return res.json();
}

export async function uploadDigitalSignature(dataUrl: string): Promise<string> {
  const res = await fetch(`${API_BASE}/uploads/signature`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataUrl }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'No se pudo guardar la firma digital.');
  }

  const data = await res.json();
  return data.url;
}