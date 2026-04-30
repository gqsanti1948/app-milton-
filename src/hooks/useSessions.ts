import { useState, useCallback } from 'react';
import { Session } from '../types';
import { getSessions, saveSessions } from '../utils/storage';

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>(() => getSessions());

  const refresh = useCallback(() => {
    setSessions(getSessions());
  }, []);

  const addSession = useCallback((session: Session) => {
    setSessions((prev) => {
      const updated = [...prev, session];
      saveSessions(updated);
      return updated;
    });
  }, []);

  const updateSession = useCallback((updated: Session) => {
    setSessions((prev) => {
      const newList = prev.map((s) => (s.id === updated.id ? updated : s));
      saveSessions(newList);
      return newList;
    });
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const newList = prev.filter((s) => s.id !== id);
      saveSessions(newList);
      return newList;
    });
  }, []);

  const getSessionsByPatient = useCallback(
    (patientId: string): Session[] => {
      return sessions.filter((s) => s.patientId === patientId);
    },
    [sessions]
  );

  const getSessionsByDate = useCallback(
    (date: string): Session[] => {
      return sessions.filter((s) => s.date === date);
    },
    [sessions]
  );

  const checkConflict = useCallback(
    (date: string, startTime: string, endTime: string, excludeId?: string): boolean => {
      const daysSessions = sessions.filter(
        (s) =>
          s.date === date &&
          s.id !== excludeId &&
          s.status !== 'cancelled' &&
          s.status !== 'no-show'
      );

      const newStart = timeToMinutes(startTime);
      const newEnd = timeToMinutes(endTime);

      return daysSessions.some((s) => {
        const existingStart = timeToMinutes(s.startTime);
        const existingEnd = timeToMinutes(s.endTime);
        return newStart < existingEnd && newEnd > existingStart;
      });
    },
    [sessions]
  );

  return {
    sessions,
    addSession,
    updateSession,
    deleteSession,
    getSessionsByPatient,
    getSessionsByDate,
    checkConflict,
    refresh,
  };
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}
