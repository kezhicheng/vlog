import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const EditProfile = ({ isOpen, onClose, onSuccess }) => {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    bio: user?.bio || '',
    phone: user?.phone || '',
    oldPassword: '',
    newPassword: '',
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
  const [loading, setLoading] = useState(false);

  // 当 user 变化时更新预览（比如外部更新了头像）
  React.useEffect(() => {
    if (user?.avatar) setAvatarPreview(user.avatar);
  }, [user?.avatar]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let newAvatar = user?.avatar;

      // 上传头像（不设置 Content-Type，让 axios 自动处理 boundary）
      if (avatarFile) {
        const avatarFormData = new FormData();
        avatarFormData.append('avatar', avatarFile);
        const avatarRes = await axios.post(`/api/users/${user.id}/avatar`, avatarFormData);
        newAvatar = avatarRes.data.avatar;
      }

      // 更新用户名和签名
      const payload = { username: formData.username, bio: formData.bio };
      if (formData.phone && formData.phone !== user.phone) payload.phone = formData.phone;
      if (formData.newPassword) { payload.oldPassword = formData.oldPassword; payload.newPassword = formData.newPassword; }
      const response = await axios.patch(`/api/users/${user.id}`, payload);

      // 合并更新到本地状态
      const updatedUser = {
        ...user,
        ...response.data,
        avatar: newAvatar || response.data.avatar || user.avatar
      };
      updateUser(updatedUser);

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('更新失败:', error);
      alert(error.response?.data?.message || '更新失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold gradient-text">编辑个人资料</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 头像上传 — 点击直接触发文件选择 */}
          <div className="flex flex-col items-center">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer relative group"
            >
              <img
                src={avatarPreview}
                alt="头像"
                className="w-32 h-32 rounded-full border-4 border-white/30 shadow-lg shadow-white/10 object-cover group-hover:brightness-75 transition-all"
              />
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <p className="text-sm text-gray-400 mt-2">点击头像更换</p>
          </div>

          {/* 用户名 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">用户名</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="input-field"
              placeholder="输入用户名"
              required
            />
          </div>

          {/* 个性签名 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">个性签名</label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="input-field min-h-[60px] resize-none"
              placeholder="介绍一下你自己..."
            />
          </div>

          {/* 手机号 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">手机号</label>
            <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
              className="input-field" placeholder="输入手机号" />
          </div>

          {/* 修改密码 */}
          <div className="border-t border-white/10 pt-4">
            <p className="text-xs text-gray-500 mb-3">修改密码（不填则不修改）</p>
            <div className="space-y-3">
              <input type="password" value={formData.oldPassword} onChange={e => setFormData({...formData, oldPassword: e.target.value})}
                className="input-field" placeholder="当前密码" />
              <input type="password" value={formData.newPassword} onChange={e => setFormData({...formData, newPassword: e.target.value})}
                className="input-field" placeholder="新密码（至少6位）" />
            </div>
          </div>

          {/* 按钮 */}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={loading}>
              取消
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;
