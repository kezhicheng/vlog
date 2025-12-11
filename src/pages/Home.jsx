import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import VlogCard from '../components/VlogCard';
import CreateVlog from '../components/CreateVlog';
import MusicPlayer from '../components/MusicPlayer';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const { user } = useAuth();
  const [vlogs, setVlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchVlogs = async () => {
    try {
      // 只获取当前用户自己的Vlog
      const response = await axios.get(`/api/vlogs/user/${user.id}`, {
        params: { currentUserId: user.id }
      });
      setVlogs(response.data);
    } catch (error) {
      console.error('获取Vlog列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVlogs();
  }, [user.id]);

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">我的Vlog</h1>
            <p className="text-gray-400">记录生活中的美好瞬间</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            创建Vlog
          </button>
        </div>

        {/* Vlog列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
          </div>
        ) : vlogs.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📹</div>
            <h3 className="text-2xl font-bold text-gray-300 mb-2">还没有发布Vlog</h3>
            <p className="text-gray-500 mb-6">开始记录你的精彩生活吧</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              创建第一个Vlog
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vlogs.map((vlog) => (
              <VlogCard
                key={vlog.id}
                vlog={vlog}
                onPrivacyChange={fetchVlogs}
              />
            ))}
          </div>
        )}
      </div>

      <CreateVlog
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchVlogs}
      />
      
    </div>
  );
};

export default Home;
