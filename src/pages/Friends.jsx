import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';

const Friends = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFriends();
    fetchRequests();
    fetchAllUsers();
  }, [user.id]);

  const fetchFriends = async () => {
    try {
      const response = await axios.get(`/api/friends/${user.id}`);
      setFriends(response.data);
    } catch (error) {
      console.error('获取好友列表失败:', error);
    }
  };

  const fetchRequests = async () => {
    try {
      const response = await axios.get(`/api/friends/requests/${user.id}`);
      setRequests(response.data);
    } catch (error) {
      console.error('获取好友请求失败:', error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await axios.get('/api/users');
      const filtered = response.data.filter(u => u.id !== user.id);
      setAllUsers(filtered);
    } catch (error) {
      console.error('获取用户列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (friendId) => {
    try {
      await axios.post('/api/friends', {
        userId: user.id,
        friendId
      });
      alert('好友请求已发送');
      fetchAllUsers();
    } catch (error) {
      alert(error.response?.data?.message || '添加失败');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await axios.patch(`/api/friends/${requestId}/accept`);
      fetchFriends();
      fetchRequests();
      fetchAllUsers();
    } catch (error) {
      alert('接受失败');
    }
  };

  const isFriend = (userId) => {
    return friends.some(f => f.id === userId);
  };

  const hasPendingRequest = (userId) => {
    return requests.some(r => r.userId === userId);
  };

  const UserCard = ({ user: targetUser, showAction = true }) => (
    <div className="card flex items-center justify-between">
      <Link
        to={`/profile/${targetUser.id}`}
        className="flex items-center gap-4 flex-1 hover:opacity-80 transition-opacity"
      >
        <img
          src={targetUser.avatar}
          alt={targetUser.username}
          className="w-16 h-16 rounded-full border-2 border-white/30"
        />
        <div>
          <h3 className="font-semibold text-lg">{targetUser.username}</h3>
          <p className="text-gray-400 text-sm">{targetUser.bio}</p>
        </div>
      </Link>
      {showAction && (
        <button
          onClick={() => handleAddFriend(targetUser.id)}
          disabled={isFriend(targetUser.id) || hasPendingRequest(targetUser.id)}
          className={`btn-primary ${
            (isFriend(targetUser.id) || hasPendingRequest(targetUser.id))
              ? 'opacity-50 cursor-not-allowed'
              : ''
          }`}
        >
          {isFriend(targetUser.id) ? '已是好友' : hasPendingRequest(targetUser.id) ? '已发送' : '+ 添加好友'}
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold gradient-text mb-8">好友管理</h1>

        {/* 标签切换 */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('friends')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
              activeTab === 'friends'
                ? 'bg-white/90 text-black'
                : 'glass-effect text-gray-300'
            }`}
          >
            我的好友 ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 relative ${
              activeTab === 'requests'
                ? 'bg-white/90 text-black'
                : 'glass-effect text-gray-300'
            }`}
          >
            好友请求
            {requests.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {requests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('discover')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
              activeTab === 'discover'
                ? 'bg-white/90 text-black'
                : 'glass-effect text-gray-300'
            }`}
          >
            发现新朋友
          </button>
        </div>

        {/* 内容区域 */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {activeTab === 'friends' && (
              <>
                {friends.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="text-6xl mb-4">👥</div>
                    <h3 className="text-2xl font-bold text-gray-300 mb-2">暂无好友</h3>
                    <p className="text-gray-500">去发现新朋友吧</p>
                  </div>
                ) : (
                  friends.map((friend) => (
                    <UserCard key={friend.id} user={friend} showAction={false} />
                  ))
                )}
              </>
            )}

            {activeTab === 'requests' && (
              <>
                {requests.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="text-6xl mb-4">📭</div>
                    <h3 className="text-2xl font-bold text-gray-300 mb-2">暂无好友请求</h3>
                  </div>
                ) : (
                  requests.map((request) => (
                    <div key={request.id} className="card flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <img
                          src={request.user.avatar}
                          alt={request.user.username}
                          className="w-16 h-16 rounded-full border-2 border-white/30"
                        />
                        <div>
                          <h3 className="font-semibold text-lg">{request.user.username}</h3>
                          <p className="text-gray-400 text-sm">{request.user.bio}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptRequest(request.id)}
                          className="btn-primary"
                        >
                          接受
                        </button>
                        <button className="btn-secondary">
                          拒绝
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {activeTab === 'discover' && (
              <>
                {allUsers.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="text-6xl mb-4">🔍</div>
                    <h3 className="text-2xl font-bold text-gray-300 mb-2">暂无更多用户</h3>
                  </div>
                ) : (
                  allUsers.map((targetUser) => (
                    <UserCard key={targetUser.id} user={targetUser} />
                  ))
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Friends;
