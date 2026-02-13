
export const formatTime = (totalSeconds: number): string => {
  const isNegative = totalSeconds < 0;
  const absSeconds = Math.abs(totalSeconds);
  const hours = Math.floor(absSeconds / 3600);
  const minutes = Math.floor((absSeconds % 3600) / 60);
  const seconds = Math.floor(absSeconds % 60);

  const parts = [];
  if (hours > 0) parts.push(String(hours).padStart(2, '0'));
  parts.push(String(minutes).padStart(2, '0'));
  parts.push(String(seconds).padStart(2, '0'));

  return (isNegative ? '-' : '') + parts.join(':');
};

export const formatDurationCompact = (totalSeconds: number): string => {
  const absSeconds = Math.abs(totalSeconds);
  const hours = Math.floor(absSeconds / 3600);
  const minutes = Math.floor((absSeconds % 3600) / 60);
  const seconds = Math.floor(absSeconds % 60);

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export const toDateTimeLocal = (timestamp: number): string => {
  if (!timestamp || timestamp === 0) return '';
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const getDateString = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Returns the "Effective Date" for the user. 
 * If the current time is before 4:00 AM, it returns the previous calendar day.
 * This handles "Late Night" scenarios (e.g. 1 AM Saturday counts as Friday Night).
 */
export const getEffectiveDate = (date: Date = new Date()): Date => {
  const d = new Date(date);
  // If strictly before 4 AM, treat as previous day
  if (d.getHours() < 4) {
    d.setDate(d.getDate() - 1);
  }
  return d;
};

export const formatSecondsToMMSS = (totalSeconds: number): string => {
  // Ensure we format non-negative numbers for countdowns usually, but handle negative if needed
  const isNegative = totalSeconds < 0;
  const absSeconds = Math.abs(totalSeconds);
  const minutes = Math.floor(absSeconds / 60);
  const seconds = Math.floor(absSeconds % 60);
  return `${isNegative ? '-' : ''}${String(minutes)}:${String(seconds).padStart(2, '0')}`;
};

export const parseTimerInput = (input: string): number => {
  const digits = input.replace(/\D/g, '');
  const len = digits.length;

  if (len === 0) return 0;

  // For 1 or 2 digits, always treat as total seconds
  // e.g., "45" -> 45s; "90" -> 90s (1:30)
  if (len <= 2) {
    return parseInt(digits, 10);
  }

  // For 3-5 digits, try to parse as m:ss, mm:ss, or mmm:ss
  // If the last two digits are < 60, parse it that way
  // e.g., "148" -> 1m 48s = 108s
  const secondsPart = parseInt(digits.slice(-2), 10);
  if (secondsPart < 60) {
    const minutesPart = parseInt(digits.slice(0, -2), 10);
    return minutesPart * 60 + secondsPart;
  }

  // Otherwise (last two digits >= 60), treat the whole number as seconds
  // e.g., "199" -> 199s
  return parseInt(digits, 10);
};

let lockCount = 0;
const getScroller = (): HTMLElement | null => document.querySelector('main');

export const lockBodyScroll = () => {
  const scroller = getScroller();
  if (!scroller) return;

  if (lockCount === 0) {
    scroller.style.overflowY = 'hidden';
  }
  lockCount++;
};

export const unlockBodyScroll = () => {
  const scroller = getScroller();
  if (!scroller) return;

  lockCount--;
  if (lockCount <= 0) {
    scroller.style.overflowY = '';
    lockCount = 0;
  }
};
