import React, { useState, useEffect, useRef, useCallback } from 'react';

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
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (e) {
          console.error("Failed to write to local storage", e);
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