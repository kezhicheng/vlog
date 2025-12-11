import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';

const Visitors = () => {
  const { user } = useAuth();
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVisitors();
  }, [user.id]);

  const fetchVisitors = async () => {
    try {
      const response = await axios.get(`/api/visitors/${user.id}`);
      setVisitors(response.data);
    } catch (error) {
      console.error('获取访客列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">我的访客</h1>
          <p className="text-gray-400">看看谁来过你的主页</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
          </div>
        ) : visitors.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">👻</div>
            <h3 className="text-2xl font-bold text-gray-300 mb-2">还没有访客</h3>
            <p className="text-gray-500">分享你的主页让更多人看到吧</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visitors.map((visit) => (
              <div key={visit.id} className="card">
                <Link
                  to={`/profile/${visit.visitor.id}`}
                  className="flex items-center justify-between hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={visit.visitor.avatar}
                      alt={visit.visitor.username}
                      className="w-16 h-16 rounded-full border-2 border-white/30"
                    />
                    <div>
                      <h3 className="font-semibold text-lg">{visit.visitor.username}</h3>
                      <p className="text-gray-400 text-sm">{visit.visitor.bio}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">{formatTime(visit.visitedAt)}</p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Visitors;
