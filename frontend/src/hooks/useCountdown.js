import { useState, useEffect } from 'react';

export default function useCountdown(timerEndsAt) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!timerEndsAt) {
      setTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const end = new Date(timerEndsAt);
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft(0);
        clearInterval(interval);
      } else {
        setTimeLeft(Math.floor(diff / 1000));
      }
    }, 1000);

    // Initial calculation
    const initialDiff = new Date(timerEndsAt) - new Date();
    setTimeLeft(initialDiff > 0 ? Math.floor(initialDiff / 1000) : 0);

    return () => clearInterval(interval);
  }, [timerEndsAt]);

  const formatTime = (seconds) => {
    if (seconds === null) return null;
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return { timeLeft, formattedTime: formatTime(timeLeft), isExpired: timeLeft === 0 };
}
