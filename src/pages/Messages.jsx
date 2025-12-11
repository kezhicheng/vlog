import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import EmojiPicker from '../components/EmojiPicker';
import { useAuth } from '../contexts/AuthContext';

const Messages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [friends, setFriends] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageModal, setImageModal] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchConversations();
    fetchFriends();
    fetchOnlineStatus();

    const conversationInterval = setInterval(fetchConversations, 3000);
    const onlineInterval = setInterval(fetchOnlineStatus, 10000); // 每10秒检查一次在线状态

    return () => {
      clearInterval(conversationInterval);
      clearInterval(onlineInterval);
    };
  }, [user.id]);

  useEffect(() => {
    scrollToBottom();
  }, [selectedChat?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const response = await axios.get(`/api/messages/${user.id}`);
      const newConversations = response.data;
      setConversations(newConversations);

      // 重要修复：只在当前有选中聊天时才更新，并确保更新的是正确的聊天
      if (selectedChat) {
        const updated = newConversations.find(c => c.user.id === selectedChat.user.id);
        if (updated) {
          // 使用深拷贝确保不会影响其他聊天
          setSelectedChat({
            user: { ...updated.user },
            messages: [...updated.messages],
            unread: updated.unread,
            lastMessage: updated.lastMessage ? { ...updated.lastMessage } : null
          });

          await axios.patch('/api/messages/read', {
            userId: user.id,
            otherId: updated.user.id
          });
        }
      }
    } catch (error) {
      console.error('获取消息列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFriends = async () => {
    try {
      const response = await axios.get(`/api/friends/${user.id}`);
      setFriends(response.data);
    } catch (error) {
      console.error('获取好友列表失败:', error);
    }
  };

  const fetchOnlineStatus = async () => {
    try {
      // 假设后端有一个 API 返回在线用户列表
      const response = await axios.get('/api/users/online');
      setOnlineUsers(new Set(response.data.map(u => u.id)));
    } catch (error) {
      console.error('获取在线状态失败:', error);
      // 如果后端还没有这个 API，可以暂时模拟数据
      // setOnlineUsers(new Set([1, 2, 3])); // 模拟一些在线用户
    }
  };

  const isUserOnline = (userId) => {
    return onlineUsers.has(userId);
  };

  const handleSelectChat = async (person) => {
    console.log('点击的好友 ID:', person.id);
    console.log('当前 conversations:', conversations);

    // 清空当前选中，避免残留
    setSelectedChat(null);

    // 等待一下让状态清空
    await new Promise(resolve => setTimeout(resolve, 50));

    // 重新从服务器获取最新的会话数据
    try {
      const response = await axios.get(`/api/messages/${user.id}`);
      const latestConversations = response.data;

      console.log('最新获取的 conversations:', latestConversations);

      // 从最新数据中查找
      let conversation = latestConversations.find(c => c.user.id === person.id);

      console.log('找到的 conversation:', conversation);

      if (!conversation) {
        // 创建新会话
        conversation = {
          user: { ...person },
          messages: [],
          unread: 0,
          lastMessage: null
        };
      }

      // 设置选中的聊天
      setSelectedChat({
        user: { ...conversation.user },
        messages: JSON.parse(JSON.stringify(conversation.messages)), // 使用 JSON 深拷贝
        unread: conversation.unread,
        lastMessage: conversation.lastMessage ? { ...conversation.lastMessage } : null
      });

      // 标记为已读
      if (conversation.messages.length > 0) {
        await axios.patch('/api/messages/read', {
          userId: user.id,
          otherId: person.id
        });
      }

      // 更新 conversations 状态
      setConversations(latestConversations);

    } catch (error) {
      console.error('选择聊天失败:', error);
    }
  };

  const checkMessageLimit = () => {
    if (!selectedChat) return { canSend: false, isFriend: false, messageCount: 0 };

    const isFriend = friends.some(f => f.id === selectedChat.user.id);
    const sentMessages = selectedChat.messages.filter(m => m.senderId === user.id);

    return {
      canSend: isFriend || sentMessages.length === 0,
      isFriend,
      messageCount: sentMessages.length
    };
  };

  const getMaxLength = () => {
    const { isFriend } = checkMessageLimit();
    return isFriend ? 999 : 99;
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    const { canSend, isFriend } = checkMessageLimit();

    if (!canSend) {
      alert('非好友只能发送一条消息，请等待对方添加好友后继续聊天');
      return;
    }

    const maxLength = getMaxLength();
    if (newMessage.length > maxLength) {
      alert(`消息不能超过${maxLength}字`);
      return;
    }

    try {
      await axios.post('/api/messages', {
        senderId: user.id,
        receiverId: selectedChat.user.id,
        content: newMessage,
        type: 'text'
      });

      setNewMessage('');
      fetchConversations();
    } catch (error) {
      alert(error.response?.data?.message || '发送失败');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const { canSend } = checkMessageLimit();
    if (!canSend) {
      alert('非好友只能发送一条消息，请等待对方添加好友后继续聊天');
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const uploadResponse = await axios.post('/api/messages/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      await axios.post('/api/messages', {
        senderId: user.id,
        receiverId: selectedChat.user.id,
        content: uploadResponse.data.imageUrl,
        type: 'image'
      });

      fetchConversations();
    } catch (error) {
      alert(error.response?.data?.message || '发送图片失败');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleEmojiSelect = (emoji) => {
    setNewMessage(prev => prev + emoji);
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = (msg) => {
    const isMine = msg.senderId === user.id;

    return (
        <div
            key={msg.id}
            className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-4`}
        >
          <div className={`max-w-[70%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
            {msg.type === 'image' ? (
                <img
                    src={msg.content}
                    alt="图片消息"
                    className="rounded-xl max-w-[200px] max-h-[200px] object-cover shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setImageModal(msg.content)}
                />
            ) : (
                <div
                    className={`rounded-2xl px-4 py-2 ${
                        isMine
                            ? 'bg-white/90 text-black'
                            : 'glass-effect text-white'
                    }`}
                >
                  <p className="text-base whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
            )}
            <span className="text-xs text-gray-400 mt-1 px-2">
            {formatTime(msg.createdAt)}
          </span>
          </div>
        </div>
    );
  };

  // 修复后的显示列表逻辑：合并好友列表和会话列表
  const displayList = useMemo(() => {
    // 创建一个 Map 来存储所有用户（好友）
    const userMap = new Map();

    // 先添加所有好友
    friends.forEach(friend => {
      userMap.set(friend.id, {
        user: friend,
        messages: [],
        unread: 0,
        lastMessage: null
      });
    });

    // 再用会话数据覆盖（如果存在）
    conversations.forEach(conv => {
      userMap.set(conv.user.id, conv);
    });

    // 转换为数组并排序（有最近消息的排前面）
    return Array.from(userMap.values()).sort((a, b) => {
      if (!a.lastMessage && !b.lastMessage) return 0;
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
    });
  }, [friends, conversations]);

  const { canSend, isFriend, messageCount } = selectedChat ? checkMessageLimit() : { canSend: true, isFriend: false, messageCount: 0 };
  const maxLength = getMaxLength();
  const currentLength = newMessage.length;

  return (
      <div className="min-h-screen">
        <Navbar />

        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold gradient-text mb-8">私信</h1>

          {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
              </div>
          ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ height: 'calc(100vh - 250px)' }}>
                {/* 会话/好友列表 */}
                <div className="lg:col-span-1 card overflow-y-auto">
                  <h2 className="text-xl font-bold mb-4 sticky top-0 glass-effect py-2 z-10">
                    好友列表
                  </h2>
                  {displayList.length === 0 ? (
                      <div className="text-center py-10">
                        <div className="text-4xl mb-2">👥</div>
                        <p className="text-gray-400">暂无好友</p>
                      </div>
                  ) : (
                      <div className="space-y-2">
                        {displayList.map((item) => (
                            <button
                                key={item.user.id}
                                onClick={() => handleSelectChat(item.user)}
                                className={`w-full text-left p-4 rounded-xl transition-all duration-300 ${
                                    selectedChat?.user.id === item.user.id
                                        ? 'bg-white/10 border border-white/20'
                                        : 'glass-effect hover:bg-white/10'
                                }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <img
                                      src={item.user.avatar}
                                      alt={item.user.username}
                                      className="w-12 h-12 rounded-full"
                                  />
                                  {/* 在线状态指示器 */}
                                  <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-gray-800 ${
                                      isUserOnline(item.user.id) ? 'bg-green-500' : 'bg-gray-500'
                                  }`} />
                                  {item.unread > 0 && (
                                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                              {item.unread}
                            </span>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-semibold truncate">{item.user.username}</h3>
                                    {isUserOnline(item.user.id) && (
                                        <span className="flex items-center gap-1 text-xs text-green-400">
                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                                在线
                              </span>
                                    )}
                                  </div>
                                  {item.lastMessage && (
                                      <p className="text-sm text-gray-400 truncate">
                                        {item.lastMessage.type === 'image' ? '[图片]' : item.lastMessage.content}
                                      </p>
                                  )}
                                </div>
                              </div>
                            </button>
                        ))}
                      </div>
                  )}
                </div>

                {/* 聊天窗口 */}
                <div className="lg:col-span-2 card flex flex-col" style={{ height: 'calc(100vh - 250px)' }}>
                  {selectedChat ? (
                      <>
                        {/* 聊天头部 */}
                        <div className="border-b border-white/10 pb-4 mb-4 flex-shrink-0">
                          <Link
                              to={`/profile/${selectedChat.user.id}`}
                              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                          >
                            <div className="relative">
                              <img
                                  src={selectedChat.user.avatar}
                                  alt={selectedChat.user.username}
                                  className="w-12 h-12 rounded-full"
                              />
                              {/* 在线状态指示器 */}
                              <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-gray-800 ${
                                  isUserOnline(selectedChat.user.id) ? 'bg-green-500' : 'bg-gray-500'
                              }`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-lg">{selectedChat.user.username}</h3>
                                {isUserOnline(selectedChat.user.id) ? (
                                    <span className="flex items-center gap-1 text-xs text-green-400">
                              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                              在线
                            </span>
                                ) : (
                                    <span className="text-xs text-gray-500">离线</span>
                                )}
                              </div>
                              <p className="text-sm text-gray-400">
                                {isFriend ? '好友' : '陌生人'} · 点击查看主页
                              </p>
                            </div>
                          </Link>
                          {!isFriend && !canSend && (
                              <div className="mt-3 bg-yellow-500/20 border border-yellow-500/50 text-yellow-200 px-4 py-2 rounded-xl text-sm">
                                ⚠️ 非好友只能发送一条消息，请等待对方添加好友后继续聊天
                              </div>
                          )}
                        </div>

                        {/* 消息列表 - 固定高度并可滚动 */}
                        <div className="flex-1 overflow-y-auto mb-4 space-y-2 min-h-0">
                          {selectedChat.messages.length === 0 ? (
                              <div className="text-center py-10 text-gray-400">
                                <p>还没有消息，开始聊天吧！</p>
                              </div>
                          ) : (
                              selectedChat.messages.map(renderMessage)
                          )}
                          <div ref={messagesEndRef} />
                        </div>

                        {/* 输入框 */}
                        <form onSubmit={handleSendMessage} className="relative flex-shrink-0">
                          <div className="flex items-end gap-2">
                            <div className="flex-1 relative">
                        <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            className="input-field resize-none pr-20"
                            placeholder={canSend ? "输入消息..." : "非好友只能发送一条消息"}
                            rows="2"
                            disabled={!canSend || uploadingImage}
                            maxLength={maxLength}
                        />
                              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                          <span className={`text-xs ${currentLength > maxLength * 0.9 ? 'text-red-400' : 'text-gray-400'}`}>
                            {currentLength}/{maxLength}
                          </span>
                              </div>
                            </div>

                            {/* 工具按钮 */}
                            <div className="flex gap-2">
                              <button
                                  type="button"
                                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                  className="btn-secondary px-4 py-3"
                                  disabled={!canSend}
                              >
                                😊
                              </button>
                              <button
                                  type="button"
                                  onClick={() => fileInputRef.current?.click()}
                                  className="btn-secondary px-4 py-3"
                                  disabled={!canSend || uploadingImage}
                              >
                                {uploadingImage ? '上传中...' : '📷'}
                              </button>
                              <button
                                  type="submit"
                                  disabled={!canSend || !newMessage.trim() || uploadingImage}
                                  className="btn-primary px-6 py-3"
                              >
                                发送
                              </button>
                            </div>
                          </div>

                          <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                          />

                          <EmojiPicker
                              isOpen={showEmojiPicker}
                              onClose={() => setShowEmojiPicker(false)}
                              onSelect={handleEmojiSelect}
                          />
                        </form>
                      </>
                  ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-6xl mb-4">💬</div>
                          <h3 className="text-2xl font-bold text-gray-300 mb-2">选择一个会话</h3>
                          <p className="text-gray-500">开始聊天吧</p>
                        </div>
                      </div>
                  )}
                </div>
              </div>
          )}
        </div>

        {/* 图片查看模态框 */}
        {imageModal && (
            <div
                className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4"
                onClick={() => setImageModal(null)}
            >
              <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
                {/* 关闭按钮 */}
                <button
                    onClick={() => setImageModal(null)}
                    className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-all duration-300 backdrop-blur-sm z-10"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* 原图 */}
                <img
                    src={imageModal}
                    alt="原图"
                    className="max-w-full max-h-full object-contain rounded-2xl"
                    onClick={(e) => e.stopPropagation()}
                />

                {/* 下载按钮 */}
                <a
                    href={imageModal}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-all duration-300 backdrop-blur-sm"
                    onClick={(e) => e.stopPropagation()}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </a>
              </div>
            </div>
        )}
      </div>
  );
};

export default Messages;