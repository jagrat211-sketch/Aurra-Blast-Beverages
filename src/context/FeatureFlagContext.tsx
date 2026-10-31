import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

interface FeatureFlagContextType {
  isAuraTributeEnabled: boolean;
  toggleAuraTribute: () => Promise<void>;
  setAuraTributeEnabled: (val: boolean) => Promise<void>;
  loading: boolean;
}

const STORAGE_KEY = 'aurra_feature_flag_aura_tribute';
const SYNC_EVENT = 'aurra_feature_flags_updated';

const FeatureFlagContext = createContext<FeatureFlagContextType | undefined>(undefined);

export const FeatureFlagProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Read initial value synchronously from localStorage (defaults to true if unset)
  const [isAuraTributeEnabled, setIsAuraTributeEnabledState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        return stored === 'true';
      }
      return true; // default ON
    } catch {
      return true;
    }
  });

  const [loading, setLoading] = useState(false);

  // Sync with server on initial mount
  useEffect(() => {
    let isMounted = true;
    const fetchServerFlags = async () => {
      try {
        const res = await api.getFeatureFlags();
        if (isMounted && typeof res.aura_tribute_enabled === 'boolean') {
          setIsAuraTributeEnabledState(res.aura_tribute_enabled);
          try {
            localStorage.setItem(STORAGE_KEY, String(res.aura_tribute_enabled));
          } catch {
            // Ignore quota issues
          }
        }
      } catch (err) {
        // Fall back gracefully to localStorage
      }
    };

    fetchServerFlags();

    // Listen to custom event for same-tab updates across decoupled components
    const handleCustomSync = (e: any) => {
      if (e.detail && typeof e.detail.auraTributeEnabled === 'boolean') {
        setIsAuraTributeEnabledState(e.detail.auraTributeEnabled);
      }
    };

    // Listen to cross-tab storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue !== null) {
        setIsAuraTributeEnabledState(e.newValue === 'true');
      }
    };

    window.addEventListener(SYNC_EVENT, handleCustomSync);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      isMounted = false;
      window.removeEventListener(SYNC_EVENT, handleCustomSync);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const setAuraTributeEnabled = async (val: boolean) => {
    // 1. Update React state immediately
    setIsAuraTributeEnabledState(val);

    // 2. Persist in localStorage
    try {
      localStorage.setItem(STORAGE_KEY, String(val));
    } catch {
      // Ignore
    }

    // 3. Dispatch custom broadcast event
    window.dispatchEvent(
      new CustomEvent(SYNC_EVENT, {
        detail: { auraTributeEnabled: val },
      })
    );

    // 4. Update backend if accessible
    setLoading(true);
    try {
      await api.updateFeatureFlag('aura_tribute_enabled', val);
    } catch (err) {
      console.warn('Feature flag server update notice:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAuraTribute = async () => {
    await setAuraTributeEnabled(!isAuraTributeEnabled);
  };

  return (
    <FeatureFlagContext.Provider
      value={{
        isAuraTributeEnabled,
        toggleAuraTribute,
        setAuraTributeEnabled,
        loading,
      }}
    >
      {children}
    </FeatureFlagContext.Provider>
  );
};

export const useFeatureFlags = () => {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
  }
  return context;
};
