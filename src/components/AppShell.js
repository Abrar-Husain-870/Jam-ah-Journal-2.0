import React from 'react';
import {
  LogOut,
  User,
  Calendar,
  TrendingUp,
  Trophy,
  BookOpen,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const NAV = [
  { id: 'calendar', label: 'Journal', shortLabel: 'Journal', icon: Calendar },
  { id: 'progress', label: 'Insights', shortLabel: 'Insights', icon: TrendingUp },
  { id: 'leaderboard', label: 'Community', shortLabel: 'Rank', icon: Trophy },
  { id: 'profile', label: 'You', shortLabel: 'You', icon: User },
  { id: 'rules', label: 'Guide', shortLabel: 'Guide', icon: BookOpen },
];

export function AppShell({
  currentPage,
  setCurrentPage,
  children,
  online,
}) {
  const { currentUser, logout, userNickname } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const displayName =
    userNickname ||
    currentUser?.displayName ||
    currentUser?.email?.split('@')[0] ||
    'Guest';

  return (
    <div className="min-h-screen bg-jj-canvas text-jj-ink dark:bg-jj-canvas-dark dark:text-stone-200 font-sans antialiased pb-[calc(4.85rem+env(safe-area-inset-bottom,0px))] sm:pb-0 selection:bg-teal-200/45 dark:selection:bg-teal-900/45">
      <header className="sticky top-0 z-40 bg-jj-surface/88 dark:bg-jj-surface-dark/90 backdrop-blur-xl backdrop-saturate-150 border-b border-black/[0.04] dark:border-white/[0.06] shadow-[0_1px_0_rgba(28,25,23,0.04)] dark:shadow-[0_1px_0_rgba(255,255,255,0.04)]">
        <div className="max-w-2xl lg:max-w-5xl mx-auto px-4 sm:px-8 pt-3.5 pb-3 sm:pt-5 sm:pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-jj overflow-hidden ring-1 ring-black/[0.06] dark:ring-white/[0.08] shadow-[0_2px_8px_-2px_rgba(28,25,23,0.12)] dark:shadow-[0_2px_12px_-2px_rgba(0,0,0,0.4)] shrink-0"
                aria-hidden
              >
                <img
                  src={`${process.env.PUBLIC_URL}/LogoHeader.png`}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="min-w-0">
                <p className="jj-eyebrow">Jamā&apos;ah Journal</p>
                <h1 className="text-[0.9375rem] sm:text-[1.0625rem] font-semibold tracking-[-0.02em] text-jj-ink dark:text-stone-50 truncate mt-0.5">
                  {displayName}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2.5 min-w-[2.75rem] min-h-[2.75rem] rounded-jj text-jj-muted hover:text-jj-ink dark:text-stone-400 dark:hover:text-stone-100 hover:bg-black/[0.045] dark:hover:bg-white/[0.06] transition-colors duration-jj focus:outline-none focus-visible:ring-2 focus-visible:ring-jj-accent focus-visible:ring-offset-2 focus-visible:ring-offset-jj-canvas dark:focus-visible:ring-offset-jj-canvas-dark"
                aria-label={resolvedTheme === 'dark' ? 'Use light theme' : 'Use dark theme'}
              >
                {resolvedTheme === 'dark' ? (
                  <Sun className="w-[1.15rem] h-[1.15rem]" strokeWidth={1.85} />
                ) : (
                  <Moon className="w-[1.15rem] h-[1.15rem]" strokeWidth={1.85} />
                )}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="p-2.5 min-w-[2.75rem] min-h-[2.75rem] rounded-jj text-jj-muted hover:text-jj-ink dark:text-stone-400 dark:hover:text-stone-100 hover:bg-black/[0.045] dark:hover:bg-white/[0.06] transition-colors duration-jj focus:outline-none focus-visible:ring-2 focus-visible:ring-jj-accent focus-visible:ring-offset-2 focus-visible:ring-offset-jj-canvas dark:focus-visible:ring-offset-jj-canvas-dark"
                aria-label="Sign out"
              >
                <LogOut className="w-[1.15rem] h-[1.15rem]" strokeWidth={1.85} />
              </button>
            </div>
          </div>

          <nav
            className="hidden sm:flex mt-5 gap-1 p-1 rounded-jj-lg bg-jj-mist/70 dark:bg-white/[0.04] ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
            aria-label="Main"
          >
            {NAV.map(({ id, label, icon: Icon }) => {
              const active = currentPage === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCurrentPage(id)}
                  aria-current={active ? 'page' : undefined}
                  className={`jj-interactive-press flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-jj text-[0.8125rem] font-semibold tracking-tight transition-all duration-jj focus:outline-none focus-visible:ring-2 focus-visible:ring-jj-accent focus-visible:ring-offset-2 focus-visible:ring-offset-jj-surface dark:focus-visible:ring-offset-jj-surface-dark ${
                    active
                      ? 'bg-jj-surface dark:bg-jj-elevated-dark text-jj-ink dark:text-stone-100 shadow-jj-card dark:shadow-none ring-1 ring-black/[0.06] dark:ring-white/[0.1]'
                      : 'text-jj-muted dark:text-stone-500 hover:text-jj-ink dark:hover:text-stone-200'
                  }`}
                >
                  <Icon className="w-[1.05rem] h-[1.05rem] opacity-90" strokeWidth={1.85} />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {!online && (
        <div className="max-w-2xl lg:max-w-5xl mx-auto px-4 sm:px-8 pt-4 sm:pt-5">
          <div
            role="status"
            className="rounded-jj-xl border border-amber-200/65 dark:border-amber-900/40 bg-amber-50/88 dark:bg-amber-950/35 text-amber-950 dark:text-amber-100/95 text-sm px-4 py-3.5 leading-snug ring-1 ring-amber-900/5 dark:ring-amber-500/10"
          >
            You&apos;re offline. You can review your journal; edits resume when you reconnect.
          </div>
        </div>
      )}

      <main
        id="jj-main"
        tabIndex={-1}
        className="max-w-2xl lg:max-w-5xl mx-auto px-4 sm:px-8 py-5 sm:py-10 lg:py-12 outline-none focus-visible:ring-2 focus-visible:ring-jj-accent/40 focus-visible:ring-offset-4 focus-visible:ring-offset-jj-canvas dark:focus-visible:ring-offset-jj-canvas-dark rounded-sm"
      >
        {children}
      </main>

      <footer className="max-w-2xl lg:max-w-5xl mx-auto px-4 sm:px-8 pb-7 sm:pb-10 text-center hidden sm:block">
        <p className="text-2xs text-jj-muted dark:text-stone-500 tracking-cap font-medium">
          Quiet consistency, honored intention.
        </p>
      </footer>

      <nav
        className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-jj-surface/94 dark:bg-jj-surface-dark-2/94 backdrop-blur-xl backdrop-saturate-150 border-t border-black/[0.06] dark:border-white/[0.08] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-12px_40px_-12px_rgba(28,25,23,0.1)] dark:shadow-[0_-12px_48px_-12px_rgba(0,0,0,0.55)]"
        aria-label="Primary"
      >
        <div className="flex items-stretch justify-around max-w-lg mx-auto px-1.5">
          {NAV.map(({ id, shortLabel, icon: Icon }) => {
            const active = currentPage === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setCurrentPage(id)}
                aria-current={active ? 'page' : undefined}
                className={`jj-interactive-press flex flex-1 flex-col items-center gap-0.5 py-2 px-0.5 rounded-jj-lg min-h-[3.35rem] transition-colors duration-jj focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-jj-accent ${
                  active
                    ? 'text-jj-accent dark:text-teal-300 bg-jj-accent/[0.08] dark:bg-teal-400/[0.09]'
                    : 'text-jj-muted dark:text-stone-500'
                }`}
              >
                <Icon className="w-[1.2rem] h-[1.2rem]" strokeWidth={active ? 2.15 : 1.7} />
                <span className="truncate w-full text-center text-[0.625rem] font-semibold tracking-[0.02em]">
                  {shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
