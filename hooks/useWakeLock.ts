
import { useEffect, useRef } from 'react';

export const useWakeLock = (enabled: boolean = true) => {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    let isMounted = true;

    const requestWakeLock = async () => {
      if (enabled && 'wakeLock' in navigator && document.visibilityState === 'visible') {
        try {
          const sentinel = await navigator.wakeLock.request('screen');
          if (isMounted) {
              wakeLockRef.current = sentinel;
              console.log('Screen Wake Lock is active.');
              sentinel.addEventListener('release', () => {
                console.log('Screen Wake Lock was released.');
              });
          } else {
              sentinel.release(); // Released immediately if unmounted
          }
        } catch (err: any) {
          // Suppress warning for NotAllowedError (policy denied)
          if (err.name !== 'NotAllowedError') {
            console.warn(`Could not acquire screen wake lock: ${err.name}, ${err.message}`);
          }
        }
      }
    };

    const releaseWakeLock = () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
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
      isMounted = false;
      releaseWakeLock();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleVisibilityChange);
    };
  }, [enabled]);
};
