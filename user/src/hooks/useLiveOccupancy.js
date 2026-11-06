import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, Platform } from 'react-native';
import EventSource from 'react-native-sse';
import { gymService } from '../services';
import { CONFIG } from '../config';

/**
 * Custom hook for instantaneous facility capacity monitoring.
 * Features:
 * - Real-time Server-Sent Events (SSE) streaming (/api/gym/status/{gymId}/stream)
 * - Zero-delay instant updates across all student devices upon any check-in / check-out
 * - Resilient automatic fallback to HTTP polling if SSE is unavailable or drops
 * - Battery-friendly: pauses SSE & polling when app is backgrounded/inactive
 * - Instant foreground fetch and stream re-establishment on app resume
 * - Exposes manual trigger `refresh()` and direct setter `setGymData`
 */
export function useLiveOccupancy(gymId = CONFIG.GYM_ID || 'gym-001', intervalMs = 3500) {
  const [gymData, setGymData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLiveSse, setIsLiveSse] = useState(false);

  const eventSourceRef = useRef(null);
  const pollingTimerRef = useRef(null);
  const isMountedRef = useRef(true);

  // Compare and update gym data without unnecessary component re-renders
  const updateGymDataIfChanged = useCallback((newData) => {
    if (!newData || !isMountedRef.current) return;
    setGymData(prev => {
      if (
        prev &&
        prev.currentOccupancy === newData.currentOccupancy &&
        prev.status === newData.status &&
        prev.capacity === newData.capacity &&
        prev.openingHours?.open === newData.openingHours?.open &&
        prev.openingHours?.close === newData.openingHours?.close
      ) {
        return prev;
      }
      return newData;
    });
    setError(null);
  }, []);

  // One-off HTTP fetch for initial load or manual refresh
  const fetchStatus = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await gymService.getGymStatus(gymId);
      if (isMountedRef.current) {
        if (res.success && res.data) {
          updateGymDataIfChanged(res.data);
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
  }, [gymId, updateGymDataIfChanged]);

  // Fallback polling loop if SSE disconnects
  const startPollingFallback = useCallback(() => {
    if (pollingTimerRef.current) return;
    pollingTimerRef.current = setInterval(() => {
      fetchStatus(true);
    }, intervalMs);
  }, [fetchStatus, intervalMs]);

  const stopPollingFallback = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }, []);

  // Connect Server-Sent Events (SSE)
  const connectSse = useCallback(() => {
    if (CONFIG.USE_MOCK) {
      startPollingFallback();
      return;
    }

    try {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      const streamUrl = `${CONFIG.API_BASE_URL}/gym/status/${gymId}/stream`;
      const es = new EventSource(streamUrl, {
        headers: {
          Accept: 'text/event-stream',
        },
      });

      eventSourceRef.current = es;

      es.addEventListener('open', () => {
        if (isMountedRef.current) {
          setIsLiveSse(true);
          stopPollingFallback();
        }
      });

      es.addEventListener('occupancy', (event) => {
        if (!isMountedRef.current || !event?.data) return;
        try {
          const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          updateGymDataIfChanged(payload);
          setLoading(false);
        } catch (err) {
          console.warn('[SSE] Failed to parse occupancy event data:', err);
        }
      });

      es.addEventListener('error', (event) => {
        if (!isMountedRef.current) return;
        setIsLiveSse(false);
        // Start polling fallback while SSE attempts reconnection
        startPollingFallback();
      });
    } catch (err) {
      setIsLiveSse(false);
      startPollingFallback();
    }
  }, [gymId, updateGymDataIfChanged, startPollingFallback, stopPollingFallback]);

  const disconnectSse = useCallback(() => {
    if (eventSourceRef.current) {
      try {
        eventSourceRef.current.close();
      } catch (_) {}
      eventSourceRef.current = null;
    }
    setIsLiveSse(false);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    // Initial instant fetch, then establish SSE stream
    fetchStatus(false).then(() => {
      if (isMountedRef.current) {
        connectSse();
      }
    });

    // App state listener: pause connections in background to save battery
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        fetchStatus(true);
        connectSse();
      } else {
        disconnectSse();
        stopPollingFallback();
      }
    });

    return () => {
      isMountedRef.current = false;
      disconnectSse();
      stopPollingFallback();
      subscription.remove();
    };
  }, [fetchStatus, connectSse, disconnectSse, stopPollingFallback]);

  const refresh = useCallback(async () => {
    await fetchStatus(false);
    connectSse();
  }, [fetchStatus, connectSse]);

  return {
    gymData,
    setGymData,
    loading,
    error,
    isLiveSse,
    refresh,
  };
}

export default useLiveOccupancy;
