import { useState, useEffect } from 'react';
import { formatTime } from '../utils/timeUtils';

export const useWorkoutTimer = (startTime: number | undefined) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!startTime) {
      setElapsedSeconds(0);
      return;
    }

    const calculateElapsed = () => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedSeconds(elapsed);
    }

    calculateElapsed(); // initial calculation
    const intervalId = setInterval(calculateElapsed, 1000);

    return () => clearInterval(intervalId);
  }, [startTime]);

  return formatTime(elapsedSeconds);
};