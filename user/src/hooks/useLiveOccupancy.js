import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { gymService } from '../services';
import { CONFIG } from '../config';

/**
 * Custom hook for live facility capacity monitoring.
 * Features:
 * - Real-time auto-polling every `intervalMs` ms
 * - Battery-friendly: auto-pauses when app is backgrounded/inactive
 * - Instant foreground fetch on app resume
 * - Exposes manual trigger `refresh()` and direct setter `setGymData`
 */
export function useLiveOccupancy(gymId = CONFIG.GYM_ID || 'gym-001', intervalMs = 3500) {
  const [gymData, setGymData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);
  const isMountedRef = useRef(true);

  const fetchStatus = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await gymService.getGymStatus(gymId);
      if (isMountedRef.current) {
        if (res.success && res.data) {
          setGymData(prev => {
            if (
              prev &&
              prev.currentOccupancy === res.data.currentOccupancy &&
              prev.status === res.data.status &&
              prev.capacity === res.data.capacity
            ) {
              return prev;
            }
            return res.data;
          });
          setError(null);
        } else {
          setError(res.message || 'Failed to sync gym status');
        }
      }
    } catch (e) {
      if (isMountedRef.current) {
        setError(e.message || 'Network sync error');
      }
    } finally {
      if (isMountedRef.current && !silent) {
        setLoading(false);
      }
    }
  }, [gymId]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchStatus(false);

    const startPolling = () => {
      stopPolling();
      timerRef.current = setInterval(() => {
        fetchStatus(true);
      }, intervalMs);
    };

    const stopPolling = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    startPolling();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        fetchStatus(true);
        startPolling();
      } else {
        stopPolling();
      }
    });

    return () => {
      isMountedRef.current = false;
      stopPolling();
      subscription.remove();
    };
  }, [fetchStatus, intervalMs]);

  return {
    gymData,
    setGymData,
    loading,
    error,
    refresh: () => fetchStatus(false),
  };
}

export default useLiveOccupancy;
