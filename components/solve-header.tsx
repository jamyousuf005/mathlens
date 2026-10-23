'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export default function SolveHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  // User display name from Better Auth session or fallback
  const userDisplayName = session?.user?.name || (session?.user?.email ? session.user.email.split('@')[0] : 'alex.miller');
  const userInitial = userDisplayName ? userDisplayName[0].toUpperCase() : 'U';

  const navLinks = [
    {
      name: 'Capture & Solve',
      href: '/solve/capture',
      icon: 'photo_camera',
      isActive: pathname === '/solve' || pathname === '/solve/capture',
    },
    {
      name: 'Upload & Solve',
      href: '/solve/upload',
      icon: 'upload_file',
      isActive: pathname === '/solve/upload',
    },
    {
      name: 'Write & Solve',
      href: '/solve/write',
      icon: 'draw',
      isActive: pathname === '/solve/write',
    },
    {
      name: 'Type & Solve',
      href: '/solve/type',
      icon: 'keyboard',
      isActive: pathname === '/solve/type',
    },
    {
      name: 'Notebook',
      href: '/solve/notebook',
      icon: 'menu_book',
      isActive: pathname === '/solve/notebook',
    },
  ];

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      router.push('/auth');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-hairline">
      <div className="h-16 w-full px-3 sm:px-margin flex items-center justify-between gap-2 sm:gap-space-md max-w-[1520px] mx-auto">
        {/* Logo & Version telemetry */}
        <div className="flex items-center gap-2 sm:gap-space-md shrink-0">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center relative transition-transform group-hover:scale-105 shrink-0">
              <div className="w-4 h-4 rounded-full bg-surface flex items-center justify-center shadow-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-amber"></div>
              </div>
            </div>
            <span className="font-headline-sm text-base sm:text-headline-sm tracking-tight text-ink font-semibold">
              Math<span className="text-amber">Lens</span>
            </span>
          </Link>
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container font-code-sm text-[11px] text-ink-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
            <span>TS CAS v1.0</span>
          </div>
        </div>

        {/* Desktop Navigation Pill Switcher */}
        <nav className="hidden md:flex items-center gap-1 p-1 rounded-full bg-surface-container-low border border-hairline">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3.5 py-1 rounded-full font-body-sm text-body-sm transition-all whitespace-nowrap cursor-pointer ${
                link.isActive
                  ? 'bg-amber text-ink font-semibold shadow-sm'
                  : 'text-ink-muted hover:text-ink hover:bg-surface-container'
              }`}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Right Actions: Session User & Sign Out */}
        <div className="flex items-center gap-1.5 sm:gap-2 relative shrink-0">
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer border border-hairline"
              type="button"
              aria-expanded={userMenuOpen}
              aria-label="User profile menu"
            >
              <span className="hidden sm:inline font-code-sm text-code-sm text-ink max-w-[100px] md:max-w-[120px] truncate">
                {isPending ? '...' : userDisplayName}
              </span>
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-on-primary font-semibold text-xs shadow-xs shrink-0">
                {session?.user?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.image}
                    alt={userDisplayName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span>{userInitial}</span>
                )}
              </div>
            </button>

            {/* Profile Dropdown Menu */}
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl bg-surface border border-hairline shadow-lg py-1.5 z-50">
                <div className="px-3 py-2 border-b border-hairline">
                  <p className="text-xs font-semibold text-ink truncate">{session?.user?.name || userDisplayName}</p>
                  <p className="text-[11px] text-ink-muted truncate">{session?.user?.email || 'Authenticated'}</p>
                </div>
                <Link
                  href="/"
                  className="w-full text-left px-3 py-1.5 text-xs text-ink hover:bg-surface-container flex items-center gap-2"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <span className="material-symbols-outlined text-[15px]">home</span>
                  Back to Home
                </Link>
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-3 py-1.5 text-xs text-error hover:bg-error-container/40 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">logout</span>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Sub-bar */}
      <div className="md:hidden w-full border-t border-hairline bg-surface/95 backdrop-blur-md px-3 py-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none]">
        <nav className="flex items-center gap-1.5 min-w-max mx-auto justify-start">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1 rounded-full font-body-sm text-xs transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                link.isActive
                  ? 'bg-amber text-ink font-semibold shadow-xs'
                  : 'text-ink-muted hover:text-ink hover:bg-surface-container bg-surface-container-low'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">{link.icon}</span>
              <span>{link.name}</span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
