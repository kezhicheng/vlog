import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';

const TagPage = () => {
  const { tag } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`/api/tags/${encodeURIComponent(tag)}`).then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [tag]);

  if (loading) return <div className="min-h-screen"><Navbar /><div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div></div></div>;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold gradient-text mb-2">#{tag}</h1>
        <p className="text-gray-400 mb-6">{data?.total || 0} 条内容</p>
        {!data?.items?.length ? (
          <div className="text-center py-20 text-gray-500">暂无相关内容</div>
        ) : (
          <div className="space-y-4">
            {data.items.map(item => {
              const isVlog = item.type === 'vlog';
              const detailUrl = isVlog ? `/vlog/${item.id}` : `/shares/${item.id}`;
              return (
                <Link key={item.type + '-' + item.id} to={detailUrl} className="card block hover:bg-white/5 transition">
                  <div className="flex items-center gap-3 mb-2">
                    <img src={item.author?.avatar} className="w-10 h-10 rounded-full" />
                    <div>
                      <span className="font-semibold">{item.author?.username}</span>
                      <span className="text-xs text-gray-500 ml-2">{isVlog ? 'Vlog' : '分享'}</span>
                    </div>
                    <span className="ml-auto text-xs text-gray-500">{new Date(item.createdAt).toLocaleString('zh-CN')}</span>
                  </div>
                  <h3 className="font-bold text-lg">{item.title}</h3>
                  {item.content && <p className="text-gray-400 text-sm line-clamp-3 mt-1">{item.content}</p>}
                  <div className="flex gap-1 flex-wrap mt-2">
                    {(Array.isArray(item.tags) ? item.tags : []).map(t => (
                      <Link key={t} to={`/tags/${encodeURIComponent(t)}`} onClick={e => e.stopPropagation()}
                        className={`text-xs px-2 py-0.5 rounded-full ${t === tag ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-gray-400'}`}>#{t}</Link>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TagPage;
