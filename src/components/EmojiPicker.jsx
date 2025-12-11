import React, { useState } from 'react';

const emojis = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
  '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
  '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪',
  '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨',
  '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
  '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕',
  '🤢', '🤮', '🤧', '😵', '🤯', '🤠', '😎', '🤓',
  '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳',
  '😱', '😨', '😰', '😥', '😢', '😭', '😩', '😫',
  '😤', '😡', '😠', '🤬', '👍', '👎', '👏', '🙌',
  '👋', '🤝', '🙏', '💪', '❤️', '💔', '💕', '💖',
  '💗', '💙', '💚', '💛', '🧡', '💜', '🖤', '💯',
  '🔥', '✨', '💫', '⭐', '🌟', '💥', '💢', '💦',
  '💨', '👀', '💤', '😺', '😸', '😹', '😻', '😼',
  '😽', '🙀', '😿', '😾', '🐶', '🐱', '🐭', '🐹',
  '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮'
];

const EmojiPicker = ({ onSelect, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute bottom-16 right-0 glass-effect rounded-2xl p-4 shadow-2xl z-50 animate-fadeIn">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-300">选择表情</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-8 gap-2 max-h-64 overflow-y-auto">
        {emojis.map((emoji, index) => (
          <button
            key={index}
            onClick={() => {
              onSelect(emoji);
              onClose();
            }}
            className="text-2xl hover:scale-125 transition-transform p-2 rounded hover:bg-white/10"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

export default EmojiPicker;
