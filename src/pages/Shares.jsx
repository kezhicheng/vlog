import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link, useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CurvedCarousel from '../components/CurvedCarousel';
import { useAuth } from '../contexts/AuthContext';

const CATEGORIES = [
  { key: 'all', label: '全部', icon: '🔥' },
  { key: 'product', label: '好物', icon: '🛍' },
  { key: 'article', label: '文章', icon: '📝' },
  { key: 'app', label: '工具', icon: '🛠' },
  { key: 'file', label: '资源', icon: '📦' },
  { key: 'other', label: '其他', icon: '📌' },
];

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + 'KB';
  return (bytes / 1048576).toFixed(1) + 'MB';
};

// 简易 Markdown 渲染
const renderMarkdown = (text) => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h4 class=\"text-base font-bold mt-3 mb-1\">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class=\"text-lg font-bold mt-4 mb-2\">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class=\"text-xl font-bold mt-4 mb-2\">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class=\"bg-white/10 px-1.5 py-0.5 rounded text-sm\">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href=\"$2\" target=\"_blank\" class=\"text-blue-400 underline\">$1</a>')
    .replace(/^- (.+)$/gm, '<li class=\"ml-4 list-disc\">$1</li>')
    .replace(/\n/g, '<br/>');
};

const isImageFile = (url) => /\.(jpe?g|png|gif|webp|svg)(\?|$)/i.test(url);

// ========== 分享列表页 ==========
const ShareList = ({ shares, loading, category, setCategory, user, onLike, onDelete, onView, onUnfavorite }) => {
  const [favorites, setFavorites] = useState([]);
  const [showFavorites, setShowFavorites] = useState(false);

  useEffect(() => {
    if (showFavorites && user) {
      axios.get(`/api/shares/favorites/${user.id}`).then(r => setFavorites(r.data)).catch(() => {});
    }
  }, [showFavorites, user]);

  const displayShares = showFavorites ? favorites : (category === 'all' ? shares : shares.filter(s => s.category === category));

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl md:text-4xl font-bold gradient-text">🔥 好物分享</h1>
        <Link to="/shares/create" className="btn-primary flex items-center gap-2">
          <span>+</span> 发布分享
        </Link>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {CATEGORIES.map(c => (
          <button key={c.key} onClick={() => { setCategory(c.key); setShowFavorites(false); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${
              !showFavorites && category === c.key ? 'bg-white/20 text-white' : 'glass-effect text-gray-400 hover:text-white'
            }`}>
            {c.icon} {c.label}
          </button>
        ))}
        <button onClick={() => setShowFavorites(!showFavorites)}
          className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${
            showFavorites ? 'bg-yellow-500/20 text-yellow-400' : 'glass-effect text-gray-400 hover:text-yellow-400'
          }`}>
          ⭐ 我的收藏
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
        </div>
      ) : displayShares.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">{showFavorites ? '⭐' : '📭'}</div>
          <h3 className="text-2xl font-bold text-gray-300">{showFavorites ? '暂无收藏' : '暂无分享'}</h3>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {displayShares.map(share => (
            <div key={share.id} className="card hover:bg-white/5 transition-all cursor-pointer overflow-hidden flex flex-col"
              onClick={() => onView(share)}>
              {/* 封面图 */}
              {share.images?.length > 0 && (
                <div className="relative rounded-xl overflow-hidden aspect-[3/2] bg-white/5 mb-3">
                  <img src={share.images[0]} className="absolute inset-0 w-full h-full object-cover" alt="" />
                  {share.images.length > 1 && (
                    <span className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
                      +{share.images.length - 1}
                    </span>
                  )}
                </div>
              )}
              {/* 分类标签 */}
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-400 self-start mb-2">
                {CATEGORIES.find(c => c.key === share.category)?.icon} {CATEGORIES.find(c => c.key === share.category)?.label}
              </span>
              {/* 标题 */}
              <h3 className="font-bold mb-1 line-clamp-2 leading-snug">{share.title}</h3>
              {share.content && <p className="text-gray-400 text-sm mb-3 line-clamp-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(share.content).replace(/<br\/>/g,' ') }} />}
              {share.link && (
                <div className="bg-white/5 rounded-xl p-2 mb-3 border border-white/5">
                  <p className="text-blue-400 text-xs font-medium truncate">{share.linkTitle || share.link}</p>
                </div>
              )}
              {share.files?.length > 0 && (
                <div className="flex items-center gap-2 mb-3 px-2 py-1.5 bg-white/5 rounded-lg">
                  <span className="text-base">{isImageFile(share.files[0]?.url || share.files[0]?.name) ? '🖼' : '📄'}</span>
                  <span className="text-xs text-gray-400 truncate flex-1">{share.files[0]?.name || '附件'}</span>
                  {share.files.length > 1 && <span className="text-xs text-gray-500">+{share.files.length - 1}</span>}
                </div>
              )}
              {/* 底部信息 */}
              <div className="flex items-center gap-2 mt-auto pt-2 border-t border-white/5">
                <span className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0">
                  {(share.author?.username || '?')[0]}
                </span>
                <span className="text-xs text-gray-400 truncate">{share.author?.username}</span>
                <span className="text-xs text-gray-600 ml-auto">{new Date(share.createdAt).toLocaleDateString('zh-CN')}</span>
                <span className="text-xs text-gray-600">⭐{share.favorites || 0}</span>
                <span className="text-xs text-gray-600">❤️{share.likes || 0}</span>
              </div>
              {showFavorites && (
                <button onClick={(e) => { e.stopPropagation(); axios.post(`/api/shares/${share.id}/favorite`).then(() => setFavorites(prev => prev.filter(f => f.id !== share.id))).catch(()=>{}); }}
                  className="text-xs text-yellow-400 hover:text-yellow-300 mt-2">取消收藏</button>
              )}
              {!showFavorites && share.userId === user?.id && (
                <button onClick={(e) => { e.stopPropagation(); onDelete(share.id); }}
                  className="text-xs text-red-400 hover:text-red-300 mt-2">删除</button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

// ========== 创建分享页 ==========
const ShareCreate = ({ user, onDone }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', content: '', link: '', linkTitle: '', category: 'other' });
  const [formImages, setFormImages] = useState([]);
  const [formFiles, setFormFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const imgInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setFormImages(prev => [...prev, ...files]);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreviews(prev => [...prev, reader.result]);
      reader.readAsDataURL(f);
    });
  };

  const handleFileChange = (e) => setFormFiles(prev => [...prev, ...Array.from(e.target.files)]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { alert('请输入标题'); return; }
    setSubmitting(true);
    try {
      let uploadedImages = [], uploadedFiles = [];
      const allToUpload = [...formImages, ...formFiles];
      if (allToUpload.length > 0) {
        const fd = new FormData();
        allToUpload.forEach(f => fd.append('file', f));
        const up = await axios.post('/api/shares/upload', fd);
        uploadedImages = up.data.slice(0, formImages.length).map(f => f.url);
        uploadedFiles = up.data.slice(formImages.length);
      }
      const res = await axios.post('/api/shares', {
        title: form.title, content: form.content, link: form.link,
        linkTitle: form.linkTitle, category: form.category,
        images: uploadedImages, files: uploadedFiles,
        tags: (form.tags || '').split(/[,，\s]+/).filter(Boolean)
      });
      alert('发布成功！');
      navigate('/shares/' + res.data.id);
      onDone?.();
    } catch (e) {
      alert('发布失败: ' + (e.response?.data?.message || e.message));
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link to="/shares" className="text-gray-400 hover:text-white mb-6 flex items-center gap-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> 返回列表
        </Link>
        <h1 className="text-3xl font-bold gradient-text mb-6">发布分享</h1>
        <div className="card">
          <form onSubmit={handleCreate} className="space-y-5">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">分类</label>
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.filter(c => c.key !== 'all').map(c => (
                  <button type="button" key={c.key} onClick={() => setForm({ ...form, category: c.key })}
                    className={`px-3 py-1.5 rounded-xl text-sm transition ${form.category === c.key ? 'bg-white/20 text-white' : 'glass-effect text-gray-400'}`}>
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
            </div>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="分享标题 *" className="input-field text-lg" required />
            <input value={form.tags || ''} onChange={e => setForm({ ...form, tags: e.target.value })}
              placeholder="标签（用逗号或空格分隔，如：数码, iPhone, 评测）" className="input-field text-sm" />
            <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
              placeholder="描述内容...支持 Markdown 格式" className="input-field min-h-[150px] resize-none" rows="6" />
            <div className="bg-white/5 rounded-xl p-4 space-y-3">
              <p className="text-xs text-gray-400">🔗 链接（选填）</p>
              <input value={form.linkTitle} onChange={e => setForm({ ...form, linkTitle: e.target.value })}
                placeholder="链接标题" className="input-field text-sm" />
              <input value={form.link} onChange={e => setForm({ ...form, link: e.target.value })}
                placeholder="https://..." className="input-field text-sm" type="url" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => imgInputRef.current?.click()}
                className="btn-secondary text-sm">🖼 添加图片</button>
              <input type="file" ref={imgInputRef} className="hidden" accept="image/*" multiple onChange={handleImageChange} />
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="btn-secondary text-sm">📎 添加文件</button>
              <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileChange} />
            </div>
            {imagePreviews.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {imagePreviews.map((p, i) => (
                  <div key={i} className="relative">
                    <img src={p} className="w-24 h-24 object-cover rounded-xl" />
                    <button type="button" onClick={() => { setFormImages(prev => prev.filter((_, idx) => idx !== i)); setImagePreviews(prev => prev.filter((_, idx) => idx !== i)); }}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">&times;</button>
                  </div>
                ))}
              </div>
            )}
            {formFiles.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-400">
                <span>📄</span> {f.name}
                <button type="button" onClick={() => setFormFiles(prev => prev.filter((_, idx) => idx !== i))}
                  className="text-red-400 text-xs">移除</button>
              </div>
            ))}
            <button type="submit" disabled={submitting}
              className="btn-primary w-full py-3 text-lg">{submitting ? '发布中...' : '🚀 发布分享'}</button>
          </form>
        </div>
      </div>
    </div>
  );
};

// ========== 分享详情页 ==========
const ShareDetail = ({ user, onBack }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [share, setShare] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [favorited, setFavorited] = useState(false);
  const [liked, setLiked] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [shareModal, setShareModal] = useState(false);
  const [friends, setFriends] = useState([]);

  useEffect(() => { if (user) axios.get('/api/friends/' + user.id).then(r => setFriends(r.data)).catch(() => { }); }, [user]);

  const handleReport = () => {
    const reason = prompt('举报原因：');
    if (!reason) return;
    axios.post('/api/reports', { targetType: 'share', targetId: id, reason }).then(() => alert('已提交')).catch(() => alert('失败'));
  };

  const handleEdit = async () => {
    if (!editData.title) return;
    await axios.patch(`/api/shares/${id}`, {
      title: editData.title, content: editData.content, link: editData.link,
      linkTitle: editData.linkTitle, category: editData.category,
      tags: (editData.tags || '').split(/[,，\s]+/).filter(Boolean)
    });
    setShare(prev => ({ ...prev, ...editData }));
    setEditMode(false);
  };

  const handleShare = async (friendId) => {
    await axios.post('/api/share-content', { receiverId: friendId, content: `🔥 [分享] ${share?.title}\n${window.location.origin}/shares/${id}` });
    setShareModal(false); alert('已分享');
  };

  useEffect(() => {
    fetchShare();
    fetchComments();
    if (user) {
      axios.post(`/api/shares/${id}/view`).catch(() => {});
      axios.get(`/api/shares/${id}/favorite`).then(r => setFavorited(r.data.favorited)).catch(() => {});
    }
  }, [id, user]);

  const fetchShare = async () => {
    try {
      const r = await axios.get(`/api/shares/${id}`);
      setShare(r.data);
      setLiked((r.data.likedBy || []).includes(user?.id));
    } catch { navigate('/shares'); }
    finally { setLoading(false); }
  };

  const fetchComments = async () => {
    try {
      const r = await axios.get(`/api/shares/${id}/comments`);
      setComments(r.data);
    } catch { /* silent */ }
  };

  const handleLike = async () => {
    try {
      const r = await axios.post(`/api/shares/${id}/like`);
      setShare(prev => ({ ...prev, likes: r.data.likes, likedBy: r.data.likedBy }));
      setLiked((r.data.likedBy || []).includes(user?.id));
    } catch { /* silent */ }
  };

  const handleFavorite = async () => {
    try {
      const r = await axios.post(`/api/shares/${id}/favorite`);
      setFavorited(r.data.favorited);
    } catch { /* silent */ }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const r = await axios.post(`/api/shares/${id}/comments`, { content: newComment });
      setComments(prev => [r.data, ...prev]);
      setNewComment('');
    } catch (e) { alert(e.response?.data?.message || '评论失败'); }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('删除评论？')) return;
    await axios.delete(`/api/shares/${id}/comments/${commentId}`);
    fetchComments();
  };

  const handleDeleteShare = async () => {
    if (!confirm('确定删除？')) return;
    await axios.delete(`/api/shares/${id}`);
    navigate('/shares');
  };

  if (loading) return (
    <div className="min-h-screen"><Navbar /><div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
    </div></div>
  );

  if (!share) return null;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* 返回 */}
        <button onClick={() => navigate('/shares')} className="text-gray-400 hover:text-white mb-6 flex items-center gap-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> 返回列表
        </button>

        {/* 头部信息 */}
        <div className="flex items-center gap-4 mb-6">
          <Link to={`/profile/${share.author?.id}`}>
            <img src={share.author?.avatar} className="w-14 h-14 rounded-full border-2 border-white/20" />
          </Link>
          <div className="flex-1">
            <Link to={`/profile/${share.author?.id}`} className="font-semibold text-lg hover:underline">
              {share.author?.username}
            </Link>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs">
                {CATEGORIES.find(c => c.key === share.category)?.icon} {CATEGORIES.find(c => c.key === share.category)?.label}
              </span>
              <span>{new Date(share.createdAt).toLocaleString('zh-CN')}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleFavorite}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${favorited ? 'bg-yellow-500/20 text-yellow-400' : 'glass-effect text-gray-400 hover:text-yellow-400'}`}>
              {favorited ? '⭐ 已收藏' : '☆ 收藏'}
            </button>
            {share.userId === user?.id && (
              <button onClick={handleDeleteShare} className="px-4 py-2 rounded-xl text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30">删除</button>
            )}
          </div>
        </div>

        {/* 标题和内容 */}
        {editMode ? (
          <div className="space-y-3 mb-4">
            <input value={editData.title} onChange={e => setEditData({...editData, title: e.target.value})}
              className="input-field text-lg" placeholder="标题" />
            <textarea value={editData.content} onChange={e => setEditData({...editData, content: e.target.value})}
              className="input-field min-h-[100px]" placeholder="内容(支持Markdown)" rows="5" />
            <input value={editData.linkTitle} onChange={e => setEditData({...editData, linkTitle: e.target.value})}
              className="input-field text-sm" placeholder="链接标题" />
            <input value={editData.link} onChange={e => setEditData({...editData, link: e.target.value})}
              className="input-field text-sm" placeholder="链接URL" />
            <input value={editData.tags} onChange={e => setEditData({...editData, tags: e.target.value})}
              className="input-field text-sm" placeholder="标签（逗号分隔）" />
            <div className="flex gap-2">
              <button onClick={handleEdit} className="btn-primary text-sm">💾 保存</button>
              <button onClick={() => setEditMode(false)} className="btn-secondary text-sm">取消</button>
            </div>
          </div>
        ) : (
          <>
            {share.status === 'violation' && (
              <div className="bg-red-500/20 border border-red-500/40 text-red-300 px-4 py-3 rounded-xl mb-4 text-sm">
                🚫 该内容已被标记为违规，仅作者可见
              </div>
            )}
            <h1 className="text-2xl md:text-4xl font-bold mb-2 break-words">{share.title}</h1>
            {share.tags?.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-4">
                {share.tags.map(t => (
                  <Link key={t} to={`/tags/${encodeURIComponent(t)}`}
                    className="text-sm px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition">#{t}</Link>
                ))}
              </div>
            )}
            {share.content && (
              <div className="text-gray-300 text-sm md:text-lg leading-relaxed mb-6 break-words"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(share.content) }} />
            )}
          </>
        )}

        {/* 链接卡片 */}
        {!editMode && share.link && (
          <a href={share.link} target="_blank" rel="noopener noreferrer"
            className="block bg-white/5 rounded-2xl p-6 mb-6 hover:bg-white/10 transition border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🔗</span>
              <span className="text-blue-400 font-semibold text-lg">{share.linkTitle || '查看链接'}</span>
            </div>
            <p className="text-gray-500 text-sm break-all">{share.link}</p>
          </a>
        )}

        {/* 图片展示 — 使用轮播 */}
        {share.images?.length > 0 && (
          <div className="mb-6">
            <CurvedCarousel images={share.images} />
          </div>
        )}

        {/* 附件列表 */}
        {share.files?.length > 0 && (
          <div className="mb-6 bg-white/5 rounded-2xl p-5">
            <h3 className="text-lg font-bold mb-4">📎 附件 ({share.files.length})</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {share.files.map((f, i) => (
                <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition border border-white/5">
                  <span className="text-3xl">{isImageFile(f.url || f.name) ? '🖼' : '📄'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{f.name}</p>
                    {f.size && <p className="text-xs text-gray-500">{formatFileSize(f.size)}</p>}
                  </div>
                  <span className="text-blue-400 text-sm flex-shrink-0">⬇ 下载</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 操作栏 */}
        <div className="flex items-center gap-6 py-4 border-t border-b border-white/10 mb-8">
          <button onClick={handleLike} className={`flex items-center gap-1 transition ${liked ? 'text-red-400' : 'text-gray-400 hover:text-red-400'}`}>
            {liked ? '❤️' : '🤍'} <span className="text-sm">{share.likes || 0}</span>
          </button>
          <span className="flex items-center gap-1 text-gray-400 text-sm">⭐ {share.favorites || 0}</span>
          <span className="flex items-center gap-1 text-gray-400 text-sm">💬 {comments.length}</span>
          <span className="flex items-center gap-1 text-gray-400 text-sm">👁 {share.views || 0}</span>
          <button onClick={handleReport} className="text-xs px-2 py-1 rounded-lg bg-red-500/10 text-red-400">🚩</button>
          <button onClick={() => setShareModal(true)} className="text-xs px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400">↗</button>
          {share.userId === user?.id && (
            <button onClick={() => { setEditMode(true); setEditData({ title: share.title, content: share.content, link: share.link, linkTitle: share.linkTitle, category: share.category, tags: (share.tags||[]).join(', ') }); }}
              className="text-xs px-2 py-1 rounded-lg bg-green-500/10 text-green-400">✏️</button>
          )}
        </div>

        {/* 分享弹窗 */}
        {shareModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShareModal(false)}>
            <div className="card max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold mb-4">分享给好友</h3>
              {friends.length === 0 ? <p className="text-gray-500 text-center py-4">暂无好友</p> :
                friends.map(f => (
                  <button key={f.id} onClick={() => handleShare(f.id)} className="w-full text-left p-3 hover:bg-white/5 rounded-xl flex items-center gap-3">
                    <img src={f.avatar} className="w-10 h-10 rounded-full" /><span>{f.username}</span>
                  </button>))}
              <button onClick={() => setShareModal(false)} className="btn-secondary w-full mt-4">取消</button>
            </div>
          </div>
        )}

        {/* 评论区 */}
        <div>
          <h3 className="text-xl font-bold mb-4">评论 ({comments.length})</h3>
          {user && (
            <form onSubmit={handleComment} className="flex gap-3 mb-6">
              <img src={user.avatar} className="w-10 h-10 rounded-full flex-shrink-0" />
              <div className="flex-1">
                <textarea value={newComment} onChange={e => setNewComment(e.target.value)}
                  placeholder="写下你的评论..." className="input-field resize-none min-h-[60px]" rows="2" />
                <div className="flex justify-end mt-2">
                  <button type="submit" disabled={!newComment.trim()} className="btn-primary text-sm">发表评论</button>
                </div>
              </div>
            </form>
          )}
          <div className="space-y-4">
            {comments.map(c => (
              <div key={c.id} className="flex gap-3">
                <Link to={`/profile/${c.user?.id}`}>
                  <img src={c.user?.avatar} className="w-10 h-10 rounded-full flex-shrink-0" />
                </Link>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Link to={`/profile/${c.user?.id}`} className="font-semibold text-sm hover:underline">{c.user?.username}</Link>
                    <span className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleString('zh-CN')}</span>
                  </div>
                  <p className="text-gray-300 mt-1">{c.content}</p>
                  {(c.userId === user?.id || share?.userId === user?.id) && (
                    <button onClick={() => handleDeleteComment(c.id)} className="text-xs text-red-400 mt-1">删除</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

// ========== 主入口 ==========
const Shares = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');

  // 路由判断：/shares/create → 创建页，/shares/:id → 详情页，/shares → 列表
  const isCreate = window.location.pathname === '/shares/create';
  const isDetail = !!id && !isCreate;

  useEffect(() => {
    if (!isDetail && !isCreate && user) fetchShares();
    else if (!user) setLoading(false);
  }, [id, user]);

  const fetchShares = async () => {
    setLoading(true);
    try { const r = await axios.get(`/api/shares/user/${user.id}`); setShares(r.data); }
    catch { /* silent */ } finally { setLoading(false); }
  };

  const handleLike = async (shareId) => {
    try {
      const r = await axios.post(`/api/shares/${shareId}/like`);
      setShares(prev => prev.map(s => s.id === shareId ? { ...s, likes: r.data.likes, likedBy: r.data.likedBy } : s));
    } catch { /* silent */ }
  };

  const handleDelete = async (shareId) => {
    if (!confirm('确定删除？')) return;
    await axios.delete(`/api/shares/${shareId}`);
    fetchShares();
  };

  const handleView = (share) => navigate('/shares/' + share.id);

  if (isCreate) return <ShareCreate user={user} onDone={() => navigate('/shares')} />;
  if (isDetail) return <ShareDetail user={user} />;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <ShareList shares={shares} loading={loading} category={category} setCategory={setCategory}
          user={user} onLike={handleLike} onDelete={handleDelete} onView={handleView} />
      </div>
    </div>
  );
};

export default Shares;
