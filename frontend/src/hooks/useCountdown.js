import { useState, useEffect } from 'react';

const calculateDiff = (target) => {
  if (!target) return null;
  const diff = new Date(target) - new Date();
  return diff > 0 ? Math.floor(diff / 1000) : 0;
};

export default function useCountdown(timerEndsAt) {
  const [timeLeft, setTimeLeft] = useState(() => calculateDiff(timerEndsAt));
  const [prevTarget, setPrevTarget] = useState(timerEndsAt);

  if (prevTarget !== timerEndsAt) {
    setPrevTarget(timerEndsAt);
    setTimeLeft(calculateDiff(timerEndsAt));
  }

  useEffect(() => {
    if (!timerEndsAt) {
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
