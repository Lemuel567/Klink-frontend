export function formatCurrency(amount: number, currency = 'GHS'): string {
  // A missing/NaN amount must render as a placeholder, never "GH₵NaN".
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return '—';
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatAmount(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
  return amount.toFixed(2);
}

export function formatDate(date: string | Date | null | undefined): string {
  // Intl throws RangeError on an invalid Date — a single null field from the
  // API must not crash the row that renders it.
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const now = new Date();
  const then = new Date(date);
  if (isNaN(then.getTime())) return '—';
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(date);
}

export function formatPaymentMonth(yyyyMM: string): string {
  const [year, month] = yyyyMM.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat('en-GH', { month: 'long', year: 'numeric' }).format(date);
}

export function formatRole(role: string): string {
  const map: Record<string, string> = {
    PASTOR: 'Pastor',
    ELDER: 'Elder',
    MANAGER: 'Manager',
    FINANCIAL_SECRETARY: 'Financial Secretary',
    GROUP_ADMIN: 'Group Admin',
    GROUP_FINANCIAL_SECRETARY: 'Group Fin. Sec.',
    MEMBER: 'Member',
  };
  return map[role] ?? role;
}

export function formatPhoneDisplay(phone: string): string {
  // E.164 → readable: +233241234567 → +233 24 123 4567
  if (!phone.startsWith('+')) return phone;
  const digits = phone.slice(1);
  if (digits.length === 12 && digits.startsWith('233')) {
    return `+233 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return phone;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

export function formatAttendancePercent(present: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((present / total) * 100)}%`;
}
