import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const TYPE_MAP = {
  like_vlog: { icon: '❤️', text: '赞了你的Vlog' },
  comment_vlog: { icon: '💬', text: '评论了你的Vlog' },
  like_share: { icon: '❤️', text: '赞了你的分享' },
  comment_share: { icon: '💬', text: '评论了你的分享' },
  friend_request: { icon: '👋', text: '请求添加你为好友' },
  friend_accept: { icon: '🤝', text: '接受了你的好友请求' },
};

export default function Notifications() {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);
  const navigate = useNavigate();

  const fetchList = async () => {
    try {
      const r = await axios.get('/api/notifications');
      setList(r.data.list);
      setUnread(r.data.unread);
    } catch {}
  };

  useEffect(() => {
    fetchList();
    const timer = setInterval(fetchList, 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const clickOutside = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const handleClick = async (n) => {
    if (!n.read) {
      await axios.patch('/api/notifications/read', { id: n.id });
      setUnread(p => p - 1);
      setList(prev => prev.map(x => x.id === n.id ? { ...x, read: 1 } : x));
    }
    // 跳转到相关内容
    const { type, relatedId, fromUserId } = n;
    if (type.includes('vlog')) navigate('/vlog/' + relatedId);
    else if (type.includes('share')) navigate('/shares/' + relatedId);
    else if (type === 'friend_request' || type === 'friend_accept') navigate('/friends');
    setOpen(false);
  };

  const handleMarkAll = async () => {
    await axios.patch('/api/notifications/read', {});
    setUnread(0);
    setList(prev => prev.map(x => ({ ...x, read: 1 })));
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="relative p-2 hover:bg-white/10 rounded-xl transition">
        <span className="text-xl">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-bold">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 max-h-[70vh] overflow-y-auto card p-0 z-50 shadow-2xl">
          <div className="flex items-center justify-between p-4 border-b border-white/10 sticky top-0 glass-effect">
            <h3 className="font-bold">通知</h3>
            {unread > 0 && (
              <button onClick={handleMarkAll} className="text-xs text-blue-400 hover:underline">全部已读</button>
            )}
          </div>
          {list.length === 0 ? (
            <p className="text-center py-8 text-gray-500">暂无通知</p>
          ) : (
            list.map(n => {
              const info = TYPE_MAP[n.type] || { icon: '📢', text: n.type };
              return (
                <button key={n.id} onClick={() => handleClick(n)}
                  className={`w-full text-left p-4 hover:bg-white/5 transition border-b border-white/5 ${!n.read ? 'bg-blue-500/5' : ''}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{info.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-semibold">{n.fromUser?.username || '用户'}</span>
                        {' '}{info.text}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(n.createdAt).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    {!n.read && <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
