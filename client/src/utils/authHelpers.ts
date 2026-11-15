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

const PENDING_OTP_STORAGE_KEY = 'nebula_otp_pending';
const VERIFIED_RESET_STORAGE_KEY = 'nebula_reset_verified';

export interface PendingOtpSession {
  email: string;
  deliveredTo?: string;
  sandboxRedirected?: boolean;
  message?: string;
  requestedAt: number;
}

export interface VerifiedResetSession {
  email: string;
  resetSessionToken: string;
  verifiedAt: number;
}

export function savePendingOtpSession(data: {
  email: string;
  deliveredTo?: string;
  sandboxRedirected?: boolean;
  message?: string;
}): void {
  try {
    const payload: PendingOtpSession = {
      email: data.email.trim().toLowerCase(),
      deliveredTo: data.deliveredTo,
      sandboxRedirected: Boolean(data.sandboxRedirected),
      message: data.message,
      requestedAt: Date.now(),
    };
    sessionStorage.setItem(PENDING_OTP_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage errors
  }
}

export function getPendingOtpSession(): PendingOtpSession | null {
  try {
    const raw = sessionStorage.getItem(PENDING_OTP_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingOtpSession;
    if (!parsed?.email || Date.now() - (parsed.requestedAt || 0) > 15 * 60 * 1000) {
      sessionStorage.removeItem(PENDING_OTP_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingOtpSession(): void {
  try {
    sessionStorage.removeItem(PENDING_OTP_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function saveVerifiedResetSession(data: {
  email: string;
  resetSessionToken: string;
}): void {
  try {
    const payload: VerifiedResetSession = {
      email: data.email.trim().toLowerCase(),
      resetSessionToken: data.resetSessionToken.trim(),
      verifiedAt: Date.now(),
    };
    sessionStorage.setItem(VERIFIED_RESET_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage errors
  }
}

export function getVerifiedResetSession(): VerifiedResetSession | null {
  try {
    const raw = sessionStorage.getItem(VERIFIED_RESET_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VerifiedResetSession;
    if (
      !parsed?.email ||
      !parsed?.resetSessionToken ||
      Date.now() - (parsed.verifiedAt || 0) > 10 * 60 * 1000
    ) {
      sessionStorage.removeItem(VERIFIED_RESET_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearVerifiedResetSession(): void {
  try {
    sessionStorage.removeItem(VERIFIED_RESET_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}
