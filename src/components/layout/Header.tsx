import { ConnectionStatus } from './ConnectionStatus';

function MissionControlIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="32" height="32" rx="8" fill="#1c1c20" />
      <rect width="32" height="32" rx="8" fill="url(#mc-glass)" opacity="0.6" />
      <circle cx="16" cy="16" r="10" stroke="url(#mc-ring)" strokeWidth="1.5" fill="none" opacity="0.5" />
      <circle cx="16" cy="16" r="6" stroke="url(#mc-ring)" strokeWidth="1" fill="none" opacity="0.35" />
      <line x1="16" y1="4" x2="16" y2="11" stroke="url(#mc-ring)" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <line x1="16" y1="21" x2="16" y2="28" stroke="url(#mc-ring)" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <line x1="4" y1="16" x2="11" y2="16" stroke="url(#mc-ring)" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <line x1="21" y1="16" x2="28" y2="16" stroke="url(#mc-ring)" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <circle cx="16" cy="16" r="2.5" fill="url(#mc-center)" />
      <defs>
        <radialGradient id="mc-glass" cx="0.3" cy="0.2" r="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="mc-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <radialGradient id="mc-center">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#3b82f6" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export function Header() {
  return (
    <header className="fixed top-0 z-50 w-full glass-panel border-b border-white/[0.08]">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <MissionControlIcon className="h-9 w-9 shadow-lg shadow-primary/30 rounded-xl" />
          <h1 className="text-lg font-bold tracking-tight text-white">Mission Control</h1>
        </div>
        <ConnectionStatus />
      </div>
    </header>
  );
}
