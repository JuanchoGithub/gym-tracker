
import React, { useState, useEffect, useRef, useCallback } from 'react';

// Helper to set a cookie
const setCookie = (name: string, value: string, days: number) => {
    const d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + d.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/;SameSite=Strict";
};

// Keys that should be synced to cookies (Small preferences only)
const COOKIE_SYNC_KEYS = ['locale', 'measureUnit', 'theme', 'activeWorkoutId'];

export function useLocalStorage<T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  // Ref to keep track of the current state value for the debounce callback
  const stateRef = useRef<T>(initialValue);

  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      const parsed = item ? JSON.parse(item) : initialValue;
      stateRef.current = parsed;
      return parsed;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  // Ref to hold the timeout ID
  const timeoutRef = useRef<number | null>(null);

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(stateRef.current) : value;
      
      // Update React state immediately for UI responsiveness
      setStoredValue(valueToStore);
      stateRef.current = valueToStore;

      // Debounce the expensive localStorage write
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        try {
          const stringified = JSON.stringify(valueToStore);
          window.localStorage.setItem(key, stringified);
          
          // Sync specific small keys to cookies for redundancy/access
          if (COOKIE_SYNC_KEYS.includes(key)) {
              // Special case: for activeWorkout, just save the ID or boolean, not the whole object to save space
              if (key === 'activeWorkout' && valueToStore) {
                 // @ts-ignore
                 setCookie('hasActiveWorkout', 'true', 1);
              } else {
                 setCookie(key, String(valueToStore), 365);
              }
          }
        } catch (e) {
          console.error("Failed to write to storage", e);
        }
      }, 500); // 500ms debounce delay

    } catch (error) {
      console.error(error);
    }
  }, [key]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        const newVal = JSON.parse(e.newValue);
        setStoredValue(newVal);
        stateRef.current = newVal;
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);
  
  return [storedValue, setValue];
}
