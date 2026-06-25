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
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    fetchFriends();
    fetchRequests();
    fetchAllUsers();
    fetchBlockedUsers();
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
      const [usersRes, blockedRes] = await Promise.all([
        axios.get('/api/users'),
        axios.get(`/api/friends/blocked/${user.id}`)
      ]);
      const blockedIds = new Set(blockedRes.data.map(b => b.id));
      const filtered = usersRes.data.filter(u => u.id !== user.id && !blockedIds.has(u.id));
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

  const handleDeleteFriend = async (friendId) => {
    if (!confirm('确定删除该好友？')) return;
    await axios.delete(`/api/friends/${user.id}/${friendId}`);
    fetchFriends();
  };

  const handleBlockUser = async (userId2) => {
    if (!confirm('确定拉黑该用户？拉黑后将解除好友关系')) return;
    await axios.post('/api/friends/block', { blockerId: user.id, blockedId: userId2 });
    fetchFriends();
    fetchBlockedUsers();
  };

  const fetchBlockedUsers = async () => {
    try {
      const res = await axios.get(`/api/friends/blocked/${user.id}`);
      setBlockedUsers(res.data);
    } catch { /* silent */ }
  };

  const handleUnblockUser = async (blockedId) => {
    if (!confirm('确定解除拉黑？')) return;
    try {
      await axios.post('/api/friends/unblock', { blockerId: user.id, blockedId });
      fetchBlockedUsers();
      fetchAllUsers();
    } catch (e) {
      alert('操作失败');
    }
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const UserCard = ({ user: targetUser, showAction = true, isFriendCard = false }) => (
    <div className={`card flex items-center justify-between ${selectMode && isFriendCard ? 'cursor-pointer hover:bg-white/10' : ''}`}
      onClick={() => selectMode && isFriendCard && toggleSelect(targetUser.id)}>
      <div className="flex items-center gap-4 flex-1">
        {selectMode && isFriendCard && (
          <input type="checkbox" checked={selectedIds.has(targetUser.id)} onChange={() => toggleSelect(targetUser.id)}
            className="w-5 h-5 accent-purple-500 rounded" onClick={e => e.stopPropagation()} />
        )}
        <div className="flex items-center gap-4">
          <Link to={`/profile/${targetUser.id}`} onClick={e => e.stopPropagation()} className="relative">
            <img src={targetUser.avatar} alt={targetUser.username} className="w-16 h-16 rounded-full border-2 border-white/30 hover:opacity-80 transition-opacity" />
            {targetUser.banned && <span className="absolute -bottom-1 -right-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">封</span>}
          </Link>
          <div>
            <Link to={`/messages?chat=${targetUser.id}`} onClick={e => e.stopPropagation()} className="font-semibold text-lg hover:underline hover:text-blue-400 transition-colors">{targetUser.username}{targetUser.banned && <span className="ml-2 text-xs text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">已封号</span>}</Link>
            <p className="text-gray-400 text-sm">{targetUser.bio}</p>
          </div>
        </div>
      </div>
      {!selectMode && <div className="flex gap-2">
        {isFriendCard && (
          <>
            <button onClick={() => handleDeleteFriend(targetUser.id)} className="px-3 py-1.5 text-xs bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30">删除</button>
            <button onClick={() => handleBlockUser(targetUser.id)} className="px-3 py-1.5 text-xs bg-gray-500/20 text-gray-400 rounded-lg hover:bg-gray-500/30">拉黑</button>
          </>
        )}
        {showAction && !isFriendCard && (
          <button onClick={() => handleAddFriend(targetUser.id)} disabled={isFriend(targetUser.id) || hasPendingRequest(targetUser.id)}
            className={`btn-primary ${(isFriend(targetUser.id) || hasPendingRequest(targetUser.id)) ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {isFriend(targetUser.id) ? '已是好友' : hasPendingRequest(targetUser.id) ? '已发送' : '+ 添加好友'}
          </button>
        )}
      </div>}
    </div>
  );

  const handleCreateGroup = async () => {
    if (!groupName.trim()) { alert('请输入群名称'); return; }
    try {
      await axios.post('/api/groups', { name: groupName.trim(), memberIds: Array.from(selectedIds) });
      setShowGroupModal(false); setSelectMode(false); setSelectedIds(new Set()); setGroupName('');
      alert('群聊创建成功！请在消息页面查看');
    } catch (e) { alert('创建失败: ' + (e.response?.data?.message || e.message)); }
  };

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
          <button
            onClick={() => setActiveTab('blocked')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
              activeTab === 'blocked'
                ? 'bg-white/90 text-black'
                : 'glass-effect text-gray-300'
            }`}
          >
            🚫 黑名单 {blockedUsers.length > 0 && `(${blockedUsers.length})`}
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
                {friends.length > 0 && (
                  <div className="flex gap-2 mb-3">
                    {!selectMode ? (
                      <button onClick={() => setSelectMode(true)} className="px-4 py-2 text-sm bg-purple-500/20 text-purple-400 rounded-xl hover:bg-purple-500/30 transition">
                        👥 创建群聊
                      </button>
                    ) : (
                      <>
                        <button onClick={() => { setShowGroupModal(true); }} disabled={selectedIds.size === 0}
                          className="px-4 py-2 text-sm bg-purple-500 text-white rounded-xl disabled:opacity-30 transition">
                          创建 ({selectedIds.size})
                        </button>
                        <button onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}
                          className="px-4 py-2 text-sm bg-gray-500/20 text-gray-400 rounded-xl transition">取消</button>
                      </>
                    )}
                  </div>
                )}
                {friends.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="text-6xl mb-4">👥</div>
                    <h3 className="text-2xl font-bold text-gray-300 mb-2">暂无好友</h3>
                    <p className="text-gray-500">去发现新朋友吧</p>
                  </div>
                ) : (
                  friends.map((friend) => (
                    <UserCard key={friend.id} user={friend} showAction={false} isFriendCard={true} />
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

            {activeTab === 'blocked' && (
              <>
                {blockedUsers.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="text-6xl mb-4">🚫</div>
                    <h3 className="text-2xl font-bold text-gray-300 mb-2">黑名单为空</h3>
                    <p className="text-gray-500">没有被拉黑的用户</p>
                  </div>
                ) : (
                  blockedUsers.map((blocked) => (
                    <div key={blocked.id} className="card flex items-center justify-between">
                      <Link to={`/profile/${blocked.id}`} className="flex items-center gap-4 hover:opacity-80 transition-opacity flex-1">
                        <img src={blocked.avatar} alt={blocked.username} className="w-16 h-16 rounded-full border-2 border-red-500/30" />
                        <div>
                          <h3 className="font-semibold text-lg">{blocked.username}</h3>
                          <p className="text-red-400 text-xs">已拉黑</p>
                        </div>
                      </Link>
                      <button onClick={() => handleUnblockUser(blocked.id)}
                        className="px-4 py-2 text-sm bg-green-500/20 text-green-400 rounded-xl hover:bg-green-500/30 transition">
                        解除拉黑
                      </button>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* 创建群聊弹窗 */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowGroupModal(false)}>
          <div className="card max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">创建群聊</h3>
            <p className="text-gray-400 text-sm mb-2">已选 {selectedIds.size} 位好友</p>
            <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="群聊名称（可选）"
              className="input-field mb-4" autoFocus />
            <div className="flex gap-3">
              <button onClick={() => setShowGroupModal(false)} className="btn-secondary flex-1">取消</button>
              <button onClick={handleCreateGroup} className="btn-primary flex-1">创建群聊</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Friends;
