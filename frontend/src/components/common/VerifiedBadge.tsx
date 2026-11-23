import { BadgeCheck } from 'lucide-react';

interface VerifiedBadgeProps {
  isVerified?: boolean;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function VerifiedBadge({
  isVerified = false,
  label = 'Cuenta Verificada por EVENTIA',
  size = 'md',
}: VerifiedBadgeProps) {
  if (!isVerified) return null;

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  }[size];

  return (
    <span
      title={label}
      data-testid="verified-badge"
      className="inline-flex items-center gap-1 text-sky-500"
    >
      <BadgeCheck className={`${sizeClasses} fill-sky-500 text-white`} />
    </span>
  );
}