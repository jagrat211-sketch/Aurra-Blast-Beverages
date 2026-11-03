import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

interface FeatureFlagContextType {
  isAuraTributeEnabled: boolean;
  toggleAuraTribute: () => Promise<void>;
  setAuraTributeEnabled: (val: boolean) => Promise<{ success: boolean; is_enabled: boolean }>;
  loading: boolean;
  refreshFeatureFlags: () => Promise<void>;
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

  const fetchServerFlags = async () => {
    try {
      // 1. Direct Supabase query to feature_flags table (specifically row id = 'aura_tribute')
      try {
        const { supabase } = await import('../services/supabase.js');
        const { data } = await supabase
          .from('feature_flags')
          .select('id, is_enabled')
          .eq('id', 'aura_tribute')
          .maybeSingle();

        if (data && typeof data.is_enabled === 'boolean') {
          setIsAuraTributeEnabledState(data.is_enabled);
          try {
            localStorage.setItem(STORAGE_KEY, String(data.is_enabled));
          } catch {}
          return;
        }
      } catch (sbErr) {
        console.warn('Direct Supabase feature flag select note:', sbErr);
      }

      // 2. Fallback to API route
      const res = await api.getFeatureFlags();
      const val = typeof res.is_enabled === 'boolean' ? res.is_enabled : res.aura_tribute_enabled;
      if (typeof val === 'boolean') {
        setIsAuraTributeEnabledState(val);
        try {
          localStorage.setItem(STORAGE_KEY, String(val));
        } catch {}
      }
    } catch (err) {
      console.warn('Feature flag fetch note:', err);
    }
  };

  // Sync with Supabase on initial mount
  useEffect(() => {
    let isMounted = true;
    fetchServerFlags();

    // Setup Supabase Realtime listener on feature_flags table
    let channel: any = null;
    (async () => {
      try {
        const { supabase } = await import('../services/supabase.js');
        channel = supabase
          .channel('realtime:feature_flags')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'feature_flags' },
            (payload: any) => {
              if (isMounted && payload.new && payload.new.id === 'aura_tribute' && typeof payload.new.is_enabled === 'boolean') {
                setIsAuraTributeEnabledState(payload.new.is_enabled);
                try {
                  localStorage.setItem(STORAGE_KEY, String(payload.new.is_enabled));
                } catch {}
              }
            }
          )
          .subscribe();
      } catch (rtErr) {
        console.warn('Realtime subscription notice:', rtErr);
      }
    })();

    // Listen to custom event for same-tab updates across decoupled components
    const handleCustomSync = (e: any) => {
      if (isMounted && e.detail && typeof e.detail.auraTributeEnabled === 'boolean') {
        setIsAuraTributeEnabledState(e.detail.auraTributeEnabled);
      }
    };

    // Listen to cross-tab storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (isMounted && e.key === STORAGE_KEY && e.newValue !== null) {
        setIsAuraTributeEnabledState(e.newValue === 'true');
      }
    };

    window.addEventListener(SYNC_EVENT, handleCustomSync);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      isMounted = false;
      if (channel) {
        try {
          channel.unsubscribe();
        } catch {}
      }
      window.removeEventListener(SYNC_EVENT, handleCustomSync);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const setAuraTributeEnabled = async (val: boolean) => {
    setLoading(true);
    try {
      // 1. Send UPDATE request to Supabase (row id = 'aura_tribute') via backend
      await api.updateFeatureFlag('aura_tribute', val);

      // 2. Update UI state upon successful database response
      setIsAuraTributeEnabledState(val);
      try {
        localStorage.setItem(STORAGE_KEY, String(val));
      } catch {}

      // 3. Dispatch broadcast event so Navbar and global Header update dynamically in real-time
      window.dispatchEvent(
        new CustomEvent(SYNC_EVENT, {
          detail: { auraTributeEnabled: val },
        })
      );

      return { success: true, is_enabled: val };
    } catch (err: any) {
      console.error('Failed to update feature flag in database:', err);
      throw err;
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
        refreshFeatureFlags: fetchServerFlags,
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
