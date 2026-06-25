import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// 全局 axios 拦截器：自动带 token
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axios.interceptors.response.use(
  res => res,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    // 检测旧版本（token=纯数字ID），自动清理
    if (savedToken && /^\d+$/.test(savedToken)) {
      console.log('检测到旧版本缓存，自动清理');
      localStorage.clear();
      setLoading(false);
      return;
    }
    if (savedToken && savedUser) {
      try { setUser(JSON.parse(savedUser)); } catch { localStorage.clear(); }
    }
    setLoading(false);
  }, []);

  // 在线心跳：每3分钟上报一次活跃状态
  useEffect(() => {
    if (!user?.id) return;
    const heartbeat = setInterval(() => {
      axios.post(`/api/users/${user.id}/heartbeat`).catch(() => {});
    }, 3 * 60 * 1000);
    // 立即上报一次
    axios.post(`/api/users/${user.id}/heartbeat`).catch(() => {});
    return () => clearInterval(heartbeat);
  }, [user?.id]);

  const login = async (email, password) => {
    try {
      const { data } = await axios.post('/api/auth/login', { email, password });
      // 检查封禁状态
      if (data.banned) {
        const until = data.user.bannedUntil ? `解封时间: ${new Date(data.user.bannedUntil).toLocaleString('zh-CN')}` : '永久封禁';
        return { success: false, message: `账号已被封禁！\n原因: ${data.banReason || '无'}\n${until}` };
      }
      setUser(data.user);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      // 记录登录
      axios.post(`/api/users/${data.user.id}/login`).catch(() => {});
      return { success: true };
    } catch (e) {
      return { success: false, message: e.response?.data?.message || '登录失败' };
    }
  };

  const register = async (username, email, password) => {
    try {
      const { data } = await axios.post('/api/auth/register', { username, email, password });
      setUser(data.user);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      // 记录登录
      axios.post(`/api/users/${data.user.id}/login`).catch(() => {});
      return { success: true };
    } catch (e) {
      return { success: false, message: e.response?.data?.message || '注册失败' };
    }
  };

  const logout = async () => {
    if (user?.id) {
      try { await axios.post(`/api/users/${user.id}/logout`); } catch {}
    }
    setUser(null);
    localStorage.clear();
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser, loading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};
