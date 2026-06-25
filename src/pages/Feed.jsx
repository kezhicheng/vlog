import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';

const Feed = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('time'); // 'time' | 'hot' | 'old'
  const loaderRef = useRef(null);

  const fetchFeed = useCallback(async (append = false) => {
    if (!user) return;
    try {
      const r = await axios.get(`/api/feed/${user.id}`);
      if (append) {
        setItems(prev => [...prev, ...r.data]);
      } else {
        setItems(r.data);
      }
      setHasMore(r.data.length >= 50);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { if (user) fetchFeed(); }, [user, fetchFeed]);

  // 滚动加载更多
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !refreshing) {
          fetchFeed(true);
        }
      },
      { threshold: 0.1 }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, refreshing, fetchFeed]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFeed(false);
  };

  // 排序：置顶始终在前，其余按选择排序
  const sortedItems = React.useMemo(() => {
    const pinned = items.filter(i => i.status === 'pin');
    const normal = items.filter(i => i.status !== 'pin');
    if (sortBy === 'hot') {
      const pop = (i) => (i.views||0) + (i.likes||0)*5;
      normal.sort((a, b) => pop(b) - pop(a));
    } else if (sortBy === 'old') {
      normal.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else {
      normal.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return [...pinned, ...normal];
  }, [items, sortBy]);

  const TagList = ({ tags }) => {
    const list = typeof tags === 'string' ? (() => { try { return JSON.parse(tags); } catch { return []; } })() : (tags || []);
    if (!list.length) return null;
    return <div className="flex gap-1 flex-wrap mt-1">{list.map(t => (
      <Link key={t} to={`/tags/${encodeURIComponent(t)}`} onClick={e => e.stopPropagation()}
        className="text-xs text-blue-400 hover:underline">#{t}</Link>
    ))}</div>;
  };

  if (loading) return <div className="min-h-screen"><Navbar /><div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div></div></div>;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold gradient-text">📡 动态</h1>
          <button onClick={handleRefresh} disabled={refreshing}
            className={`btn-secondary text-sm ${refreshing ? 'opacity-50' : ''}`}>
            {refreshing ? '⏳' : '🔄'} 刷新
          </button>
        </div>
        <div className="flex gap-2 mb-4">
          {[{k:'time',l:'🕐 最新'},{k:'hot',l:'🔥 最热'},{k:'old',l:'📜 最早'}].map(o => (
            <button key={o.k} onClick={() => setSortBy(o.k)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${sortBy===o.k ? 'bg-white/20 text-white' : 'glass-effect text-gray-400 hover:text-white'}`}>
              {o.l}
            </button>
          ))}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <div className="text-6xl mb-4">📡</div>
            <h3 className="text-xl font-bold text-gray-300">暂无动态</h3>
            <p className="mt-2">关注好友后可以看到他们的最新内容</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {sortedItems.map(item => {
                const isVlog = item.itemType === 'vlog';
                const detailUrl = isVlog ? `/vlog/${item.id}` : `/shares/${item.id}`;
                const isPinned = item.status === 'pin';
                return (
                  <Link key={item.itemType + '-' + item.id} to={detailUrl} className="card block hover:bg-white/5 transition relative">
                    {isPinned && <span className="absolute top-2 right-2 text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">📌 置顶</span>}
                    <div className="flex items-center gap-3 mb-2">
                      <img src={item.author?.avatar} className="w-10 h-10 rounded-full" alt="" />
                      <div>
                        <span className="font-semibold">{item.author?.username}</span>
                        <span className="text-xs text-gray-500 ml-2">{isVlog ? '发布了Vlog' : '分享了'}</span>
                      </div>
                      <span className="ml-auto text-xs text-gray-500">{new Date(item.createdAt).toLocaleString('zh-CN')}</span>
                    </div>
                    <h3 className="font-bold text-lg mb-1">{item.title}</h3>
                    {item.content && <p className="text-gray-400 text-sm line-clamp-3">{item.content}</p>}
                    {item.images?.length > 0 && (
                      <div className={`grid gap-2 mt-3 ${item.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {item.images.slice(0, 4).map((img, i) => (
                          <img key={i} src={typeof img === 'string' ? img : img.url}
                            className={`rounded-xl object-cover w-full ${item.images.length === 1 ? 'h-48' : 'h-36'}`} alt="" />
                        ))}
                      </div>
                    )}
                    <TagList tags={item.tags} />
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span>❤️ {item.likes || 0}</span><span>👁 {item.views || 0}</span>
                      <span className="px-2 py-0.5 rounded bg-white/10">{isVlog ? 'Vlog' : '分享'}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
            {/* 底部加载指示器 */}
            <div ref={loaderRef} className="py-8 text-center">
              {hasMore ? (
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white mx-auto"></div>
              ) : (
                <p className="text-sm text-gray-600">— 没有更多动态 —</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Feed;
