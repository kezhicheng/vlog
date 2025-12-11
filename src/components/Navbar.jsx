import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="glass-effect sticky top-0 z-50 border-b border-white/10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold gradient-text">
            Vlog Life
          </Link>

          <div className="flex items-center gap-6">
            <Link
              to="/"
              className={`transition-colors duration-300 ${
                isActive('/') ? 'text-white font-semibold' : 'text-gray-400 hover:text-white'
              }`}
            >
              主页
            </Link>
            <Link
              to="/discover"
              className={`transition-colors duration-300 ${
                isActive('/discover') ? 'text-white font-semibold' : 'text-gray-400 hover:text-white'
              }`}
            >
              发现
            </Link>
            <Link
              to="/friends"
              className={`transition-colors duration-300 ${
                isActive('/friends') ? 'text-white font-semibold' : 'text-gray-400 hover:text-white'
              }`}
            >
              好友
            </Link>
            <Link
              to="/messages"
              className={`transition-colors duration-300 ${
                isActive('/messages') ? 'text-white font-semibold' : 'text-gray-400 hover:text-white'
              }`}
            >
              私信
            </Link>
            <Link
              to="/visitors"
              className={`transition-colors duration-300 ${
                isActive('/visitors') ? 'text-white font-semibold' : 'text-gray-400 hover:text-white'
              }`}
            >
              访客
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to={`/profile/${user?.id}`}
              className="flex items-center gap-2 glass-effect px-4 py-2 rounded-full hover:bg-white/20 transition-all duration-300"
            >
              <img
                src={user?.avatar}
                alt={user?.username}
                className="w-8 h-8 rounded-full"
              />
              <span className="text-sm font-medium">{user?.username}</span>
            </Link>
            <button
              onClick={handleLogout}
              className="btn-secondary"
            >
              退出
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
