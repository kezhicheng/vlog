import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import CurvedCarousel from '../components/CurvedCarousel';
import { useAuth } from '../contexts/AuthContext';

const VlogDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [vlog, setVlog] = useState(null);
  const [comments, setComments] = useState([]);
  const [views, setViews] = useState([]);
  const [likedUsers, setLikedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [showLikesModal, setShowLikesModal] = useState(false);

  useEffect(() => {
    fetchVlog();
    fetchComments();
    fetchViews();
    fetchLikedUsers();
    recordView();
  }, [id]);

  const fetchVlog = async () => {
    try {
      const response = await axios.get(`/api/vlogs/${id}`);
      setVlog(response.data);
    } catch (error) {
      console.error('获取Vlog失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await axios.get(`/api/vlogs/${id}/comments`);
      setComments(response.data);
    } catch (error) {
      console.error('获取评论失败:', error);
    }
  };

  const fetchViews = async () => {
    try {
      const response = await axios.get(`/api/vlogs/${id}/views`);
      setViews(response.data);
    } catch (error) {
      console.error('获取查看记录失败:', error);
    }
  };

  const fetchLikedUsers = async () => {
    try {
      const response = await axios.get(`/api/vlogs/${id}/likes`);
      setLikedUsers(response.data);
    } catch (error) {
      console.error('获取点赞列表失败:', error);
    }
  };

  const recordView = async () => {
    try {
      await axios.post(`/api/vlogs/${id}/view`, {
        userId: user.id
      });
    } catch (error) {
      console.error('记录查看失败:', error);
    }
  };

  const handleLike = async () => {
    try {
      const response = await axios.post(`/api/vlogs/${id}/like`, {
        userId: user.id
      });
      setVlog(response.data);
      fetchLikedUsers();
    } catch (error) {
      console.error('点赞失败:', error);
    }
  };

  const [shareModal, setShareModal] = useState(false);
  const [friends, setFriends] = useState([]);

  useEffect(() => { axios.get(`/api/friends/${user.id}`).then(r => setFriends(r.data)).catch(()=>{}); }, [user.id]);

  const handleReport = () => {
    const reason = prompt('举报原因：');
    if (!reason) return;
    axios.post('/api/reports', { targetType: 'vlog', targetId: id, reason }).then(() => alert('举报已提交')).catch(() => alert('举报失败'));
  };

  const handleShare = async (friendId) => {
    await axios.post('/api/share-content', { receiverId: friendId, content: `📹 [Vlog] ${vlog.title}\n${window.location.origin}/vlog/${vlog.id}` });
    setShareModal(false);
    alert('已分享');
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await axios.post(`/api/vlogs/${id}/comments`, {
        userId: user.id,
        content: newComment,
        parentId: replyTo?.id || null
      });
      setNewComment('');
      setReplyTo(null);
      fetchComments();
    } catch (error) {
      console.error('发送评论失败:', error);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('确定要删除这条评论吗？')) return;

    try {
      await axios.delete(`/api/vlogs/${id}/comments/${commentId}`, {
        data: { userId: user.id }
      });
      fetchComments();
    } catch (error) {
      alert(error.response?.data?.message || '删除失败');
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const isLiked = vlog?.likedBy?.includes(user.id);

  if (loading || !vlog) {
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 主内容区域 */}
            <div className="lg:col-span-2 space-y-6">
              {/* Vlog内容 */}
              <div className="card">
                {/* 视频 */}
                {vlog.videoUrl && (
                    <div className="mb-5">
                      <video
                          src={vlog.videoUrl}
                          controls
                          className="w-full rounded-2xl"
                          style={{ maxHeight: '500px' }}
                      />
                    </div>
                )}

                {/* 图片轮播 */}
                {vlog.images && vlog.images.length > 0 && (
                    <div className="mb-5">
                      <CurvedCarousel images={vlog.images} />
                    </div>
                )}

                {/* 标题和内容 */}
                {vlog.status === 'violation' && (
                  <div className="bg-red-500/20 border border-red-500/40 text-red-300 px-4 py-3 rounded-xl mb-4 text-sm">
                    🚫 该内容已被标记为违规，仅作者可见
                  </div>
                )}
                <h1 className="text-3xl font-bold gradient-text mb-4">{vlog.title}</h1>
                {vlog.content && (
                    <p className="text-gray-300 mb-6 whitespace-pre-wrap">{vlog.content}</p>
                )}

                {/* 作者和统计 */}
                <div className="flex items-center justify-between border-t border-white/10 pt-4">
                  <Link
                      to={`/profile/${vlog.author?.id}`}
                      className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                  >
                    <img
                        src={vlog.author?.avatar}
                        alt={vlog.author?.username}
                        className="w-12 h-12 rounded-full border-2 border-white/30"
                    />
                    <div>
                      <h3 className="font-semibold">{vlog.author?.username}</h3>
                      <p className="text-sm text-gray-400">{formatTime(vlog.createdAt)}</p>
                    </div>
                  </Link>

                  <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                    <button onClick={() => setShowLikesModal(true)}
                      className={`flex items-center gap-1 transition-colors ${isLiked ? 'text-red-400' : 'text-gray-400 hover:text-white'}`}>
                      <svg className="w-5 h-5" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      <span className="text-sm font-semibold">{vlog.likes || 0}</span>
                    </button>
                    <button onClick={handleLike} className="text-sm px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition">
                      {isLiked ? '❤️' : '🤍'}
                    </button>
                    <span className="flex items-center gap-1 text-gray-400 text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      {vlog.views || 0}
                    </span>
                    <button onClick={handleReport} className="text-xs px-2 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition">🚩</button>
                    <button onClick={() => setShareModal(true)} className="text-xs px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition">↗</button>
                  </div>
                </div>
              </div>

              {/* 分享弹窗 */}
              {shareModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShareModal(false)}>
                  <div className="card max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
                    <h3 className="font-bold mb-4">分享给好友</h3>
                    {friends.length === 0 ? <p className="text-gray-500">暂无好友</p> :
                      friends.map(f => (
                        <button key={f.id} onClick={() => handleShare(f.id)} className="w-full text-left p-3 hover:bg-white/5 rounded-xl flex items-center gap-3">
                          <img src={f.avatar} className="w-10 h-10 rounded-full" /><span>{f.username}</span>
                        </button>))}
                    <button onClick={() => setShareModal(false)} className="btn-secondary w-full mt-4">取消</button>
                  </div>
                </div>
              )}

              {/* 评论区 */}
              <div className="card">
                <h2 className="text-2xl font-bold mb-6">评论 ({comments.length})</h2>

                {/* 发表评论 */}
                <form onSubmit={handleAddComment} className="mb-6">
                  {replyTo && (
                      <div className="mb-2 flex items-center gap-2 text-sm text-gray-400">
                        <span>回复 @{replyTo.user.username}</span>
                        <button
                            type="button"
                            onClick={() => setReplyTo(null)}
                            className="text-red-400 hover:text-red-300"
                        >
                          取消
                        </button>
                      </div>
                  )}
                  <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="input-field resize-none"
                      placeholder={replyTo ? `回复 @${replyTo.user.username}...` : "发表你的评论..."}
                      rows="3"
                  />
                  <button
                      type="submit"
                      disabled={!newComment.trim()}
                      className="btn-primary mt-3"
                  >
                    {replyTo ? '发表回复' : '发表评论'}
                  </button>
                </form>

                {/* 评论列表 */}
                <div className="space-y-4">
                  {comments.length === 0 ? (
                      <p className="text-center text-gray-400 py-10">暂无评论，快来发表第一条评论吧</p>
                  ) : (
                      comments
                          .filter(comment => !comment.parentId)
                          .map((comment) => (
                              <div key={comment.id} className="space-y-3">
                                <div className="glass-effect rounded-2xl p-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3 flex-1">
                                      <Link to={`/profile/${comment.user.id}`}>
                                        <img
                                            src={comment.user.avatar}
                                            alt={comment.user.username}
                                            className="w-10 h-10 rounded-full border-2 border-white/20"
                                        />
                                      </Link>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <Link
                                              to={`/profile/${comment.user.id}`}
                                              className="font-semibold hover:text-white transition-colors"
                                          >
                                            {comment.user.username}
                                          </Link>
                                          <span className="text-xs text-gray-500">
                                    {formatTime(comment.createdAt)}
                                  </span>
                                        </div>
                                        <p className="text-gray-300 mb-2">{comment.content}</p>
                                        <button
                                            onClick={() => setReplyTo(comment)}
                                            className="text-sm text-gray-400 hover:text-white transition-colors"
                                        >
                                          回复
                                        </button>
                                      </div>
                                    </div>

                                    {/* 删除按钮（评论作者或Vlog作者可见） */}
                                    {(comment.userId === user.id || vlog.userId === user.id) && (
                                        <button
                                            onClick={() => handleDeleteComment(comment.id)}
                                            className="text-gray-400 hover:text-red-400 transition-colors ml-2"
                                        >
                                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                            />
                                          </svg>
                                        </button>
                                    )}
                                  </div>
                                </div>

                                {/* 回复列表 */}
                                {comments
                                    .filter(reply => reply.parentId === comment.id)
                                    .map((reply) => (
                                        <div key={reply.id} className="ml-12 glass-effect rounded-2xl p-4">
                                          <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-3 flex-1">
                                              <Link to={`/profile/${reply.user.id}`}>
                                                <img
                                                    src={reply.user.avatar}
                                                    alt={reply.user.username}
                                                    className="w-8 h-8 rounded-full border-2 border-white/20"
                                                />
                                              </Link>
                                              <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                  <Link
                                                      to={`/profile/${reply.user.id}`}
                                                      className="font-semibold hover:text-white transition-colors text-sm"
                                                  >
                                                    {reply.user.username}
                                                  </Link>
                                                  <span className="text-xs text-gray-500">
                                        {formatTime(reply.createdAt)}
                                      </span>
                                                </div>
                                                <p className="text-gray-300 text-sm mb-2">{reply.content}</p>
                                                <button
                                                    onClick={() => setReplyTo(comment)}
                                                    className="text-xs text-gray-400 hover:text-white transition-colors"
                                                >
                                                  回复
                                                </button>
                                              </div>
                                            </div>

                                            {/* 删除按钮 */}
                                            {(reply.userId === user.id || vlog.userId === user.id) && (
                                                <button
                                                    onClick={() => handleDeleteComment(reply.id)}
                                                    className="text-gray-400 hover:text-red-400 transition-colors ml-2"
                                                >
                                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                    />
                                                  </svg>
                                                </button>
                                            )}
                                          </div>
                                        </div>
                                    ))}
                              </div>
                          ))
                  )}
                </div>
              </div>
            </div>

            {/* 侧边栏 */}
            <div className="lg:col-span-1">
              <div className="card sticky top-20">
                <h2 className="text-xl font-bold mb-4">查看记录</h2>

                {views.length === 0 ? (
                    <p className="text-center text-gray-400 py-6">暂无查看记录</p>
                ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {views.map((view) => (
                          <Link
                              key={view.id}
                              to={`/profile/${view.viewer.id}`}
                              className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors"
                          >
                            <img
                                src={view.viewer.avatar}
                                alt={view.viewer.username}
                                className="w-10 h-10 rounded-full border-2 border-white/20"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate">{view.viewer.username}</p>
                              <p className="text-xs text-gray-400">{formatTime(view.viewedAt)}</p>
                            </div>
                          </Link>
                      ))}
                    </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 点赞列表模态框 */}
        {showLikesModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="glass-effect rounded-3xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">点赞列表</h2>
                  <button
                      onClick={() => setShowLikesModal(false)}
                      className="text-gray-400 hover:text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {likedUsers.length === 0 ? (
                    <p className="text-center text-gray-400 py-10">还没有人点赞</p>
                ) : (
                    <div className="space-y-3">
                      {likedUsers.map((likedUser) => (
                          <Link
                              key={likedUser.id}
                              to={`/profile/${likedUser.id}`}
                              onClick={() => setShowLikesModal(false)}
                              className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
                          >
                            <img
                                src={likedUser.avatar}
                                alt={likedUser.username}
                                className="w-12 h-12 rounded-full border-2 border-white/20"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate">{likedUser.username}</p>
                              {likedUser.bio && (
                                  <p className="text-sm text-gray-400 truncate">{likedUser.bio}</p>
                              )}
                            </div>
                          </Link>
                      ))}
                    </div>
                )}
              </div>
            </div>
        )}
      </div>
  );
};

export default VlogDetail;