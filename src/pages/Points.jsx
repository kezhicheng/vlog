import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';

const Points = () => {
  const { user } = useAuth();
  const [myPoints, setMyPoints] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [dailyMsg, setDailyMsg] = useState('');
  const [tipModal, setTipModal] = useState(null);
  const [tipAmount, setTipAmount] = useState(10);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    Promise.all([
      axios.get('/api/points/' + user.id).then(r => setMyPoints(r.data)).catch(() => {}),
      axios.get('/api/points/leaderboard').then(r => setLeaderboard(r.data)).catch(() => {})
    ]).finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="min-h-screen"><Navbar /><div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div></div></div>;
  if (!user) return <div className="min-h-screen"><Navbar /><div className="flex items-center justify-center py-20 text-gray-400">请先登录</div></div>;

  const handleDaily = async () => {
    try {
      const r = await axios.post('/api/points/daily');
      setDailyMsg(r.data.message);
      axios.get('/api/points/' + user.id).then(r2 => setMyPoints(r2.data));
    } catch {}
  };

  const handleTip = async () => {
    if (!tipModal) return;
    try {
      await axios.post('/api/points/tip', { toUserId: tipModal.id, amount: tipAmount, contentId: 0, contentType: 'user' });
      alert('打赏成功！');
      setTipModal(null);
      axios.get('/api/points/' + user.id).then(r => setMyPoints(r.data));
    } catch (e) { alert(e.response?.data?.message || '打赏失败'); }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold gradient-text mb-6">💰 积分中心</h1>

        {/* 我的积分 */}
        <div className="card mb-6 text-center">
          <div className="text-6xl mb-2">💰</div>
          <div className="text-4xl font-bold gradient-text">{myPoints?.points || 0}</div>
          <p className="text-gray-400 mt-1">我的积分</p>
          <button onClick={handleDaily} className="btn-primary mt-4">{dailyMsg || '📅 每日签到 +5'}</button>
          <p className="text-xs text-gray-500 mt-2">被点赞 +1 · 被评论 +2 · 每日签到 +5</p>
        </div>

        {/* 积分记录 */}
        {myPoints?.logs?.length > 0 && (
          <div className="card mb-6">
            <h3 className="font-bold mb-3">积分记录</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {myPoints.logs.slice(0, 20).map(l => (
                <div key={l.id} className="flex justify-between text-sm py-1 border-b border-white/5">
                  <span>
                    <span className={l.amount > 0 ? 'text-green-400' : 'text-red-400'}>
                      {l.amount > 0 ? '+' + l.amount : l.amount}
                    </span>
                    {' '}{l.reason}
                    {l.fromUser && <span className="text-gray-500 text-xs ml-1">from {l.fromUser.username}</span>}
                  </span>
                  <span className="text-xs text-gray-500">{new Date(l.createdAt).toLocaleDateString('zh-CN')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 积分榜 */}
        <div className="card">
          <h3 className="font-bold mb-4">🏆 积分排行榜</h3>
          {leaderboard.map((u, i) => (
            <div key={u.id} className="flex items-center gap-3 py-2 border-b border-white/5">
              <span className="text-lg font-bold w-8">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}</span>
              <Link to={'/profile/' + u.id}><img src={u.avatar} className="w-10 h-10 rounded-full" /></Link>
              <div className="flex-1">
                <Link to={'/profile/' + u.id} className="font-semibold hover:underline">{u.username}</Link>
                <span className="text-yellow-400 ml-2">💰{u.points}</span>
              </div>
              {u.id !== user?.id && (
                <button onClick={() => { setTipModal(u); setTipAmount(10); }}
                  className="px-3 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded-xl hover:bg-yellow-500/30">打赏</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 打赏弹窗 */}
      {tipModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setTipModal(null)}>
          <div className="card max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-2">打赏给 {tipModal.username}</h3>
            <div className="flex gap-2 mb-4">
              {[5, 10, 20, 50, 100].map(n => (
                <button key={n} onClick={() => setTipAmount(n)}
                  className={`px-3 py-1 rounded-lg text-sm ${tipAmount === n ? 'bg-yellow-500/30 text-yellow-400' : 'bg-white/10 text-gray-400'}`}>{n}</button>
              ))}
            </div>
            <input type="number" value={tipAmount} onChange={e => setTipAmount(Number(e.target.value))} className="input-field mb-4" min={1} />
            <button onClick={handleTip} className="btn-primary w-full">打赏 {tipAmount} 积分</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Points;
