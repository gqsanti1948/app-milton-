import { useState, useCallback } from 'react';
import { Patient } from '../types';
import { getPatients, savePatients } from '../utils/storage';

export function usePatients() {
  const [patients, setPatients] = useState<Patient[]>(() => getPatients());

  const refresh = useCallback(() => {
    setPatients(getPatients());
  }, []);

  const addPatient = useCallback((patient: Patient) => {
    setPatients((prev) => {
      const updated = [...prev, patient];
      savePatients(updated);
      return updated;
    });
  }, []);

  const updatePatient = useCallback((updated: Patient) => {
    setPatients((prev) => {
      const newList = prev.map((p) => (p.id === updated.id ? updated : p));
      savePatients(newList);
      return newList;
    });
  }, []);

  const deletePatient = useCallback((id: string) => {
    setPatients((prev) => {
      const newList = prev.filter((p) => p.id !== id);
      savePatients(newList);
      return newList;
    });
  }, []);

  const getPatientById = useCallback(
    (id: string): Patient | undefined => {
      return patients.find((p) => p.id === id);
    },
    [patients]
  );

  return { patients, addPatient, updatePatient, deletePatient, getPatientById, refresh };
}
