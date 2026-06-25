import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';

const Search = () => {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(params.get('q') || '');
  const [results, setResults] = useState(null);
  const [tags, setTags] = useState([]);
  const [tab, setTab] = useState('all');

  useEffect(() => {
    axios.get('/api/tags').then(r => setTags(r.data.slice(0, 20))).catch(() => {});
  }, []);

  const doSearch = async (q) => {
    if (!q.trim()) { setResults(null); return; }
    try {
      const r = await axios.get('/api/search', { params: { q: q.trim() } });
      setResults(r.data);
    } catch {}
  };

  useEffect(() => {
    const q = params.get('q');
    if (q) { setQuery(q); doSearch(q); }
  }, [params]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate('/search?q=' + encodeURIComponent(query.trim()));
    }
  };

  const total = results ? (results.users?.length || 0) + (results.vlogs?.length || 0) + (results.shares?.length || 0) : 0;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex gap-2">
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="搜索用户、Vlog、分享..." className="input-field flex-1 text-lg" autoFocus />
            <button type="submit" className="btn-primary px-6">搜索</button>
          </div>
        </form>

        {!results && tags.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm text-gray-400 mb-3">🔥 热门话题</h3>
            <div className="flex flex-wrap gap-2">
              {tags.map(t => (
                <Link key={t.name} to={'/search?q=' + encodeURIComponent(t.name)}
                  className="px-3 py-1.5 bg-white/5 rounded-xl text-sm hover:bg-white/10 transition">
                  # {t.name} <span className="text-xs text-gray-500">({t.count})</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {results && (
          <>
            <div className="flex gap-4 mb-6">
              {[{k:'all',l:'全部'},{k:'users',l:'用户'},{k:'vlogs',l:'Vlog'},{k:'shares',l:'分享'}].map(t => (
                <button key={t.k} onClick={() => setTab(t.k)}
                  className={`px-4 py-2 rounded-xl text-sm transition ${tab===t.k ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'}`}>
                  {t.l} ({t.k === 'all' ? total : (results[t.k]?.length || 0)})
                </button>
              ))}
            </div>

            {(tab === 'all' || tab === 'users') && results.users?.length > 0 && (
              <div className="mb-6">
                {tab === 'all' && <h3 className="text-sm text-gray-400 mb-3">👥 用户</h3>}
                {results.users.map(u => (
                  <Link key={u.id} to={`/profile/${u.id}`} className="card flex items-center gap-3 mb-2 hover:bg-white/5">
                    <img src={u.avatar} className="w-12 h-12 rounded-full" />
                    <div><p className="font-semibold">{u.username}</p><p className="text-xs text-gray-400">{u.email}</p></div>
                  </Link>
                ))}
              </div>
            )}

            {(tab === 'all' || tab === 'vlogs') && results.vlogs?.length > 0 && (
              <div className="mb-6">
                {tab === 'all' && <h3 className="text-sm text-gray-400 mb-3">🎬 Vlog</h3>}
                {results.vlogs.map(v => (
                  <Link key={v.id} to={`/vlog/${v.id}`} className="card mb-2 hover:bg-white/5 block">
                    <p className="font-bold">{v.title}</p>
                    <p className="text-sm text-gray-400 line-clamp-2 mt-1">{v.content}</p>
                    <p className="text-xs text-gray-500 mt-1">{v.author?.username} · {v.createdAt}</p>
                  </Link>
                ))}
              </div>
            )}

            {(tab === 'all' || tab === 'shares') && results.shares?.length > 0 && (
              <div>
                {tab === 'all' && <h3 className="text-sm text-gray-400 mb-3">🔥 分享</h3>}
                {results.shares.map(s => (
                  <Link key={s.id} to={`/shares/${s.id}`} className="card mb-2 hover:bg-white/5 block">
                    <p className="font-bold">{s.title}</p>
                    <p className="text-sm text-gray-400 line-clamp-2 mt-1">{s.content}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.author?.username} · {s.createdAt}</p>
                  </Link>
                ))}
              </div>
            )}

            {total === 0 && (
              <div className="text-center py-20 text-gray-500">未找到相关内容</div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Search;
