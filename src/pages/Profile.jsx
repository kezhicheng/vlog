import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import VlogCard from '../components/VlogCard';
import EditProfile from '../components/EditProfile';
import { useAuth } from '../contexts/AuthContext';

const Profile = () => {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [profileUser, setProfileUser] = useState(null);
  const [vlogs, setVlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFriend, setIsFriend] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    if (userId) {
      fetchProfile();
      fetchVlogs();

      // 只有不是自己的主页时才检查好友关系和记录访客
      if (!isOwnProfile && currentUser?.id) {
        checkFriendship();
        recordVisit();
      }
    }
  }, [userId, currentUser?.id]);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`/api/users/${userId}`);
      setProfileUser(response.data);
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
  };

  const fetchVlogs = async () => {
    try {
      const response = await axios.get(`/api/vlogs/user/${userId}`, {
        params: { currentUserId: currentUser.id }
      });
      setVlogs(response.data);
    } catch (error) {
      console.error('获取Vlog失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFriendship = async () => {
    try {
      const response = await axios.get(`/api/friends/${currentUser.id}`);
      const friends = response.data;
      setIsFriend(friends.some(f => f.id === userId));
    } catch (error) {
      console.error('检查好友关系失败:', error);
    }
  };

  const recordVisit = async () => {
    try {
      await axios.post('/api/visitors', {
        userId,
        visitorId: currentUser.id
      });
    } catch (error) {
      console.error('记录访客失败:', error);
    }
  };

  const handleAddFriend = async () => {
    try {
      await axios.post('/api/friends', {
        userId: currentUser.id,
        friendId: userId
      });
      alert('好友请求已发送');
      checkFriendship();
    } catch (error) {
      alert(error.response?.data?.message || '添加失败');
    }
  };

  const handleSendMessage = () => {
    navigate('/messages');
  };

  if (loading || !profileUser) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        {/* 用户信息卡片 */}
        <div className="card mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <img
              src={profileUser.avatar}
              alt={profileUser.username}
              className="w-32 h-32 rounded-full border-4 border-white/30 shadow-lg shadow-white/10"
            />
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl font-bold gradient-text mb-2">
                {profileUser.username}
              </h1>
              <p className="text-gray-400 mb-2">{profileUser.bio}</p>
              {profileUser.location && (
                <div className="flex items-center gap-2 justify-center md:justify-start mb-4">
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-gray-400">IP属地：{profileUser.location}</span>
                </div>
              )}
              <div className="flex items-center gap-6 justify-center md:justify-start text-sm">
                <Link to={`/profile/${userId}`} className="hover:opacity-80 transition-opacity">
                  <span className="font-bold text-2xl gradient-text">{vlogs.length}</span>
                  <p className="text-gray-400">Vlogs</p>
                </Link>
                <Link to={`/albums/${userId}`} className="hover:opacity-80 transition-opacity">
                  <span className="font-bold text-2xl gradient-text">📷</span>
                  <p className="text-gray-400">相册</p>
                </Link>
              </div>
            </div>

            {isOwnProfile ? (
              <button
                onClick={() => setShowEditModal(true)}
                className="btn-primary flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                编辑资料
              </button>
            ) : (
              <div className="flex gap-3 flex-wrap justify-center md:justify-start">
                {!isFriend && (
                  <button onClick={handleAddFriend} className="btn-primary flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    添加好友
                  </button>
                )}
                <button onClick={handleSendMessage} className="btn-secondary flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  发私信
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Vlog列表 */}
        <div>
          <h2 className="text-2xl font-bold mb-6">
            {isOwnProfile ? '我的Vlog' : `${profileUser.username}的Vlog`}
          </h2>

          {vlogs.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📹</div>
              <h3 className="text-2xl font-bold text-gray-300 mb-2">
                {isOwnProfile ? '还没有发布Vlog' : '该用户还没有发布Vlog'}
              </h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vlogs.map((vlog) => (
                <VlogCard key={vlog.id} vlog={vlog} onPrivacyChange={fetchVlogs} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 编辑资料模态框 */}
      <EditProfile
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={fetchProfile}
      />
    </div>
  );
};

export default Profile;
