import { getApiMode, setApiMode } from '@/lib/api';
import { CURRENT_USER } from '@/lib/fixtures';
import { ArrowLeft, Broadcast, Database } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from './ui';

export function TopBar({ repoName }: { repoName?: string }) {
  const [mode, setMode] = useState<'mock' | 'live'>(getApiMode());

  useEffect(() => {
    const onModeChange = (e: Event) => {
      const customEvent = e as CustomEvent<'mock' | 'live'>;
      setMode(customEvent.detail);
    };
    window.addEventListener('crux:mode_change', onModeChange);
    return () => window.removeEventListener('crux:mode_change', onModeChange);
  }, []);

  const toggleMode = () => {
    const next = mode === 'mock' ? 'live' : 'mock';
    setApiMode(next);
    setMode(next);
    window.location.reload();
  };

  return (
    <header className="flex h-12 shrink-0 items-center gap-4 border-b border-line bg-bg px-4">
      <Link to="/prs" className="flex items-center gap-2" aria-label="Crux Cockpit home">
        <img src="/crux-logo.webp" alt="" className="h-6 w-6 rounded" />
        <span className="text-sm font-semibold tracking-tight">Cockpit</span>
      </Link>
      {repoName && (
        <p className="hidden font-mono text-xs text-ink-faint sm:block">
          <ArrowLeft size={11} className="mr-1 inline" />
          {repoName}
        </p>
      )}
      <div className="ml-auto flex items-center gap-3">
        <button
          type="button"
          onClick={toggleMode}
          title={`Click to switch to ${mode === 'mock' ? 'Live API Backend' : 'Mock Data'}`}
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] transition-all hover:scale-105 active:scale-95 ${
            mode === 'live'
              ? 'border-ok/40 bg-ok-soft text-ok'
              : 'border-warn/40 bg-warn-soft text-warn'
          }`}
        >
          {mode === 'live' ? (
            <>
              <Broadcast size={11} weight="fill" className="animate-pulse" />
              LIVE BACKEND
            </>
          ) : (
            <>
              <Database size={11} />
              MOCK DATA
            </>
          )}
        </button>
        <Avatar user={CURRENT_USER} />
      </div>
    </header>
  );
}
