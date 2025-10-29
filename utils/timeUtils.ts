export const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (hours > 0) parts.push(String(hours).padStart(2, '0'));
    parts.push(String(minutes).padStart(2, '0'));
    parts.push(String(seconds).padStart(2, '0'));

    return parts.join(':');
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

export const formatSecondsToMMSS = (totalSeconds: number): string => {
    if (isNaN(totalSeconds) || totalSeconds < 0) return '0:00';
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes)}:${String(seconds).padStart(2, '0')}`;
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
  if (lockCount === 0) {
    document.body.style.overflow = 'hidden';
    const scroller = getScroller();
    if (scroller) {
        scroller.style.overflowY = 'hidden';
    }
  }
  lockCount++;
};

export const unlockBodyScroll = () => {
  lockCount--;
  if (lockCount <= 0) {
    document.body.style.overflow = '';
    const scroller = getScroller();
    if (scroller) {
        scroller.style.overflowY = '';
    }
    lockCount = 0;
  }
};