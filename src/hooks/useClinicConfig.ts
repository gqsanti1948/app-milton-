import { useState, useCallback } from 'react';
import { ClinicConfig } from '../types';
import { getClinicConfig, saveClinicConfig } from '../utils/storage';
import { seedClinicConfig } from '../data/seed';

export function useClinicConfig() {
  const [config, setConfig] = useState<ClinicConfig>(() => {
    return getClinicConfig() ?? seedClinicConfig;
  });

  const saveConfig = useCallback((newConfig: ClinicConfig) => {
    setConfig(newConfig);
    saveClinicConfig(newConfig);
  }, []);

  return { config, saveConfig };
}
