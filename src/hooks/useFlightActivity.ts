import { useCallback, useEffect, useRef, useState } from "react";
import { flightService } from "@/services/flightService";
import type { FlightActivityEvent } from "@/types/flight";

const FLUSH_DELAY_MS = 1500;
const MAX_LOCAL_EVENTS = 200;

interface PendingEvent {
  event_type: string;
  summary: string;
  payload?: Record<string, unknown>;
  occurred_at: string;
}

/**
 * Records every step a user takes in Flight Explorer.
 * Events show up in the timeline immediately and are sent to the backend in small batches (no request per click).
 * Tracking must never break the page, so failures are swallowed and the batch is retried with the next flush.
 */
export function useFlightActivity(enabled = true) {
  const visitId = useRef<string>(crypto.randomUUID());
  const pending = useRef<PendingEvent[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);
  const [events, setEvents] = useState<FlightActivityEvent[]>([]);
  const [history, setHistory] = useState<FlightActivityEvent[]>([]);

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const batch = pending.current.splice(0, 50);
    if (batch.length === 0) return;
    try {
      await flightService.recordActivity(visitId.current, batch);
    } catch {
      pending.current.unshift(...batch);
    }
  }, []);

  const track = useCallback(
    (event_type: string, summary: string, payload?: Record<string, unknown>) => {
      if (!enabled) return;
      const occurred_at = new Date().toISOString();
      pending.current.push({ event_type, summary, payload, occurred_at });
      setEvents((prev) =>
        [{ id: `local-${seq.current++}`, event_type, summary, payload, occurred_at, current: true }, ...prev].slice(
          0,
          MAX_LOCAL_EVENTS
        )
      );
      if (!timer.current) timer.current = setTimeout(flush, FLUSH_DELAY_MS);
    },
    [enabled, flush]
  );

  const loadHistory = useCallback(async () => {
    try {
      const rows = await flightService.getActivity(100);
      setHistory(
        rows
          .filter((r) => r.explorer_session_id !== visitId.current)
          .map((r) => ({
            id: String(r.id),
            event_type: r.event_type,
            summary: r.summary,
            payload: r.payload,
            occurred_at: r.occurred_at,
          }))
      );
    } catch {
      /* history is optional */
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    loadHistory();
    const onHide = () => void flush();
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      void flush();
    };
  }, [enabled, flush, loadHistory]);

  return { track, events, history, flush, reloadHistory: loadHistory };
}
