import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [siteName, setSiteName] = useState('Vlog Life');
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('/api/auth/registration-status').then(res => setRegistrationEnabled(res.data.enabled)).catch(() => {});
    axios.get('/api/site-name').then(res => setSiteName(res.data.name)).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = isLogin
        ? await login(formData.email, formData.password)
        : await register(formData.username, formData.email, formData.password);
      if (result.success) navigate('/');
      else setError(result.message);
    } catch { setError('操作失败，请重试'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-white/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-white/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="card max-w-md w-full relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2 animate-glow">{siteName}</h1>
          <p className="text-gray-300">分享你的精彩日常</p>
        </div>

        <div className="flex gap-4 mb-6">
          <button onClick={() => setIsLogin(true)} className={`flex-1 py-2 rounded-xl font-semibold transition ${isLogin ? 'bg-white/90 text-black' : 'glass-effect text-gray-300'}`}>登录</button>
          {registrationEnabled && (
            <button onClick={() => setIsLogin(false)} className={`flex-1 py-2 rounded-xl font-semibold transition ${!isLogin ? 'bg-white/90 text-black' : 'glass-effect text-gray-300'}`}>注册</button>
          )}
        </div>

        {!registrationEnabled && !isLogin && (
          <div className="bg-yellow-500/20 border border-yellow-500/50 text-yellow-200 px-4 py-3 rounded-xl mb-4 text-sm text-center">⚠️ 管理员已关闭公开注册，请联系管理员创建账号</div>
        )}
        {!registrationEnabled && isLogin && (
          <div className="bg-yellow-500/20 border border-yellow-500/50 text-yellow-200 px-4 py-3 rounded-xl mb-4 text-sm text-center">🔒 注册功能已关闭，仅管理员可创建新用户</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">用户名</label>
              <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})}
                className="input-field" placeholder="请输入用户名" required={!isLogin} />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">邮箱/手机号</label>
            <input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
              className="input-field" placeholder="请输入邮箱或手机号" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">密码</label>
            <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
              className="input-field" placeholder="请输入密码" required />
          </div>
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl whitespace-pre-line">{error}</div>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? '处理中...' : isLogin ? '登录' : '注册'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
