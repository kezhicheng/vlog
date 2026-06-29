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

  // 今日运势
  const fortunes = [
    '☀️ 今日宜：和朋友吹牛，牛的影子能遮住所有烦恼',
    '🎨 今日宜：把生活当成调色盘，大胆配一次颜色',
    '🚀 摸鱼指数 87%，剩下的13%用来给今天找个开心的理由',
    '🌸 你笑起来很好看，今天多笑几次吧',
    '🍀 好运正在派件中，请保持心情通畅签收',
    '💪 你已经很棒了，放松一点，今天也是闪闪发光的一天',
    '🌈 别怕走得慢，每一步都算数，何况你还有零食',
    '🎵 今日BGM推荐：窗外鸟叫声 + 键盘敲击声 = 人间值得',
    '☕ 咖啡是大人世界的魔法药水，喝一口，今天稳了',
    '⭐ 你今天有99%的概率会开心，因为有个小幸运在等你',
    '🦋 不必完美，像你这样刚刚好，今天也是',
    '🌻 太阳每天升起，你也每天重新开始，多牛啊',
    '🎯 今天的目标：开心指数拉满，焦虑值清零',
    '🍕 紧急提醒：今天特别适合奖励自己一份好吃的',
    '📝 你今天做的事，会在明天开出花来',
    '🐱 猫咪都觉得你很棒，请务必相信这一点',
    '🌊 心情像海浪，起起落落才有趣，今天在浪尖上',
    '💎 你是一颗在打磨中的钻石，今天又闪了一点',
    '🎪 生活就是一个大游乐场，今天多玩几个项目',
    '🔥 你的热情是限量版，今天也要燃烧一小会儿',
  ];
  const [fortune] = useState(() => fortunes[Math.floor(Math.random() * fortunes.length)]);

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
    if (!user?.id) return;
    fetchVlogs();
  }, [user?.id]);

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">我的Vlog</h1>
            <p className="text-gray-400">记录生活中的美好瞬间</p>
            <div className="mt-3 glass-effect rounded-2xl px-4 py-2 inline-block text-sm text-gray-300 animate-pulse">
              {fortune}
            </div>
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
