import React, { useState } from 'react';
import { RefreshCw, Smartphone } from 'lucide-react';
import updateManager from '../utils/serviceWorkerUpdate';

const RefreshAppButton = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    
    try {
      // Force refresh the app
      await updateManager.forceRefresh();
    } catch (error) {
      console.error('Manual refresh failed:', error);
      // Fallback: simple reload
      window.location.reload();
    }
  };

  return (
    <div className="rounded-3xl border border-jj-border/80 dark:border-white/10 bg-jj-surface dark:bg-jj-surface-dark p-5 sm:p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-2xl bg-stone-100 dark:bg-white/[0.06] flex items-center justify-center border border-jj-border/60 dark:border-white/10">
          <Smartphone className="w-5 h-5 text-jj-accent dark:text-teal-300" strokeWidth={1.75} />
        </div>
        <h3 className="text-base font-semibold text-jj-ink dark:text-stone-100">App refresh</h3>
      </div>

      <p className="text-sm text-jj-muted dark:text-stone-400 mb-4 leading-relaxed">
        If something looks stuck after an update, reload once to pull the latest assets from the service worker.
      </p>

      <button
        type="button"
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-jj-accent dark:bg-teal-600 text-white font-medium hover:opacity-95 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-jj-accent"
      >
        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} strokeWidth={1.75} />
        {isRefreshing ? 'Refreshing…' : 'Refresh now'}
      </button>

      <p className="text-xs text-jj-muted dark:text-stone-500 mt-3 text-center">
        Clears cached shell files and reloads the page.
      </p>
    </div>
  );
};

export default RefreshAppButton;
