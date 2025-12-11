import React, { useState, useRef, useEffect } from 'react';

const MusicPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [showControls, setShowControls] = useState(false);
  const audioRef = useRef(null);

  // 使用免费的背景音乐URL（你可以替换为自己的音乐）
  const musicUrl = 'https://www.bensound.com/bensound-music/bensound-ukulele.mp3';

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-40">
      <audio
        ref={audioRef}
        src={musicUrl}
        loop
        onEnded={() => setIsPlaying(false)}
      />

      <div
        className="relative"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {/* 音乐控制按钮 */}
        <button
          onClick={togglePlay}
          className="glass-effect w-16 h-16 rounded-full flex items-center justify-center hover:scale-110 transition-all duration-300 shadow-lg shadow-purple-500/50 animate-float"
        >
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

        {/* 音量控制 */}
        {showControls && (
          <div className="absolute bottom-20 right-0 glass-effect rounded-2xl p-4 animate-fadeIn">
            <div className="flex flex-col items-center gap-3">
              <span className="text-xs text-gray-300">音量</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="w-24 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  writingMode: 'bt-lr',
                  WebkitAppearance: 'slider-vertical',
                }}
              />
              <span className="text-xs text-purple-400">{Math.round(volume * 100)}%</span>
            </div>
          </div>
        )}

        {/* 音符动画 */}
        {isPlaying && (
          <div className="absolute -top-8 left-0 right-0 flex justify-center gap-1">
            <span className="text-purple-400 animate-bounce" style={{ animationDelay: '0s' }}>♪</span>
            <span className="text-blue-400 animate-bounce" style={{ animationDelay: '0.2s' }}>♫</span>
            <span className="text-pink-400 animate-bounce" style={{ animationDelay: '0.4s' }}>♪</span>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(to right, #6366f1, #ec4899);
          cursor: pointer;
        }

        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(to right, #6366f1, #ec4899);
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
};

export default MusicPlayer;
