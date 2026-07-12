'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';

const navItems = [
  { label: 'Home', href: '/', icon: '🏠' },
];

export function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="s-app">
      <header className="s-header">
        <div className="s-logo">
          <span style={{ fontSize: 20 }}>🍴</span>
          DineSync
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Student Portal</span>
          <button 
            onClick={async () => {
              try {
                await api.post('/api/auth/logout');
              } catch (e) {}
              document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
              window.location.href = '/login';
            }}
            style={{ 
              background: 'rgba(244,63,94,0.1)', border: 'none', color: 'var(--red)', fontSize: 12, 
              cursor: 'pointer', fontWeight: 600, padding: '4px 10px', borderRadius: 12
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <div className="s-content has-bottom-nav">
        {children}
      </div>

      <nav className="bottom-nav">
        {navItems.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="bottom-nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
