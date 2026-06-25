import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const tabs = [
  { path: '/feed', icon: '📡', label: '动态' },
  { path: '/shares', icon: '🔥', label: '好物' },
  { path: '/friends', icon: '👥', label: '好友' },
  { path: '/messages', icon: '💬', label: '消息' },
  { path: `/profile/${null}`, icon: '👤', label: '我的', dynamic: true },
];

export default function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  return (
    <nav className="mobile-nav">
      {tabs.map(t => {
        const path = t.dynamic && user ? `/profile/${user.id}` : t.path;
        const active = location.pathname === path || (t.path === '/' && location.pathname === '/');
        return (
          <button
            key={t.label}
            onClick={() => navigate(path)}
            className={`mobile-nav-item ${active ? 'active' : ''}`}
          >
            <span className="text-xl">{t.icon}</span>
            <span className="text-[10px]">{t.label}</span>
          </button>
        );
      })}
      {user?.role === 'admin' && (
        <button
          onClick={() => navigate('/admin')}
          className={`mobile-nav-item ${location.pathname === '/admin' ? 'active' : ''}`}
        >
          <span className="text-xl">🛡</span>
          <span className="text-[10px]">管理</span>
        </button>
      )}
    </nav>
  );
}
