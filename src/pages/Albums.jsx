import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import CurvedCarousel from '../components/CurvedCarousel';
import { useAuth } from '../contexts/AuthContext';

const Albums = () => {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [newAlbum, setNewAlbum] = useState({
    title: '',
    description: '',
    images: []
  });
  const [imagePreviews, setImagePreviews] = useState([]);

  const isOwnAlbum = currentUser?.id === userId;

  useEffect(() => {
    fetchAlbums();
  }, [userId]);

  const fetchAlbums = async () => {
    try {
      const response = await axios.get(`/api/albums/${userId}`);
      setAlbums(response.data);
    } catch (error) {
      console.error('获取相册失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setNewAlbum({ ...newAlbum, images: files });

    // 创建预览
    const previews = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(previews).then(results => {
      setImagePreviews(results);
    });
  };

  const handleCreateAlbum = async (e) => {
    e.preventDefault();
    if (newAlbum.images.length === 0) {
      alert('请至少上传一张图片');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('userId', currentUser.id);
      formData.append('title', newAlbum.title);
      formData.append('description', newAlbum.description);

      newAlbum.images.forEach(image => {
        formData.append('images', image);
      });

      await axios.post('/api/albums', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setShowCreateModal(false);
      setNewAlbum({ title: '', description: '', images: [] });
      setImagePreviews([]);
      fetchAlbums();
    } catch (error) {
      alert('创建相册失败');
    }
  };

  const handleDeleteAlbum = async (albumId) => {
    if (!confirm('确定要删除这个相册吗？')) return;

    try {
      await axios.delete(`/api/albums/${albumId}`, {
        data: { userId: currentUser.id }
      });
      fetchAlbums();
    } catch (error) {
      alert('删除失败');
    }
  };

  if (loading) {
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
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold gradient-text">
              {isOwnAlbum ? '我的相册' : '相册'}
            </h1>
            {isOwnAlbum && (
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  创建相册
                </button>
            )}
          </div>

          {albums.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">📷</div>
                <h3 className="text-2xl font-bold text-gray-300 mb-2">
                  {isOwnAlbum ? '还没有相册' : '该用户还没有相册'}
                </h3>
                {isOwnAlbum && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn-primary mt-4"
                    >
                      创建第一个相册
                    </button>
                )}
              </div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {albums.map((album) => (
                    <div
                        key={album.id}
                        className="group relative"
                        style={{
                          perspective: '1000px'
                        }}
                    >
                      {/* 炫酷卡片容器 - 带3D效果 */}
                      <div
                          className="relative rounded-3xl overflow-hidden transition-all duration-500 transform-gpu"
                          style={{
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                            transformStyle: 'preserve-3d'
                          }}
                          onMouseMove={(e) => {
                            const card = e.currentTarget;
                            const rect = card.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const y = e.clientY - rect.top;
                            const centerX = rect.width / 2;
                            const centerY = rect.height / 2;
                            const rotateX = (y - centerY) / 20;
                            const rotateY = (centerX - x) / 20;

                            card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'rotateX(0) rotateY(0) scale(1)';
                          }}
                      >
                        {/* 动态渐变边框光效 */}
                        <div
                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                            style={{
                              background: 'linear-gradient(45deg, #ff00ff, #00ffff, #ff00ff)',
                              backgroundSize: '200% 200%',
                              animation: 'gradient-shift 3s ease infinite',
                              filter: 'blur(20px)',
                              zIndex: -1
                            }}
                        />

                        {/* 相册封面 */}
                        <div
                            className="cursor-pointer p-4 relative overflow-hidden"
                            onClick={() => setSelectedAlbum(album)}
                        >
                          {/* 背景光晕效果 */}
                          <div
                              className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-500"
                              style={{
                                background: 'radial-gradient(circle at center, rgba(139,92,246,0.3), transparent 70%)',
                                animation: 'pulse 2s ease-in-out infinite'
                              }}
                          />

                          <div className="relative z-10">
                            <CurvedCarousel images={album.images} />
                          </div>

                          {/* 悬停时的遮罩效果 */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center pb-8">
                      <span className="text-white font-bold text-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                        点击查看 →
                      </span>
                          </div>
                        </div>

                        {/* 相册信息 */}
                        <div className="p-6 pt-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="text-xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent group-hover:from-pink-400 group-hover:to-purple-400 transition-all duration-300">
                                {album.title}
                              </h3>
                              {album.description && (
                                  <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                                    {album.description}
                                  </p>
                              )}
                              <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1 text-purple-400">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                            </svg>
                            {album.images.length}
                          </span>
                                <span className="text-gray-500">
                            {new Date(album.createdAt).toLocaleDateString('zh-CN')}
                          </span>
                              </div>
                            </div>

                            {isOwnAlbum && (
                                <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteAlbum(album.id);
                                    }}
                                    className="text-gray-400 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-400/10"
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

                        {/* 底部装饰线 */}
                        <div
                            className="h-1 w-0 group-hover:w-full transition-all duration-500 mx-auto"
                            style={{
                              background: 'linear-gradient(90deg, #8b5cf6, #ec4899, #8b5cf6)',
                              backgroundSize: '200% 100%',
                              animation: 'gradient-x 3s ease infinite'
                            }}
                        />
                      </div>
                    </div>
                ))}
              </div>
          )}
        </div>

        {/* 创建相册模态框 */}
        {showCreateModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold gradient-text">创建相册</h2>
                  <button
                      onClick={() => {
                        setShowCreateModal(false);
                        setNewAlbum({ title: '', description: '', images: [] });
                        setImagePreviews([]);
                      }}
                      className="text-gray-400 hover:text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleCreateAlbum} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      相册标题
                    </label>
                    <input
                        type="text"
                        value={newAlbum.title}
                        onChange={(e) => setNewAlbum({ ...newAlbum, title: e.target.value })}
                        className="input-field"
                        placeholder="给相册起个名字"
                        required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      描述（可选）
                    </label>
                    <textarea
                        value={newAlbum.description}
                        onChange={(e) => setNewAlbum({ ...newAlbum, description: e.target.value })}
                        className="input-field resize-none"
                        placeholder="描述一下这个相册..."
                        rows="3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      上传图片（最多20张）
                    </label>
                    <div className="relative">
                      <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageChange}
                          className="hidden"
                          id="album-images-upload"
                      />
                      <label
                          htmlFor="album-images-upload"
                          className="input-field cursor-pointer flex items-center justify-center gap-2 hover:bg-white/20 transition-all"
                      >
                        {newAlbum.images.length > 0 ? (
                            <>
                              <span>🖼️</span>
                              <span>已选择 {newAlbum.images.length} 张图片</span>
                            </>
                        ) : (
                            <>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>点击选择图片（可多选）</span>
                            </>
                        )}
                      </label>
                    </div>

                    {imagePreviews.length > 0 && (
                        <div className="mt-4 grid grid-cols-4 gap-2">
                          {imagePreviews.map((preview, index) => (
                              <div key={index} className="relative group">
                                <img
                                    src={preview}
                                    alt={`预览 ${index + 1}`}
                                    className="w-full h-24 object-cover rounded-xl transition-transform duration-300 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">{index + 1}</span>
                                </div>
                              </div>
                          ))}
                        </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                        type="button"
                        onClick={() => {
                          setShowCreateModal(false);
                          setNewAlbum({ title: '', description: '', images: [] });
                          setImagePreviews([]);
                        }}
                        className="btn-secondary flex-1"
                    >
                      取消
                    </button>
                    <button
                        type="submit"
                        className="btn-primary flex-1"
                    >
                      创建
                    </button>
                  </div>
                </form>
              </div>
            </div>
        )}

        {/* 相册查看模态框 */}
        {selectedAlbum && (
            <div
                className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                onClick={() => setSelectedAlbum(null)}
            >
              <div className="max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
                <button
                    onClick={() => setSelectedAlbum(null)}
                    className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="mb-4">
                  <CurvedCarousel images={selectedAlbum.images} />
                </div>

                <div className="text-white text-center">
                  <h2 className="text-3xl font-bold mb-2">{selectedAlbum.title}</h2>
                  {selectedAlbum.description && (
                      <p className="text-gray-300 mb-4">{selectedAlbum.description}</p>
                  )}
                  <p className="text-sm text-gray-400">
                    {selectedAlbum.images.length} 张图片 · {new Date(selectedAlbum.createdAt).toLocaleDateString('zh-CN')}
                  </p>
                </div>
              </div>
            </div>
        )}

        {/* CSS 动画 */}
        <style jsx>{`
        @keyframes gradient-shift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes gradient-x {
          0%, 100% {
            background-position: 0% 0%;
          }
          50% {
            background-position: 100% 0%;
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.05);
          }
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
      </div>
  );
};

export default Albums;