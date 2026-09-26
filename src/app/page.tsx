'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Notes } from '@/components/Notes';
import { UserMenu } from '@/components/UserMenu';
import { UserManagement } from '@/components/UserManagement';

export default function HomePage() {
  const [showUserManagement, setShowUserManagement] = useState(false);
  const appShellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    let settleTimer = 0;

    const apply = () => {
      const shell = appShellRef.current;
      if (!shell || viewport.scale !== 1) return;

      const keyboardOpen = window.innerHeight - viewport.height > 150;
      if (keyboardOpen) return;

      shell.style.height = `${Math.round(viewport.height)}px`;
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };

    const handleChange = () => {
      apply();
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(apply, 300);
    };

    handleChange();
    viewport.addEventListener('resize', handleChange);
    window.addEventListener('orientationchange', handleChange);

    return () => {
      window.clearTimeout(settleTimer);
      viewport.removeEventListener('resize', handleChange);
      window.removeEventListener('orientationchange', handleChange);
    };
  }, []);

  return (
    <div ref={appShellRef} className="app-shell flex flex-col bg-canvas">
      <UserManagement
        isOpen={showUserManagement}
        onClose={() => setShowUserManagement(false)}
      />

      <main className="flex-1 overflow-hidden">
        <Notes
          headerActions={<UserMenu onOpenSettings={() => setShowUserManagement(true)} />}
        />
      </main>
    </div>
  );
}
