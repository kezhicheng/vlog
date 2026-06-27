import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const MusicPlayer = () => {
  const { user } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [musicUrl, setMusicUrl] = useState('');
  const [musicEnabled, setMusicEnabled] = useState(true);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;
    axios.get(`/api/users/${user.id}`).then(r => {
      setMusicEnabled(r.data.musicEnabled !== 0);
      if (r.data.musicUrl) setMusicUrl(r.data.musicUrl);
    }).catch(() => {});
  }, [user]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); }
    else { audioRef.current.play(); }
    setIsPlaying(!isPlaying);
  };

  // 禁用时不显示
  if (!musicEnabled) return null;

  // 用上传的音乐，没有则用默认
  const src = musicUrl || 'https://www.bensound.com/bensound-music/bensound-ukulele.mp3';

  return (
    <div className="fixed bottom-8 right-8 z-40">
      <audio ref={audioRef} src={src} loop onEnded={() => setIsPlaying(false)} />

      <div className="relative">
        <button onClick={togglePlay}
          className="glass-effect w-16 h-16 rounded-full flex items-center justify-center hover:scale-110 transition-all duration-300 shadow-lg shadow-purple-500/50 animate-float">
          {isPlaying ? (
            <svg className="w-8 h-8 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* 音符动画 */}
        {isPlaying && (
          <div className="absolute -top-8 left-0 right-0 flex justify-center gap-1 pointer-events-none">
            <span className="text-purple-400 animate-bounce" style={{ animationDelay: '0s' }}>♪</span>
            <span className="text-blue-400 animate-bounce" style={{ animationDelay: '0.2s' }}>♫</span>
            <span className="text-pink-400 animate-bounce" style={{ animationDelay: '0.4s' }}>♪</span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default MusicPlayer;
