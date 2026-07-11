'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  section?: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: '⚡', section: 'Overview' },
  { label: 'Students', href: '/students', icon: '👥', section: 'Management' },
  { label: 'Devices', href: '/devices', icon: '📡', section: 'Management' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const sections = Array.from(new Set(navItems.map((n) => n.section)));

  const handleLogout = async () => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    router.push('/login');
  };

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">
          <div className="logo-icon">🍴</div>
          <div>
            <div className="logo-text">DineSync</div>
            <div className="logo-badge">Admin Console</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {sections.map((section) => (
          <div key={section}>
            <div className="nav-section-label">{section}</div>
            {navItems
              .filter((n) => n.section === section)
              .map((item) => {
                const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-link ${isActive ? 'active' : ''}`}
                  >
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          onClick={handleLogout}
          className="nav-link"
          style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}
        >
          <span style={{ fontSize: 16 }}>🚪</span>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
