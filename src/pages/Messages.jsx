import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import EmojiPicker from '../components/EmojiPicker';
import { useAuth } from '../contexts/AuthContext';
import useMobile from '../hooks/useMobile';

const Messages = () => {
  const { user } = useAuth();
  const isMobile = useMobile();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [friends, setFriends] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGroupEmojiPicker, setShowGroupEmojiPicker] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageModal, setImageModal] = useState(null);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMessages, setGroupMessages] = useState([]);
  const [chatType, setChatType] = useState('friends'); // 'friends' | 'groups'

  useEffect(() => {
    if (!user?.id) return;
    fetchConversations();
    fetchFriends();
    fetchGroups();
    fetchOnlineStatus();

    const conversationInterval = setInterval(fetchConversations, 5000);
    const groupInterval = setInterval(fetchGroups, 5000);
    const onlineInterval = setInterval(fetchOnlineStatus, 15000);

    return () => {
      clearInterval(conversationInterval);
      clearInterval(groupInterval);
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
      const response = await axios.get('/api/users/online');
      setOnlineUsers(new Set(response.data.map(u => u.id)));
    } catch (error) {
      // 静默失败，不影响主要功能
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

  // 从好友列表点名字跳转过来时自动打开聊天（仅首次）
  const chatOpenedRef = useRef(false);
  useEffect(() => {
    const chatId = searchParams.get('chat');
    if (chatId && friends.length > 0 && !chatOpenedRef.current) {
      const target = friends.find(f => String(f.id) === String(chatId));
      if (target) { chatOpenedRef.current = true; handleSelectChat(target); }
    }
  }, [searchParams, friends]);

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

  // ===== 群聊功能 =====
  const fetchGroups = async () => {
    try {
      const res = await axios.get(`/api/groups/${user.id}`);
      setGroups(res.data);
    } catch (e) { /* silent */ }
  };

  const fetchGroupMessages = async (groupId) => {
    try {
      const res = await axios.get(`/api/groups/${groupId}/messages`);
      setGroupMessages(res.data);
    } catch (e) { /* silent */ }
  };

  const selectGroup = async (group) => {
    setSelectedChat(null);
    setSelectedGroup(group);
    setChatType('groups');
    await fetchGroupMessages(group.id);
  };

  const handleSendGroupMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedGroup) return;
    if (selectedGroup.muteAll && selectedGroup.createdBy !== user.id) {
      alert('全员禁言中，仅群主可发言');
      return;
    }
    try {
      await axios.post(`/api/groups/${selectedGroup.id}/messages`, { content: newMessage, type: 'text' });
      setNewMessage('');
      fetchGroupMessages(selectedGroup.id);
    } catch (e) {
      alert(e.response?.data?.message || '发送失败');
    }
  };

  const handleGroupImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedGroup) return;
    if (selectedGroup.muteAll && selectedGroup.createdBy !== user.id) {
      alert('全员禁言中，仅群主可发言');
      return;
    }
    setUploadingImage(true);
    try {
      const fd = new FormData(); fd.append('image', file);
      const up = await axios.post('/api/messages/upload', fd);
      await axios.post(`/api/groups/${selectedGroup.id}/messages`, { content: up.data.imageUrl, type: 'image' });
      fetchGroupMessages(selectedGroup.id);
    } catch (err) { alert('发送图片失败'); }
    finally { setUploadingImage(false); }
  };

  const [showGroupMembers, setShowGroupMembers] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [showGroupManage, setShowGroupManage] = useState(false);
  const [groupAnnouncement, setGroupAnnouncement] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [joinRequests, setJoinRequests] = useState([]);
  const [showJoinRequests, setShowJoinRequests] = useState(false);
  const [groupJoinType, setGroupJoinType] = useState('free');

  const fetchGroupMembers = async () => {
    if (!selectedGroup) return;
    const res = await axios.get(`/api/groups/${selectedGroup.id}/members`);
    setGroupMembers(res.data);
    setShowGroupMembers(true);
  };

  const handleKickMember = async (userId2) => {
    if (!confirm('确定踢出该成员？')) return;
    await axios.post(`/api/groups/${selectedGroup.id}/kick`, { userId: userId2 });
    fetchGroupMembers();
  };

  const handleUpdateGroup = async () => {
    const res = await axios.patch(`/api/groups/${selectedGroup.id}`, { name: selectedGroup.name, announcement: groupAnnouncement });
    if (res.data) {
      setSelectedGroup(prev => ({
        ...prev,
        name: res.data.name,
        announcement: res.data.announcement || '',
        joinType: res.data.joinType || 'free',
        members: res.data.members || prev.members,
        admins: res.data.admins || prev.admins,
        muteAll: res.data.muteAll
      }));
    }
    setShowGroupManage(false);
    fetchGroups();
  };

  const handleMuteAll = async () => {
    const res = await axios.post(`/api/groups/${selectedGroup.id}/mute-all`);
    setSelectedGroup(prev => ({ ...prev, muteAll: res.data.muteAll ? 1 : 0 }));
    alert(res.data.muteAll ? '已开启全员禁言' : '已关闭全员禁言');
    fetchGroups();
  };

  // ===== 群邀请 & 入群审批 & 管理 =====
  const fetchJoinRequests = async () => {
    if (!selectedGroup) return;
    try {
      const res = await axios.get(`/api/groups/${selectedGroup.id}/join-requests`);
      setJoinRequests(res.data);
    } catch { /* silent */ }
  };

  const handleInviteFriends = async (userIds) => {
    if (!selectedGroup || !userIds.length) return;
    try {
      const res = await axios.post(`/api/groups/${selectedGroup.id}/invite`, { userIds });
      const joined = res.data.results.filter(r => r.status === 'joined');
      const pending = res.data.results.filter(r => r.status === 'pending');
      let msg = '';
      if (joined.length) msg += `${joined.length}人已直接入群`;
      if (pending.length) msg += `${pending.length}人已发送入群申请`;
      alert(msg || '操作完成');
      setShowInviteModal(false);
      fetchGroups();
      fetchGroupMembers();
    } catch (e) {
      alert(e.response?.data?.message || '邀请失败');
    }
  };

  const handleJoinRequest = async (requestId, action) => {
    try {
      await axios.post(`/api/groups/${selectedGroup.id}/join-requests/${requestId}`, { action });
      fetchJoinRequests();
      fetchGroups();
      fetchGroupMembers();
    } catch (e) {
      alert(e.response?.data?.message || '操作失败');
    }
  };

  const handleSetAdmin = async (userId, action) => {
    try {
      await axios.post(`/api/groups/${selectedGroup.id}/admins`, { userId, action });
      fetchGroupMembers();
      fetchGroups();
    } catch (e) {
      alert(e.response?.data?.message || '操作失败');
    }
  };

  const handleUpdateJoinType = async (joinType) => {
    try {
      await axios.patch(`/api/groups/${selectedGroup.id}`, { joinType });
      setSelectedGroup(prev => ({ ...prev, joinType }));
      setGroupJoinType(joinType);
      fetchGroups();
    } catch (e) {
      alert(e.response?.data?.message || '设置失败');
    }
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

  const startRecording = async () => {
    if (!navigator.mediaDevices) { alert('浏览器不支持录音'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];
      mediaRecorder.ondataavailable = e => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const fd = new FormData();
        fd.append('image', blob, 'voice_' + Date.now() + '.webm');
        try {
          const up = await axios.post('/api/messages/upload', fd);
          const voiceUrl = up.data.imageUrl;
          if (selectedChat) {
            await axios.post('/api/messages', { senderId: user.id, receiverId: selectedChat.user.id, content: voiceUrl, type: 'voice' });
            fetchConversations();
          }
        } catch { alert('发送语音失败'); }
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setRecording(true);
    } catch (e) {
      const msg = location.protocol === 'http:' && location.hostname !== 'localhost'
        ? '录音需要HTTPS，本地开发请用localhost访问'
        : '无法访问麦克风，请检查浏览器权限';
      alert(msg);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) { mediaRecorderRef.current.stop(); setRecording(false); }
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

      const uploadResponse = await axios.post('/api/messages/upload', formData);

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

  const handleGroupEmojiSelect = (emoji) => {
    setNewMessage(prev => prev + emoji);
  };

  const isImageFile = (url) => /\.(jpe?g|png|gif|webp|svg|bmp|ico)(\?|$)/i.test(url);

  const getFileName = (url) => {
    try { return decodeURIComponent(url.split('/').pop().split('?')[0]); }
    catch { return url.split('/').pop().split('?')[0]; }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  // 解析消息中的链接，内部链接用 React Router，外部链接用 a 标签
  const renderTextWithLinks = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    const matches = text.match(urlRegex) || [];
    return parts.map((part, i) => {
      if (matches.includes(part)) {
        const url = part;
        // 内部链接：/vlog/xxx 或 /shares/xxx
        const vlogMatch = url.match(/\/vlog\/(\d+)/);
        const shareMatch = url.match(/\/shares\/(\d+)/);
        if (vlogMatch) {
          return <Link key={i} to={`/vlog/${vlogMatch[1]}`} className="text-blue-400 underline hover:text-blue-300">📹 查看Vlog</Link>;
        }
        if (shareMatch) {
          return <Link key={i} to={`/shares/${shareMatch[1]}`} className="text-blue-400 underline hover:text-blue-300">🔥 查看分享</Link>;
        }
        return <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline break-all">{url}</a>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const renderMessage = (msg) => {
    const isMine = msg.senderId === user.id;

    return (
        <div
            key={msg.id}
            className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-4`}
        >
          <div className={`max-w-[70%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
            {msg.type === 'voice' ? (
                <audio controls src={msg.content} className="max-w-[200px] h-8" />
            ) : msg.type === 'image' ? (
                isImageFile(msg.content) ? (
                  <img
                      src={msg.content}
                      alt="图片消息"
                      className="rounded-xl max-w-[200px] max-h-[200px] object-cover shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setImageModal(msg.content)}
                  />
                ) : (
                  <a href={msg.content} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-xl px-4 py-3 bg-white/10 hover:bg-white/20 transition-colors">
                    <span className="text-2xl">📄</span>
                    <span className="text-sm underline break-all">{getFileName(msg.content)}</span>
                  </a>
                )
            ) : (
                <div
                    className={`rounded-2xl px-4 py-2 ${
                        isMine
                            ? 'bg-white/90 text-black'
                            : 'glass-effect text-white'
                    }`}
                >
                  <p className="text-base whitespace-pre-wrap break-words">{renderTextWithLinks(msg.content)}</p>
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

  const handleBack = () => {
    setSelectedChat(null);
    setSelectedGroup(null);
    setChatType('friends');
  };

  const showMobileChat = isMobile && (selectedChat || selectedGroup);

  // 手机端键盘弹起时锁定视口
  useEffect(() => {
    if (!isMobile || !showMobileChat) return;
    const root = document.getElementById('root');
    const chatPanel = document.querySelector('[data-chat-panel]');
    if (!root || !chatPanel) return;
    const onResize = () => {
      const vh = window.visualViewport?.height || window.innerHeight;
      chatPanel.style.height = (vh - 116) + 'px';
    };
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', onResize);
      return () => window.visualViewport.removeEventListener('resize', onResize);
    }
  }, [isMobile, showMobileChat]);

  return (
      <div className="min-h-screen">
        <Navbar />

        <div className="container mx-auto px-4 py-4 md:py-8">
          {!showMobileChat && <h1 className="text-2xl md:text-4xl font-bold gradient-text mb-4 md:mb-8">私信</h1>}

          {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
              </div>
          ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ height: isMobile ? 'calc(100dvh - 116px)' : 'calc(100vh - 250px)' }}>
                {/* 会话/好友列表 */}
                <div className={`lg:col-span-1 card overflow-y-auto ${showMobileChat ? 'hidden' : ''}`}>
                  {/* 标签切换：好友 / 群聊 */}
                  <div className="flex gap-1 mb-3 sticky top-0 glass-effect py-2 z-10 rounded-xl">
                    <button onClick={() => { setChatType('friends'); setSelectedGroup(null); }}
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${chatType === 'friends' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'}`}>
                      💬 好友
                    </button>
                    <button onClick={() => { setChatType('groups'); setSelectedChat(null); }}
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${chatType === 'groups' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'}`}>
                      👥 群聊 {groups.length > 0 && `(${groups.length})`}
                    </button>
                  </div>

                  {chatType === 'friends' ? (
                    displayList.length === 0 ? (
                      <div className="text-center py-10"><div className="text-4xl mb-2">👥</div><p className="text-gray-400">暂无好友</p></div>
                    ) : (
                      <div className="space-y-2">
                        {displayList.map((item) => (
                            <button key={item.user.id} onClick={() => { setChatType('friends'); handleSelectChat(item.user); }}
                                className={`w-full text-left p-4 rounded-xl transition-all duration-300 ${selectedChat?.user.id === item.user.id ? 'bg-white/10 border border-white/20' : 'glass-effect hover:bg-white/10'}`}>
                              <div className="flex items-center gap-3">
                                {item.unread > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-bold">{item.unread > 99 ? '99+' : item.unread}</span>}
                                <div className="relative">
                                  <img src={item.user.avatar} alt={item.user.username} className="w-12 h-12 rounded-full"
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
                                        {item.lastMessage.type === 'voice' ? '[语音]' : item.lastMessage.type === 'image' ? (isImageFile(item.lastMessage.content) ? '[图片]' : '[文件]') : item.lastMessage.content}
                                      </p>
                                  )}
                                </div>
                              </div>
                            </button>
                        ))}
                      </div>
                  )) : (
                    groups.length === 0 ? (
                      <div className="text-center py-10"><div className="text-4xl mb-2">👥</div><p className="text-gray-400">暂无群聊<br/><span className="text-xs text-gray-500">去好友页创建群聊</span></p></div>
                    ) : (
                      <div className="space-y-2">
                        {groups.map(group => (
                          <button key={group.id} onClick={() => selectGroup(group)}
                            className={`w-full text-left p-4 rounded-xl transition ${selectedGroup?.id === group.id ? 'bg-white/10 border border-white/20' : 'glass-effect hover:bg-white/10'}`}>
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">👥</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate">{group.name || '群聊'}</p>
                                <p className="text-xs text-gray-400">{group.memberUsers?.length || 0} 人</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                  ))}
                </div>

                {/* 聊天窗口 */}
                <div data-chat-panel className={`lg:col-span-2 card flex flex-col ${isMobile && !showMobileChat ? 'hidden' : ''}`} style={isMobile && showMobileChat ? { position:'fixed', top:'56px', bottom:'60px', left:0, right:0, zIndex:50 } : { height: 'calc(100vh - 250px)' }}>
                  {/* 手机端返回按钮 */}
                  {isMobile && showMobileChat && (
                    <div className="sticky top-0 z-20 glass-effect backdrop-blur-xl pb-2 pt-2 -mt-4 -mx-6 px-6 rounded-t-3xl">
                      <button onClick={handleBack} className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        <span className="text-sm">返回列表</span>
                      </button>
                    </div>
                  )}
                  {selectedGroup ? (
                      <>
                        <div className="border-b border-white/10 pb-3 mb-3 flex-shrink-0 sticky top-0 z-10 glass-effect backdrop-blur-xl -mx-6 px-6 pt-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">👥 {selectedGroup.name || '群聊'}</h3>
                              <p className="text-xs text-gray-400">
                                {selectedGroup.memberUsers?.length || 0} 人
                                {selectedGroup.joinType === 'free' ? ' · 自由加入' : selectedGroup.joinType === 'admin_only' ? ' · 需管理员审批' : ' · 需审批'}
                                {selectedGroup.announcement ? ` · 📢 ${selectedGroup.announcement}` : ''}
                              </p>
                            </div>
                            <div className="flex gap-1 flex-wrap">
                              <button onClick={() => { setShowInviteModal(true); }} className="px-3 py-1.5 text-xs bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition" title="邀请好友">➕邀请</button>
                              <button onClick={fetchGroupMembers} className="px-3 py-1.5 text-xs bg-white/10 rounded-lg hover:bg-white/20 transition" title="查看成员">👥成员</button>
                              {(selectedGroup.createdBy === user.id || (selectedGroup.admins || []).includes(user.id)) && (
                                <button onClick={() => { setShowJoinRequests(true); fetchJoinRequests(); }}
                                  className="px-3 py-1.5 text-xs bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition relative" title="入群申请">
                                  📩申请
                                </button>
                              )}
                              {(selectedGroup.createdBy === user.id || (selectedGroup.admins || []).includes(user.id)) && (
                                <button onClick={() => { setShowGroupManage(true); setGroupAnnouncement(selectedGroup.announcement || ''); setGroupJoinType(selectedGroup.joinType || 'free'); }}
                                  className="px-3 py-1.5 text-xs bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition" title="群管理">⚙管理</button>
                              )}
                            </div>
                          </div>
                          {selectedGroup.muteAll ? (
                            <div className="mt-2 bg-red-500/20 border border-red-500/30 text-red-300 px-3 py-1 rounded-lg text-xs text-center">
                              🔇 全员禁言中，仅群主可发言
                            </div>
                          ) : null}
                        </div>
                        <div className="flex-1 overflow-y-auto mb-4 space-y-2">
                          {groupMessages.map(msg => {
                            if (msg.type === 'system') {
                              return (
                                <div key={msg.id} className="flex justify-center my-3">
                                  <span className="text-xs text-gray-500 bg-white/5 px-3 py-1 rounded-full">{msg.content}</span>
                                </div>
                              );
                            }
                            const isMine = msg.senderId === user.id;
                            return (
                              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[70%] px-4 py-2 rounded-2xl ${isMine ? 'bg-purple-500/80 text-white' : 'glass-effect text-gray-200'}`}>
                                  {!isMine && <p className="text-xs text-purple-400 mb-1">{msg.sender?.username || '?'}</p>}
                                  {msg.type === 'voice' ? (
                                    <audio controls src={msg.content} className="max-w-[180px] h-7" />
                                  ) : msg.type === 'image' ? (
                                    isImageFile(msg.content) ? (
                                      <img src={msg.content} alt="图片" className="max-w-[200px] rounded-xl cursor-pointer hover:opacity-90" onClick={() => setImageModal(msg.content)} />
                                    ) : (
                                      <a href={msg.content} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-sm underline hover:opacity-80">
                                        <span>📄</span> {getFileName(msg.content)}
                                      </a>
                                    )
                                  ) : (
                                    <p className="text-sm">{renderTextWithLinks(msg.content)}</p>
                                  )}
                                  <p className="text-[10px] text-gray-400 mt-1 text-right">{formatTime(msg.createdAt)}</p>
                                </div>
                              </div>
                            );
                          })}
                          <div ref={messagesEndRef} />
                        </div>
                        <EmojiPicker isOpen={showGroupEmojiPicker} onClose={() => setShowGroupEmojiPicker(false)} onSelect={handleGroupEmojiSelect} />
                        <form onSubmit={handleSendGroupMessage} className="flex-shrink-0 pb-safe">
                          <div className="flex items-center gap-1.5 bg-white/10 rounded-2xl p-1.5 ring-1 ring-transparent">
                            <button type="button" onClick={() => setShowGroupEmojiPicker(!showGroupEmojiPicker)}
                              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition text-xl flex-shrink-0">😊</button>
                            <button type="button" onClick={() => fileInputRef.current?.click()}
                              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition text-lg flex-shrink-0">➕</button>
                            <input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="输入群消息..."
                              className="flex-1 bg-transparent text-sm outline-none py-2 px-1 min-h-[40px] placeholder-gray-500"
                              disabled={selectedGroup?.muteAll && selectedGroup?.createdBy !== user.id} />
                            <button type="submit" disabled={selectedGroup?.muteAll && selectedGroup?.createdBy !== user.id}
                              className="w-10 h-10 flex items-center justify-center rounded-xl bg-purple-500/80 hover:bg-purple-500 transition flex-shrink-0">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                            </button>
                          </div>
                        </form>
                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleGroupImageUpload} />
                      </>
                  ) : selectedChat ? (
                      <>
                        {/* 聊天头部 — 固定住 */}
                        <div className="border-b border-white/10 pb-3 mb-3 flex-shrink-0 sticky top-0 z-10 glass-effect backdrop-blur-xl -mx-6 px-6 pt-2">
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

                        {/* 输入框 — 微信风格 */}
                        <EmojiPicker
                          isOpen={showEmojiPicker}
                          onClose={() => setShowEmojiPicker(false)}
                          onSelect={handleEmojiSelect}
                        />
                        <form onSubmit={handleSendMessage} className="flex-shrink-0 pb-safe">
                          <div className="flex items-center gap-1.5 bg-white/10 rounded-2xl p-1.5 ring-1 ring-transparent">
                            {/* 左侧：表情 + 文件 */}
                            <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition text-xl flex-shrink-0"
                              disabled={!canSend}>😊</button>
                            <button type="button" onClick={() => fileInputRef.current?.click()}
                              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition text-lg flex-shrink-0"
                              disabled={!canSend || uploadingImage}>➕</button>

                            {/* 中间：输入框 */}
                            <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)}
                              className="flex-1 bg-transparent text-sm resize-none outline-none py-2 px-1 min-h-[40px] max-h-[80px] placeholder-gray-500"
                              placeholder={canSend ? "输入消息..." : "不能发送"}
                              rows="1"
                              disabled={!canSend || uploadingImage}
                              maxLength={maxLength}
                              onInput={e => { e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,80)+'px'; }}
                              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                            />

                            {/* 右侧：语音/发送 */}
                            {newMessage.trim() ? (
                              <button type="submit" disabled={!canSend || uploadingImage}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-purple-500/80 hover:bg-purple-500 transition flex-shrink-0">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                              </button>
                            ) : (
                              <button type="button"
                                onMouseDown={startRecording} onMouseUp={stopRecording} onMouseLeave={stopRecording}
                                onTouchStart={startRecording} onTouchEnd={stopRecording}
                                className={`w-10 h-10 flex items-center justify-center rounded-xl transition flex-shrink-0 ${recording ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-white/10'}`}
                                disabled={!canSend}>
                                {recording ? '🔴' : '🎤'}
                              </button>
                            )}
                          </div>
                        </form>

                        <input ref={fileInputRef} type="file" onChange={handleImageUpload} className="hidden" />
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

        {/* 群成员弹窗 */}
        {showGroupMembers && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowGroupMembers(false)}>
            <div className="card max-w-sm w-full max-h-[70vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">群成员 ({groupMembers.length}人)</h3>
              {groupMembers.map(m => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-white/5">
                  <Link to={`/profile/${m.id}`} className="flex items-center gap-3 flex-1 hover:opacity-80">
                    <img src={m.avatar} className="w-10 h-10 rounded-full" />
                    <div>
                      <p className="font-semibold text-sm">
                        {m.username}
                        {m.isOwner && <span className="ml-1 text-xs">👑群主</span>}
                        {m.isAdmin && !m.isOwner && <span className="ml-1 text-xs">🛡管理</span>}
                      </p>
                    </div>
                  </Link>
                  {selectedGroup?.createdBy === user.id && m.id !== user.id && (
                    <div className="flex gap-1">
                      {!m.isAdmin ? (
                        <button onClick={() => handleSetAdmin(m.id, 'add')} className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded" title="设为管理员">🛡</button>
                      ) : (
                        <button onClick={() => handleSetAdmin(m.id, 'remove')} className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded" title="取消管理员">⬇</button>
                      )}
                      <button onClick={() => handleKickMember(m.id)} className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded">踢出</button>
                    </div>
                  )}
                  {selectedGroup?.createdBy !== user.id && (selectedGroup.admins || []).includes(user.id) && !m.isOwner && !m.isAdmin && (
                    <button onClick={() => handleKickMember(m.id)} className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded">踢出</button>
                  )}
                </div>
              ))}
              <button onClick={() => setShowGroupMembers(false)} className="btn-secondary w-full mt-4">关闭</button>
            </div>
          </div>
        )}

        {/* 群管理弹窗 */}
        {showGroupManage && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowGroupManage(false)}>
            <div className="card max-w-sm w-full max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">群管理</h3>
              <label className="text-sm text-gray-400">群名称</label>
              <input value={selectedGroup?.name || ''} onChange={e => { if(selectedGroup) setSelectedGroup({...selectedGroup, name: e.target.value}); }}
                className="input-field mb-3" />
              <label className="text-sm text-gray-400">群公告</label>
              <input value={groupAnnouncement} onChange={e => setGroupAnnouncement(e.target.value)} placeholder="输入群公告..."
                className="input-field mb-4" />

              {/* 入群方式设置 */}
              <label className="text-sm text-gray-400 mb-2 block">入群方式</label>
              <div className="flex gap-2 mb-4">
                {[{v:'free',l:'🟢 自由加入'},{v:'approval',l:'🟡 需审批'},{v:'admin_only',l:'🔴 仅管理员审批'}].map(opt => (
                  <button key={opt.v} onClick={() => handleUpdateJoinType(opt.v)}
                    className={`flex-1 py-2 text-xs rounded-lg transition ${groupJoinType === opt.v ? 'bg-white/20 text-white' : 'glass-effect text-gray-400 hover:text-white'}`}>
                    {opt.l}
                  </button>
                ))}
              </div>

              <button onClick={handleUpdateGroup} className="btn-primary w-full mb-2">💾 保存设置</button>
              <button onClick={handleMuteAll} className="btn-secondary w-full">{selectedGroup?.muteAll ? '🔈 关闭全员禁言' : '🔇 开启全员禁言'}</button>
            </div>
          </div>
        )}

        {/* 邀请好友弹窗 */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowInviteModal(false)}>
            <div className="card max-w-sm w-full max-h-[70vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">邀请好友入群</h3>
              <p className="text-xs text-gray-400 mb-3">
                {selectedGroup?.joinType === 'free' ? '🟢 自由加入：好友直接入群' : selectedGroup?.joinType === 'admin_only' ? '🔴 需管理员审批' : '🟡 需审批：发送入群申请'}
              </p>
              {friends.filter(f => !(selectedGroup?.memberUsers || []).some(m => m.id === f.id)).length === 0 ? (
                <p className="text-gray-500 text-center py-4">所有好友已在群中</p>
              ) : (
                <div className="space-y-2">
                  {friends.filter(f => !(selectedGroup?.memberUsers || []).some(m => m.id === f.id)).map(f => (
                    <div key={f.id} className="flex items-center justify-between py-2 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <img src={f.avatar} className="w-10 h-10 rounded-full" />
                        <p className="font-semibold text-sm">{f.username}</p>
                      </div>
                      <button onClick={() => handleInviteFriends([f.id])}
                        className="px-3 py-1 text-xs bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition">
                        邀请
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => setShowInviteModal(false)} className="btn-secondary w-full mt-4">关闭</button>
            </div>
          </div>
        )}

        {/* 入群申请弹窗 */}
        {showJoinRequests && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowJoinRequests(false)}>
            <div className="card max-w-sm w-full max-h-[70vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">入群申请 ({joinRequests.length})</h3>
              {joinRequests.length === 0 ? (
                <p className="text-gray-500 text-center py-4">暂无待处理申请</p>
              ) : (
                <div className="space-y-3">
                  {joinRequests.map(req => (
                    <div key={req.id} className="flex items-center justify-between py-2 border-b border-white/5">
                      <div className="flex items-center gap-3 flex-1">
                        <img src={req.user?.avatar} className="w-10 h-10 rounded-full" />
                        <div>
                          <p className="font-semibold text-sm">{req.user?.username}</p>
                          <p className="text-xs text-gray-400">
                            {req.inviter ? `由 ${req.inviter.username} 邀请` : '主动申请'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleJoinRequest(req.id, 'approve')}
                          className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded">同意</button>
                        <button onClick={() => handleJoinRequest(req.id, 'reject')}
                          className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded">拒绝</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => setShowJoinRequests(false)} className="btn-secondary w-full mt-4">关闭</button>
            </div>
          </div>
        )}

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