import { useState, useEffect, useCallback } from 'react';

export interface UsageRecord {
  timestamp: number;
  tokens: number;
}

export interface Limits {
  RPD: number;
  RPM: number;
  TPM: number;
}

export function useGeminiMonitor() {
  const LIMITS: Limits = {
    RPD: 250,
    RPM: 25,
    TPM: 100000,
  };

  const [usageHistory, setUsageHistory] = useState<UsageRecord[]>([]);
  const [dailyRequests, setDailyRequests] = useState(0);
  const [lastResetDate, setLastResetDate] = useState<number>(0);

  useEffect(() => {
    const storedHistory = localStorage.getItem('gemini_usage_history');
    const storedDaily = localStorage.getItem('gemini_daily_requests');
    const storedReset = localStorage.getItem('gemini_last_reset');

    if (storedHistory) setUsageHistory(JSON.parse(storedHistory));
    if (storedDaily) setDailyRequests(parseInt(storedDaily, 10));
    
    if (storedReset) {
      setLastResetDate(parseInt(storedReset, 10));
    } else {
      setLastResetDate(getPstMidnight().getTime());
    }
  }, []);

  useEffect(() => {
    if (lastResetDate !== 0) {
      localStorage.setItem('gemini_usage_history', JSON.stringify(usageHistory));
      localStorage.setItem('gemini_daily_requests', dailyRequests.toString());
      localStorage.setItem('gemini_last_reset', lastResetDate.toString());
    }
  }, [usageHistory, dailyRequests, lastResetDate]);

  const getPstMidnight = () => {
    const now = new Date();
    const pstNow = new Date(now.getTime() - 8 * 60 * 60 * 1000);
    const pstMidnight = new Date(pstNow);
    pstMidnight.setUTCHours(0, 0, 0, 0);
    return pstMidnight;
  };

  const checkAndResetRpd = useCallback(() => {
    const currentPstMidnight = getPstMidnight().getTime();
    if (currentPstMidnight > lastResetDate && lastResetDate !== 0) {
      setDailyRequests(0);
      setLastResetDate(currentPstMidnight);
    }
  }, [lastResetDate]);

  const getRollingWindowUsage = useCallback(() => {
    const now = Date.now();
    const windowStart = now - 60 * 1000;
    const validHistory = usageHistory.filter((item) => item.timestamp >= windowStart);
    
    const currentRpm = validHistory.length;
    const currentTpm = validHistory.reduce((sum, item) => sum + item.tokens, 0);
    
    return { currentRpm, currentTpm };
  }, [usageHistory]);

  const estimateTokens = (text?: string, mediaType?: string, dims?: [number, number], duration?: number) => {
    let total = 0;
    if (text) total += Math.ceil(text.length / 4);
    if (mediaType === 'image' && dims) {
      const [w, h] = dims;
      if (w <= 384 && h <= 384) total += 258;
      else {
        const tiles = Math.ceil(w / 768) * Math.ceil(h / 768);
        total += tiles * 258;
      }
    }
    if (mediaType === 'video' && duration) total += Math.ceil(duration * 263);
    if (mediaType === 'audio' && duration) total += Math.ceil(duration * 32);
    return total;
  };

  const recordUsage = useCallback((tokens: number) => {
    checkAndResetRpd();
    const now = Date.now();
    setDailyRequests((prev) => prev + 1);
    setUsageHistory((prev) => {
      const windowStart = now - 60 * 1000;
      const validHistory = prev.filter((item) => item.timestamp >= windowStart);
      return [...validHistory, { timestamp: now, tokens }];
    });
  }, [checkAndResetRpd]);

  const { currentRpm, currentTpm } = getRollingWindowUsage();

  return {
    limits: LIMITS,
    dailyRequests,
    currentRpm,
    currentTpm,
    lastResetDate,
    estimateTokens,
    recordUsage,
  };
}
