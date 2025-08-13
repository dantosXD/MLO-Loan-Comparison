import { useState, useEffect, useCallback } from 'react';
import { dataManager } from '../utils/dataManager';

/**
 * React hook for unified data persistence
 * Automatically handles session vs client data storage
 */
export function useDataPersistence<T>(
  dataType: string,
  initialValue: T,
  clientId?: string | null
) {
  const [data, setData] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Set current client context when clientId changes
  useEffect(() => {
    if (clientId !== undefined) {
      dataManager.setCurrentClient(clientId);
    }
  }, [clientId]);

  // Load data on mount or when client changes
  useEffect(() => {
    const loadData = () => {
      setIsLoading(true);
      try {
        const savedData = dataManager.loadData(dataType);
        if (savedData !== null) {
          setData(savedData);
        }
      } catch (error) {
        console.error(`Failed to load ${dataType}:`, error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [dataType, clientId]);

  // Save data function
  const saveData = useCallback((newData: T) => {
    try {
      dataManager.saveData(dataType, newData);
      setData(newData);
      setLastSaved(new Date());
    } catch (error) {
      console.error(`Failed to save ${dataType}:`, error);
      throw error;
    }
  }, [dataType]);

  // Update data function (for partial updates)
  const updateData = useCallback((updater: (prevData: T) => T) => {
    const newData = updater(data);
    saveData(newData);
  }, [data, saveData]);

  // Clear data function
  const clearData = useCallback(() => {
    saveData(initialValue);
  }, [saveData, initialValue]);

  return {
    data,
    setData: saveData,
    updateData,
    clearData,
    isLoading,
    lastSaved,
    isClientData: !!clientId,
    isSessionData: !clientId
  };
}

/**
 * Specialized hooks for common data types
 */

export function useLoanData(clientId?: string | null) {
  return useDataPersistence('loanData', null, clientId);
}

export function useDebts(clientId?: string | null) {
  return useDataPersistence('debts', [], clientId);
}

export function useActivities(clientId?: string | null) {
  return useDataPersistence('activities', [], clientId);
}

export function useScenarios(clientId?: string | null) {
  return useDataPersistence('scenarios', [], clientId);
}

export function useProgramDebtSelections(clientId?: string | null) {
  return useDataPersistence('programDebtSelections', {}, clientId);
}

/**
 * Hook for managing data migration between session and client
 */
export function useDataMigration() {
  const [isMigrating, setIsMigrating] = useState(false);

  const migrateToClient = useCallback(async (clientId: string) => {
    setIsMigrating(true);
    try {
      const success = dataManager.migrateAnonymousToClient(clientId);
      if (success) {
        // Force re-render by updating client context
        dataManager.setCurrentClient(clientId);
      }
      return success;
    } catch (error) {
      console.error('Migration failed:', error);
      return false;
    } finally {
      setIsMigrating(false);
    }
  }, []);

  const getAnonymousSummary = useCallback(() => {
    return dataManager.exportAnonymousData();
  }, []);

  const getClientSessionSummary = useCallback((clientId: string) => {
    return dataManager.exportClientSessionData(clientId);
  }, []);

  return {
    migrateToClient,
    getAnonymousSummary,
    getClientSessionSummary,
    isMigrating
  };
}
