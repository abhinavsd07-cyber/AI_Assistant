export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

export function getPasswordStrength(pass: string): PasswordStrength {
  if (!pass) return { score: 0, label: '', color: 'bg-transparent' };
  let score = 0;
  if (pass.length >= 6) score += 1;
  if (pass.length >= 10) score += 1;
  if (/[0-9]/.test(pass)) score += 1;
  if (/[^A-Za-z0-9]/.test(pass)) score += 1;

  switch (score) {
    case 1:
      return { score: 1, label: 'Weak', color: 'bg-rose-500' };
    case 2:
      return { score: 2, label: 'Fair', color: 'bg-amber-500' };
    case 3:
      return { score: 3, label: 'Good', color: 'bg-sky-600' };
    case 4:
    default:
      return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
  }
}

export function buildPathWithQuery(
  pathname: string,
  params?: Record<string, string | undefined | null>
): string {
  if (!params) return pathname;
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === 'string' && v.trim()) {
      search.set(k, v.trim());
    }
  }
  const qs = search.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function readQueryParam(key: string): string {
  try {
    return new URLSearchParams(window.location.search).get(key) || '';
  } catch {
    return '';
  }
}
