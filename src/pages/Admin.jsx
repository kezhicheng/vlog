import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';

const ReviewPanel = () => {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    try { const r = await axios.get('/api/admin/review'); setItems(r.data); }
    catch {} finally { setLoading(false); }
  };

  const handleReview = async (type, id, action) => {
    try { await axios.post(`/api/admin/review/${type}/${id}`, { action }); fetchItems(); }
    catch { alert('操作失败'); }
  };

  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter);

  if (loading) return <div className="text-center py-10 text-gray-400">加载中...</div>;

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {[{k:'all',l:'全部'},{k:'normal',l:'✅ 正常'},{k:'violation',l:'🚫 违规'},{k:'pin',l:'📌 置顶'}].map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)}
            className={`px-3 py-1.5 rounded-xl text-sm transition ${filter===f.k?'bg-white/20 text-white':'glass-effect text-gray-400'}`}>{f.l}</button>
        ))}
        <button onClick={fetchItems} className="px-3 py-1.5 rounded-xl text-sm glass-effect text-gray-400">🔄 刷新</button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-white/10 text-left text-gray-400">
            <th className="py-2 px-2">类型</th><th className="py-2 px-2">作者</th><th className="py-2 px-2">标题</th><th className="py-2 px-2">状态</th><th className="py-2 px-2">时间</th><th className="py-2 px-2">操作</th>
          </tr></thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.type+'-'+item.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="py-2 px-2">{item.type==='vlog'?'🎬':'🔥'}</td>
                <td className="py-2 px-2 text-xs">{item.author?.username}</td>
                <td className="py-2 px-2 max-w-[200px] truncate">{item.title}</td>
                <td className="py-2 px-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${item.status==='normal'?'bg-green-500/20 text-green-400':item.status==='violation'?'bg-red-500/20 text-red-400':'bg-yellow-500/20 text-yellow-400'}`}>
                    {item.status==='normal'?'正常':item.status==='violation'?'违规':'置顶'}
                  </span>
                </td>
                <td className="py-2 px-2 text-xs text-gray-500">{new Date(item.createdAt).toLocaleDateString('zh-CN')}</td>
                <td className="py-2 px-2">
                  <div className="flex gap-1">
                    <button onClick={() => handleReview(item.type, item.id, 'normal')} className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded">正常</button>
                    <button onClick={() => handleReview(item.type, item.id, 'violation')} className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded">违规</button>
                    <button onClick={() => handleReview(item.type, item.id, 'pin')} className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded">置顶</button>
                    <a href={item.type==='vlog'?`/vlog/${item.id}`:`/shares/${item.id}`} target="_blank" rel="noopener noreferrer" className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded">查看</a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Admin = () => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('users');
  const [selectedUser, setSelectedUser] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [search, setSearch] = useState('');
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '' });
  const [banModal, setBanModal] = useState(null);

  useEffect(() => {
    if (user?.role !== 'admin') { setLoading(false); return; }
    fetchOnlineUsers();
    fetchSettings();
  }, [user]);

  const fetchOnlineUsers = async () => {
    try {
      const res = await axios.get('/api/admin/users/online-status');
      setOnlineUsers(res.data);
    } catch {
      try {
        const res2 = await axios.get('/api/admin/users');
        setOnlineUsers(res2.data.map(u => ({ ...u, isOnline: false, onlineDuration: '未知', lastActiveAt: null, loginCount: 0 })));
      } catch {}
    } finally { setLoading(false); }
  };

  const fetchSettings = async () => {
    try { const res = await axios.get('/api/settings'); setSettings(res.data); } catch {}
  };

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return onlineUsers;
    const q = search.toLowerCase().trim();
    return onlineUsers.filter(u => String(u.id).includes(q) || (u.username||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q));
  }, [onlineUsers, search]);

  const handleDeleteUser = async (userId) => {
    if (!confirm('确定删除？')) return;
    try { await axios.delete('/api/admin/users/'+userId); fetchOnlineUsers(); } catch { alert('删除失败'); }
  };

  const handleResetPassword = async (userId) => {
    const p = prompt('新密码(6位+)：');
    if (!p || p.length < 6) return;
    try { await axios.patch('/api/admin/users/'+userId+'/reset-password',{newPassword:p}); alert('已重置'); } catch { alert('失败'); }
  };

  const handleRoleToggle = async (userId, role) => {
    try { await axios.patch('/api/admin/users/'+userId+'/role',{role:role==='admin'?'user':'admin'}); fetchOnlineUsers(); } catch { alert('失败'); }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.username||!newUser.email||!newUser.password||newUser.password.length<6) { alert('请完整填写'); return; }
    try { await axios.post('/api/admin/users',{username:newUser.username.trim(),email:newUser.email.trim(),password:newUser.password}); alert('创建成功'); setNewUser({username:'',email:'',password:''}); fetchOnlineUsers(); }
    catch(e) { alert(e.response?.data?.message||'创建失败'); }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    if (!editUser) return;
    const payload = { username:editUser.username, email:editUser.email, bio:editUser.bio||'', location:editUser.location||'', role:editUser.role };
    if (editUser.password && editUser.password.length>=6) payload.password = editUser.password;
    try { await axios.patch('/api/admin/users/'+editUser.id, payload); alert('已更新'); setEditUser(null); setTab('users'); fetchOnlineUsers(); }
    catch(e) { alert(e.response?.data?.message||'更新失败'); }
  };

  const handleToggleRegistration = async () => {
    const cur = settings.registration_enabled !== 'false';
    const val = cur ? 'false' : 'true';
    try { await axios.patch('/api/admin/settings',{key:'registration_enabled',value:val}); setSettings(p=>({...p,registration_enabled:val})); alert(val==='true'?'已开启':'已关闭'); }
    catch { alert('设置失败'); }
  };

  const handleBanUser = (u) => {
    if (u.banned) {
      if (!confirm('确定解封？')) return;
      axios.post('/api/admin/users/'+u.id+'/unban').then(()=>{alert('已解封 '+u.username);fetchOnlineUsers();});
    } else { setBanModal({ user: u }); }
  };

  const handleConfirmBan = async (dur) => {
    if (!banModal) return;
    const labels = { '3d':'3天','7d':'7天','30d':'30天','365d':'1年','1095d':'3年','forever':'永久' };
    await axios.post('/api/admin/users/'+banModal.user.id+'/ban',{duration:dur,reason:''});
    alert(`已封禁 ${banModal.user.username}，时长：${labels[dur]||dur}`);
    setBanModal(null);
    fetchOnlineUsers();
  };

  const openEditUser = (u) => {
    setEditUser({ id:u.id, username:u.username||'', email:u.email||'', bio:u.bio||'', location:u.location||'', role:u.role||'user', password:'' });
    setTab('edit');
  };

  if (user?.role !== 'admin') return <div className="min-h-screen"><Navbar /><div className="flex items-center justify-center py-20"><div className="text-center"><div className="text-6xl mb-4">🚫</div><h2 className="text-2xl font-bold text-gray-300">无权访问</h2></div></div></div>;
  if (loading) return <div className="min-h-screen"><Navbar /><div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div></div></div>;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-6">🛡 系统管理</h1>
        <div className="flex gap-2 mb-6 flex-wrap">
          {[{k:'users',l:'👥 用户列表'},{k:'review',l:'📋 作品审核'},{k:'reports',l:'🚩 举报审核'},{k:'files',l:'📁 资源文件'},{k:'create',l:'➕ 创建用户'},{k:'settings',l:'⚙ 系统设置'}].map(t => (
            <button key={t.k} onClick={()=>{setTab(t.k);setSelectedUser(null);}}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${tab===t.k?'bg-white/20 text-white':'glass-effect text-gray-400 hover:text-white'}`}>{t.l}</button>
          ))}
        </div>

        {tab === 'users' && (
          <div>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 搜索ID/用户名/邮箱..." className="input-field max-w-md mb-4" />
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-white/10 text-left text-gray-400">
                  <th className="py-3 px-2">ID</th><th className="py-3 px-2">头像</th><th className="py-3 px-2">用户名</th><th className="py-3 px-2">邮箱</th><th className="py-3 px-2">状态</th><th className="py-3 px-2">角色</th><th className="py-3 px-2">时间</th><th className="py-3 px-2">操作</th>
                </tr></thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-2">{u.id}</td>
                      <td className="py-3 px-2"><img src={u.avatar} className="w-8 h-8 rounded-full" alt="" /></td>
                      <td className="py-3 px-2"><button onClick={()=>{setSelectedUser(u);setTab('detail');}} className="text-blue-400 hover:underline font-semibold">{u.username}</button></td>
                      <td className="py-3 px-2 text-gray-400 text-xs">{u.email}</td>
                      <td className="py-3 px-2"><span className={`flex items-center gap-1 text-xs ${u.isOnline?'text-green-400':'text-gray-500'}`}><span className={`w-2 h-2 rounded-full ${u.isOnline?'bg-green-400 animate-pulse':'bg-gray-500'}`}></span>{u.isOnline?'在线':'离线'}</span></td>
                      <td className="py-3 px-2"><span className={`px-2 py-0.5 rounded-full text-xs ${u.role==='admin'?'bg-purple-500/20 text-purple-400':'bg-green-500/20 text-green-400'}`}>{u.role==='admin'?'管理':'用户'}</span></td>
                      <td className="py-3 px-2 text-gray-500 text-xs">{u.createdAt}</td>
                      <td className="py-3 px-2"><div className="flex gap-1 flex-wrap">
                        <button onClick={()=>openEditUser(u)} className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded">编辑</button>
                        {u.email!=='285443286@qq.com' && <>
                          <button onClick={()=>handleRoleToggle(u.id,u.role)} className="px-2 py-1 text-xs bg-purple-500/20 text-purple-400 rounded">{u.role==='admin'?'降级':'升管'}</button>
                          <button onClick={()=>handleResetPassword(u.id)} className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded">密码</button>
                          <button onClick={()=>handleBanUser(u)} className={`px-2 py-1 text-xs rounded ${u.banned?'bg-green-500/20 text-green-400':'bg-orange-500/20 text-orange-400'}`}>{u.banned?'解封':'封号'}</button>
                          <button onClick={()=>handleDeleteUser(u.id)} className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded">删除</button>
                        </>}
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'detail' && selectedUser && (
          <div>
            <button onClick={()=>setTab('users')} className="text-gray-400 hover:text-white mb-4 flex items-center gap-1">← 返回</button>
            <div className="card flex gap-6 items-center">
              <img src={selectedUser.avatar} className="w-24 h-24 rounded-full" alt="" />
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{selectedUser.username}</h2>
                <p className="text-gray-400">{selectedUser.email}</p>
                <p className="text-sm text-gray-500">角色: {selectedUser.role==='admin'?'管理员':'用户'}</p>
                {selectedUser.bio && <p className="text-sm text-gray-400">{selectedUser.bio}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={()=>openEditUser(selectedUser)} className="btn-primary">编辑</button>
                <Link to={'/profile/'+selectedUser.id} className="btn-secondary">查看主页</Link>
              </div>
            </div>
          </div>
        )}

        {tab === 'create' && (
          <div className="card max-w-md mx-auto">
            <h3 className="text-lg font-bold mb-4">创建用户</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <input value={newUser.username} onChange={e=>setNewUser({...newUser,username:e.target.value})} placeholder="用户名" className="input-field" required />
              <input type="email" value={newUser.email} onChange={e=>setNewUser({...newUser,email:e.target.value})} placeholder="邮箱" className="input-field" required />
              <input type="password" value={newUser.password} onChange={e=>setNewUser({...newUser,password:e.target.value})} placeholder="密码(6位+)" className="input-field" required />
              <button type="submit" className="btn-primary w-full">创建</button>
            </form>
          </div>
        )}

        {tab === 'edit' && editUser && (
          <div className="card max-w-md mx-auto">
            <button onClick={()=>{setEditUser(null);setTab('users');}} className="text-gray-400 hover:text-white mb-4">← 返回</button>
            <h3 className="text-lg font-bold mb-4">编辑: {editUser.username}</h3>
            <form onSubmit={handleEditUser} className="space-y-4">
              <input value={editUser.username} onChange={e=>setEditUser({...editUser,username:e.target.value})} placeholder="用户名" className="input-field" />
              <input value={editUser.email} onChange={e=>setEditUser({...editUser,email:e.target.value})} placeholder="邮箱" className="input-field" />
              <input value={editUser.bio||''} onChange={e=>setEditUser({...editUser,bio:e.target.value})} placeholder="签名" className="input-field" />
              <input value={editUser.location||''} onChange={e=>setEditUser({...editUser,location:e.target.value})} placeholder="归属地" className="input-field" />
              <input type="password" value={editUser.password||''} onChange={e=>setEditUser({...editUser,password:e.target.value})} placeholder="新密码(留空不修改)" className="input-field" />
              <select value={editUser.role} onChange={e=>setEditUser({...editUser,role:e.target.value})} className="input-field"><option value="user">用户</option><option value="admin">管理员</option></select>
              <button type="submit" className="btn-primary w-full">保存</button>
            </form>
          </div>
        )}

        {tab === 'review' && <ReviewPanel />}
        {tab === 'reports' && <ReportsPanel />}
        {tab === 'files' && <FilesPanel />}

        {tab === 'settings' && (
          <div className="card max-w-md mx-auto">
            <h3 className="text-lg font-bold mb-4">⚙ 系统设置</h3>
            <div className="space-y-4">
              <div className="py-3 border-b border-white/10">
                <p className="font-semibold mb-2">网站名称</p>
                <div className="flex gap-2">
                  <input value={settings.site_name||'Vlog Life'} onChange={e=>setSettings(p=>({...p,site_name:e.target.value}))} className="input-field flex-1" />
                  <button onClick={async()=>{await axios.patch('/api/admin/settings',{key:'site_name',value:settings.site_name||'Vlog Life'});alert('已更新');}} className="btn-primary text-sm px-4">保存</button>
                </div>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-white/10">
                <div><p className="font-semibold">开放注册</p></div>
                <button onClick={handleToggleRegistration} className={`px-4 py-2 rounded-xl text-sm font-semibold ${settings.registration_enabled!=='false'?'bg-green-500/20 text-green-400':'bg-red-500/20 text-red-400'}`}>{settings.registration_enabled!=='false'?'🟢 已开启':'🔴 已关闭'}</button>
              </div>
              <div className="py-3 text-sm text-gray-400">
                <p>超级管理员: <span className="text-white">285443286@qq.com</span></p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 封号弹窗 */}
      {banModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={()=>setBanModal(null)}>
          <div className="card max-w-sm w-full p-6" onClick={e=>e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">封禁: {banModal.user.username}</h3>
            <p className="text-sm text-gray-400 mb-4">选择时长：</p>
            <div className="grid grid-cols-2 gap-2">
              {[{d:'3d',l:'3天'},{d:'7d',l:'7天'},{d:'30d',l:'30天'},{d:'365d',l:'1年'},{d:'1095d',l:'3年'},{d:'forever',l:'永久'}].map(o=>(
                <button key={o.d} onClick={()=>handleConfirmBan(o.d)} className="px-4 py-3 rounded-xl text-sm font-semibold bg-white/10 hover:bg-white/20 transition">{o.l}</button>
              ))}
            </div>
            <button onClick={()=>setBanModal(null)} className="btn-secondary w-full mt-4">取消</button>
          </div>
        </div>
      )}
    </div>
  );
};

const ReportsPanel = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    try { const r = await axios.get('/api/admin/reports'); setItems(r.data); } catch {}
    finally { setLoading(false); }
  };

  const handleStatus = async (r, action) => {
    // action: 'dismiss' = 不属实, 'confirm' = 属实→违规处理
    if (action === 'confirm') {
      const type = r.targetType; // 'vlog' | 'share'
      await axios.post(`/api/admin/review/${type}/${r.targetId}`, { action: 'violation' });
    }
    await axios.patch('/api/admin/reports/' + r.id, { status: action === 'confirm' ? 'resolved' : 'dismissed' });
    fetchItems();
  };

  if (loading) return <div className="text-center py-10 text-gray-400">加载中...</div>;

  return (
    <div className="card overflow-x-auto">
      <button onClick={fetchItems} className="btn-secondary mb-4 text-sm">🔄 刷新</button>
      {items.length === 0 ? <p className="text-center py-8 text-gray-500">暂无举报</p> : (
        <table className="w-full text-sm">
          <thead><tr className="border-b border-white/10 text-left text-gray-400">
            <th className="py-2 px-2">举报人</th><th className="py-2 px-2">类型</th><th className="py-2 px-2">目标ID</th><th className="py-2 px-2">原因</th><th className="py-2 px-2">状态</th><th className="py-2 px-2">时间</th><th className="py-2 px-2">操作</th>
          </tr></thead>
          <tbody>
            {items.map(r => (
              <tr key={r.id} className="border-b border-white/5">
                <td className="py-2 px-2 text-xs">{r.reporter?.username}</td>
                <td className="py-2 px-2">{r.targetType === 'vlog' ? '🎬' : '🔥'}</td>
                <td className="py-2 px-2 text-xs">{r.targetId}</td>
                <td className="py-2 px-2 text-xs max-w-[150px] truncate">{r.reason}</td>
                <td className="py-2 px-2"><span className={`text-xs px-1.5 py-0.5 rounded-full ${r.status==='pending'?'bg-yellow-500/20 text-yellow-400':'bg-green-500/20 text-green-400'}`}>{r.status==='pending'?'待处理':'已处理'}</span></td>
                <td className="py-2 px-2 text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString('zh-CN')}</td>
                <td className="py-2 px-2">
                  <div className="flex gap-1">
                    <a href={r.targetType==='vlog'?`/vlog/${r.targetId}`:`/shares/${r.targetId}`} target="_blank" rel="noopener noreferrer" className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded">查看</a>
                    {r.status === 'pending' && <>
                      <button onClick={()=>handleStatus(r,'confirm')} className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded">属实</button>
                      <button onClick={()=>handleStatus(r,'dismiss')} className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded">不属实</button>
                    </>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

const FilesPanel = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFiles = async () => {
    try { const r = await axios.get('/api/admin/files'); setFiles(r.data); } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchFiles(); }, []);

  const handleDelete = async (name) => {
    if (!confirm('确定删除 ' + name + '？可能影响引用了该文件的内容。')) return;
    await axios.delete('/api/admin/files/' + encodeURIComponent(name));
    fetchFiles();
  };

  const formatSize = (b) => b < 1024 ? b + 'B' : b < 1048576 ? (b / 1024).toFixed(1) + 'KB' : (b / 1048576).toFixed(1) + 'MB';

  if (loading) return <div className="text-center py-10 text-gray-400">加载中...</div>;

  return (
    <div className="card overflow-x-auto">
      <button onClick={fetchFiles} className="btn-secondary mb-4 text-sm">🔄 刷新</button>
      <p className="text-xs text-gray-500 mb-2">共 {files.length} 个文件</p>
      <table className="w-full text-sm">
        <thead><tr className="border-b border-white/10 text-left text-gray-400">
          <th className="py-2 px-2">文件名</th><th className="py-2 px-2">大小</th><th className="py-2 px-2">修改时间</th><th className="py-2 px-2">操作</th>
        </tr></thead>
        <tbody>
          {files.map(f => (
            <tr key={f.name} className="border-b border-white/5">
              <td className="py-2 px-2 text-xs max-w-[200px] truncate">{f.name}</td>
              <td className="py-2 px-2 text-xs text-gray-400">{formatSize(f.size)}</td>
              <td className="py-2 px-2 text-xs text-gray-500">{new Date(f.mtime).toLocaleString('zh-CN')}</td>
              <td className="py-2 px-2">
                <a href={f.url} target="_blank" className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded mr-1">预览</a>
                <button onClick={() => handleDelete(f.name)} className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded">删除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Admin;
