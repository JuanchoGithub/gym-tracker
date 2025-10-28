import { useEffect, useRef } from 'react';

export const useWakeLock = (enabled: boolean = true) => {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    const requestWakeLock = async () => {
      if (enabled && 'wakeLock' in navigator && document.visibilityState === 'visible') {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          console.log('Screen Wake Lock is active.');
          wakeLockRef.current.addEventListener('release', () => {
            console.log('Screen Wake Lock was released.');
          });
        } catch (err: any) {
          // Changed from console.error to console.warn to avoid scary-looking errors
          // on platforms where wake lock is not supported or permitted.
          console.warn(`Could not acquire screen wake lock: ${err.name}, ${err.message}`);
        }
      }
    };

    const releaseWakeLock = () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };

    requestWakeLock();
    
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            requestWakeLock();
        } else {
            releaseWakeLock();
        }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleVisibilityChange);

    return () => {
      releaseWakeLock();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleVisibilityChange);
    };
  }, [enabled]);
};
