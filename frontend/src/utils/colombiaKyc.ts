export function calculateColombianNitDv(nitRaw: string): string {
  const clean = nitRaw.replace(/\D/g, '');
  if (!clean) return '';

  const primes = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  let sum = 0;

  for (let i = 0; i < clean.length && i < primes.length; i++) {
    const digit = Number(clean[clean.length - 1 - i]);
    sum += digit * primes[i];
  }

  const remainder = sum % 11;
  return remainder > 1 ? String(11 - remainder) : String(remainder);
}

export const COLOMBIA_LOCATIONS: Record<string, string[]> = {
  Cesar: ['Valledupar', 'Aguachica', 'Agustín Codazzi', 'Bosconia', 'Curumaní'],
  Bogotá: ['Bogotá D.C.'],
  Antioquia: ['Medellín', 'Envigado', 'Itagüí', 'Rionegro', 'Bello'],
  Atlántico: ['Barranquilla', 'Soledad', 'Puerto Colombia', 'Malambo'],
  'Valle del Cauca': ['Cali', 'Palmira', 'Yumbo', 'Jamundí', 'Buenaventura'],
  Bolívar: ['Cartagena', 'Magangué', 'Turbaco'],
  Santander: ['Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta'],
};