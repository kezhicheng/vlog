import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import useMobile from '../hooks/useMobile';
import Notifications from './Notifications';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useMobile();
  const [siteName, setSiteName] = useState('Vlog Life');

  useEffect(() => {
    axios.get('/api/site-name').then(r => setSiteName(r.data.name)).catch(() => {});
  }, []);

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="glass-effect sticky top-0 z-50 border-b border-white/10">
      <div className="container mx-auto px-4 py-2 md:py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-xl md:text-2xl font-bold gradient-text">
            {siteName}
          </Link>

          {!isMobile && (
            <div className="flex items-center gap-6">
              <Link to="/feed" className={`transition-colors duration-300 ${isActive('/feed') ? 'text-white font-semibold' : 'text-gray-400 hover:text-white'}`}>📡 动态</Link>
              <Link to="/" className={`transition-colors duration-300 ${isActive('/') ? 'text-white font-semibold' : 'text-gray-400 hover:text-white'}`}>主页</Link>
              <Link to="/discover" className={`transition-colors duration-300 ${isActive('/discover') ? 'text-white font-semibold' : 'text-gray-400 hover:text-white'}`}>发现</Link>
              <Link to="/friends" className={`transition-colors duration-300 ${isActive('/friends') ? 'text-white font-semibold' : 'text-gray-400 hover:text-white'}`}>好友</Link>
              <Link to="/messages" className={`transition-colors duration-300 ${isActive('/messages') ? 'text-white font-semibold' : 'text-gray-400 hover:text-white'}`}>私信</Link>
              <Link to="/shares" className={`transition-colors duration-300 ${isActive('/shares') ? 'text-white font-semibold' : 'text-orange-400 hover:text-orange-300'}`}>🔥 好物</Link>
              <Link to="/visitors" className={`transition-colors duration-300 ${isActive('/visitors') ? 'text-white font-semibold' : 'text-gray-400 hover:text-white'}`}>访客</Link>
              {user?.role === 'admin' && (
                <Link to="/admin" className={`transition-colors duration-300 ${isActive('/admin') ? 'text-white font-semibold' : 'text-yellow-400 hover:text-yellow-300'}`}>🛡 管理</Link>
              )}
            </div>
          )}

          <div className="flex items-center gap-1 md:gap-3">
            <Link to="/search" className="p-2 hover:bg-white/10 rounded-xl transition" title="搜索">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </Link>
            <Notifications />
            <Link to={`/profile/${user?.id}`} className="flex items-center gap-2 glass-effect px-3 md:px-4 py-1.5 md:py-2 rounded-full hover:bg-white/20 transition-all duration-300">
              <img src={user?.avatar} alt={user?.username} className="w-7 md:w-8 h-7 md:h-8 rounded-full" />
              <span className="text-sm font-medium hidden sm:inline">{user?.username}</span>
            </Link>
            {!isMobile && (
              <button onClick={handleLogout} className="btn-secondary">退出</button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
