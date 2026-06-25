import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const CreateVlog = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    videoUrl: '',
    privacy: 'public',
    tags: ''
  });
  const [files, setFiles] = useState({
    video: null,
    images: []
  });
  const [previews, setPreviews] = useState({
    video: '',
    images: []
  });
  const [uploadMode, setUploadMode] = useState('url'); // 'url' or 'file'
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (e, type) => {
    const selectedFiles = type === 'images' ? Array.from(e.target.files) : e.target.files[0];

    if (type === 'images') {
      setFiles({ ...files, images: selectedFiles });

      // 创建多个预览
      const imagePreviewPromises = selectedFiles.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });
      });

      Promise.all(imagePreviewPromises).then(results => {
        setPreviews({ ...previews, images: results });
      });
    } else {
      setFiles({ ...files, [type]: selectedFiles });

      // 创建单个预览
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews({ ...previews, [type]: reader.result });
      };
      reader.readAsDataURL(selectedFiles);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setUploadProgress(0);

    try {
      let videoUrl = formData.videoUrl;
      let images = [];

      // 如果是文件上传模式
      if (uploadMode === 'file' && (files.video || files.images.length > 0)) {
        const uploadFormData = new FormData();

        if (files.video) {
          uploadFormData.append('video', files.video);
        }
        if (files.images.length > 0) {
          files.images.forEach(image => {
            uploadFormData.append('images', image);
          });
        }

        // 上传文件
        setUploadProgress(30);
        const uploadResponse = await axios.post('/api/upload', uploadFormData, {
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        });

        videoUrl = uploadResponse.data.videoUrl || videoUrl;
        images = uploadResponse.data.images || [];
      }

      // 创建Vlog
      const payload = { ...formData, videoUrl, images, userId: user.id, tags: (formData.tags || '').split(/[,，\s]+/).filter(Boolean) };
      console.log('Creating vlog:', payload);
      await axios.post('/api/vlogs', payload);

      // 重置表单
      setFormData({
        title: '',
        content: '',
        videoUrl: '',
        privacy: 'public',
        tags: ''
      });
      setFiles({ video: null, images: [] });
      setPreviews({ video: '', images: [] });
      setUploadProgress(0);

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('创建Vlog失败:', error);
      const msg = error.response?.data?.message || error.response?.status === 401 ? '登录过期，请重新登录' : error.message || '创建失败，请重试';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold gradient-text">创建新Vlog</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              标题
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input-field"
              placeholder="给你的Vlog起个标题"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              内容描述
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="input-field min-h-[120px] resize-none"
              placeholder="分享你的故事..."
              required
            />
          </div>

          {/* 上传模式切换 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              视频上传方式
            </label>
            <div className="flex gap-4 mb-4">
              <button
                type="button"
                onClick={() => setUploadMode('url')}
                className={`flex-1 py-2 rounded-xl font-semibold transition-all duration-300 ${
                  uploadMode === 'url'
                    ? 'bg-white/90 text-black'
                    : 'glass-effect text-gray-300'
                }`}
              >
                🔗 视频链接
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('file')}
                className={`flex-1 py-2 rounded-xl font-semibold transition-all duration-300 ${
                  uploadMode === 'file'
                    ? 'bg-white/90 text-black'
                    : 'glass-effect text-gray-300'
                }`}
              >
                📁 上传文件
              </button>
            </div>

            {uploadMode === 'url' ? (
              <input
                type="url"
                value={formData.videoUrl}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                className="input-field"
                placeholder="https://..."
              />
            ) : (
              <div className="space-y-4">
                {/* 视频上传 */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    上传视频（支持 MP4, AVI, MOV, WEBM，最大100MB）
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => handleFileChange(e, 'video')}
                      className="hidden"
                      id="video-upload"
                    />
                    <label
                      htmlFor="video-upload"
                      className="input-field cursor-pointer flex items-center justify-center gap-2 hover:bg-white/20 transition-all"
                    >
                      {files.video ? (
                        <>
                          <span>📹</span>
                          <span className="truncate">{files.video.name}</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span>点击选择视频文件</span>
                        </>
                      )}
                    </label>
                  </div>
                  {previews.video && (
                    <div className="mt-2">
                      <video
                        src={previews.video}
                        controls
                        className="w-full rounded-xl max-h-48"
                      />
                    </div>
                  )}
                </div>

                {/* 缩略图上传 */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    上传图片（可选，最多10张，支持 JPG, PNG, GIF）
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleFileChange(e, 'images')}
                      className="hidden"
                      id="images-upload"
                    />
                    <label
                      htmlFor="images-upload"
                      className="input-field cursor-pointer flex items-center justify-center gap-2 hover:bg-white/20 transition-all"
                    >
                      {files.images.length > 0 ? (
                        <>
                          <span>🖼️</span>
                          <span className="truncate">已选择 {files.images.length} 张图片</span>
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
                  {previews.images.length > 0 && (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {previews.images.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview}
                            alt={`预览 ${index + 1}`}
                            className="w-full h-24 object-cover rounded-xl"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newFiles = files.images.filter((_, i) => i !== index);
                              const newPreviews = previews.images.filter((_, i) => i !== index);
                              setFiles({ ...files, images: newFiles });
                              setPreviews({ ...previews, images: newPreviews });
                            }}
                            className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">标签</label>
            <input type="text" value={formData.tags}
              onChange={e => setFormData({ ...formData, tags: e.target.value })}
              placeholder="用逗号分隔，如：旅行, 美食, Vlog" className="input-field" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              隐私设置
            </label>
            <select
              value={formData.privacy}
              onChange={(e) => setFormData({ ...formData, privacy: e.target.value })}
              className="input-field"
            >
              <option value="public">🌍 公开 - 所有人可见</option>
              <option value="friends">👥 好友可见</option>
              <option value="followers">👁 关注可见</option>
              <option value="private">🔒 仅自己可见</option>
            </select>
          </div>

          {/* 上传进度 */}
          {loading && uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-400">
                <span>上传中...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-white h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? '发布中...' : '发布'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateVlog;
