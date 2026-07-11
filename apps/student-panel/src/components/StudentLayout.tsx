'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Student Portal</span>
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
