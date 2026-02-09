import { format, formatDistanceToNow } from 'date-fns';

export function formatDateTime(date: Date | string | null): string {
  if (!date) return 'N/A';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'MMM d, yyyy HH:mm:ss');
}

export function formatDate(date: Date | string | null): string {
  if (!date) return 'N/A';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'MMM d, yyyy');
}

export function formatTime(date: Date | string | null): string {
  if (!date) return 'N/A';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'HH:mm:ss');
}

// Helper to calculate duration components
function getDurationComponents(seconds: number) {
  return {
    hours: Math.floor(seconds / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    secs: seconds % 60,
  };
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return 'N/A';
  const { hours, minutes, secs } = getDurationComponents(seconds);

  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

export function formatDurationShort(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return 'N/A';
  const { hours, minutes, secs } = getDurationComponents(seconds);

  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  if (minutes > 0) return `${minutes}:${String(secs).padStart(2, '0')}`;
  return `0:${String(secs).padStart(2, '0')}`;
}

export function formatLatency(ms: number | null): string {
  if (ms === null || ms === undefined) return 'N/A';

  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }

  return `${(ms / 1000).toFixed(2)}s`;
}

export function formatNumber(num: number | null, decimals = 0): string {
  if (num === null || num === undefined) return 'N/A';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercentage(value: number | null, decimals = 1): string {
  if (value === null || value === undefined) return 'N/A';
  return `${value.toFixed(decimals)}%`;
}

export function formatPhoneNumber(phone: string | null): string {
  if (!phone) return 'N/A';

  // Handle E.164 format with +1 prefix (e.g., +17708304765)
  if (phone.startsWith('+1') && phone.length === 12) {
    return `(${phone.slice(2, 5)}) ${phone.slice(5, 8)}-${phone.slice(8)}`;
  }

  // Handle 11-digit US numbers without plus (e.g., 17708304765)
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('1') && cleaned.length === 11) {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  // Return as-is if we can't parse it
  return phone;
}

export function formatRelativeTime(date: Date | string | null): string {
  if (!date) return 'N/A';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    started: 'blue',
    ongoing: 'yellow',
    ended: 'green',
    completed: 'green',
    failed: 'red',
    error: 'red',
  };

  return statusColors[status.toLowerCase()] || 'gray';
}

export function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' {
  const statusMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'> = {
    started: 'info',
    ongoing: 'warning',
    ended: 'success',
    completed: 'success',
    failed: 'destructive',
    error: 'destructive',
  };

  return statusMap[status.toLowerCase()] || 'outline';
}
