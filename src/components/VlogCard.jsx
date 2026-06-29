import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import CurvedCarousel from './CurvedCarousel';

const VlogCard = ({ vlog, onPrivacyChange }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = React.useState({});
  const [showVideo, setShowVideo] = useState(false);
  const [heartAnim, setHeartAnim] = useState(false);

  React.useEffect(() => {
    // 获取用户信息
    const fetchUser = async () => {
      try {
        const response = await fetch(`/api/users/${vlog.userId}`);
        const userData = await response.json();
        setUsers(prev => ({ ...prev, [vlog.userId]: userData }));
      } catch (error) {
        console.error('获取用户信息失败:', error);
      }
    };
    fetchUser();
  }, [vlog.userId]);

  const vlogUser = users[vlog.userId];
  const isOwner = user?.id === vlog.userId;

  const handlePrivacyChange = async (newPrivacy) => {
    try {
      await fetch(`/api/vlogs/${vlog.id}/privacy`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privacy: newPrivacy })
      });
      onPrivacyChange?.();
    } catch (error) {
      console.error('更新隐私设置失败:', error);
    }
  };

  return (
    <>
      <div
        className="card group hover:scale-[1.02] transition-transform duration-300 cursor-pointer relative overflow-hidden"
        onClick={() => navigate(`/vlog/${vlog.id}`)}
        onDoubleClick={() => { setHeartAnim(true); setTimeout(() => setHeartAnim(false), 900); }}
      >
        {heartAnim && <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl z-20 pointer-events-none animate-heartBurst">❤️</span>}
        {/* 图片轮播或缩略图/视频 */}
        <div className="relative overflow-hidden rounded-xl mb-4">
          {vlog.images && vlog.images.length > 0 ? (
            <CurvedCarousel images={vlog.images} />
          ) : (
            <img
              src={vlog.thumbnail}
              alt={vlog.title}
              className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110"
            />
          )}

          {/* 播放按钮 - 仅当有视频时显示 */}
          {vlog.videoUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowVideo(true);
              }}
              className="absolute inset-0 bg-black/30 flex items-center justify-center transition-all duration-300 hover:bg-black/50 z-10"
            >
              <div className="bg-white/90 backdrop-blur rounded-full p-4 transform hover:scale-125 transition-transform shadow-lg">
                <svg className="w-12 h-12 text-black" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </button>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4 pointer-events-none z-20">
            {vlogUser && (
              <Link
                to={`/profile/${vlogUser.id}`}
                className="flex items-center gap-2 hover:scale-105 transition-transform pointer-events-auto"
              >
                <img
                  src={vlogUser.avatar}
                  alt={vlogUser.username}
                  className="w-8 h-8 rounded-full border-2 border-white"
                />
                <span className="text-white font-semibold">{vlogUser.username}</span>
              </Link>
            )}
          </div>
          {vlog.privacy === 'private' && (
            <div className="absolute top-2 right-2 bg-red-500/80 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold">
              🔒 私密
            </div>
          )}
        </div>

        {/* 内容 */}
        <div>
          <h3 className="text-xl font-bold mb-2 text-white">{vlog.title}</h3>
          <p className="text-gray-300 text-sm mb-4 line-clamp-2">{vlog.content}</p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>❤️ {vlog.likes}</span>
              <span>👁️ {vlog.views}</span>
            </div>

            {isOwner && (
              <select
                value={vlog.privacy}
                onChange={(e) => handlePrivacyChange(e.target.value)}
                className="glass-effect px-3 py-1 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                onClick={(e) => e.stopPropagation()}
              >
                <option value="public">🌍 公开</option>
                <option value="friends">👥 好友</option>
                <option value="followers">👁 关注</option>
                <option value="private">🔒 私密</option>
              </select>
            )}
          </div>

          <div className="mt-3 text-xs text-gray-500">
            {new Date(vlog.createdAt).toLocaleString('zh-CN')}
          </div>
        </div>
      </div>

      {/* 视频播放模态框 */}
      {showVideo && vlog.videoUrl && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowVideo(false)}
        >
          <div className="relative max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowVideo(false)}
              className="absolute -top-12 right-0 text-white hover:text-purple-400 transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <video
              src={vlog.videoUrl}
              controls
              autoPlay
              className="w-full rounded-xl shadow-2xl"
            />
            <div className="mt-4 text-white">
              <h2 className="text-2xl font-bold mb-2">{vlog.title}</h2>
              <p className="text-gray-300">{vlog.content}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VlogCard;
