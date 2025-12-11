import React, { useState, useEffect, useRef } from 'react';

const CurvedCarousel = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalImage, setModalImage] = useState('');
  const autoPlayRef = useRef(null);

  // 自动轮播
  useEffect(() => {
    if (!isHovered && images.length > 1) {
      autoPlayRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }, 3000); // 3秒切换一次，可以调整为更慢，如 4000 或 5000
    }

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [isHovered, images.length]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const handleImageClick = (image) => {
    setModalImage(image);
    setShowModal(true);
  };

  const handleDotClick = (index) => {
    setCurrentIndex(index);
  };

  if (!images || images.length === 0) {
    return null;
  }

  return (
      <>
        {/* 轮播容器 */}
        <div
            className="relative w-full max-w-md mx-auto"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
          {/* 正方形图片容器 */}
          <div className="relative w-full aspect-square overflow-hidden rounded-2xl bg-black/20">
            {/* 图片 */}
            <img
                src={images[currentIndex]}
                alt={`图片 ${currentIndex + 1}`}
                className="w-full h-full object-cover cursor-pointer transition-transform duration-500 hover:scale-105"
                onClick={() => handleImageClick(images[currentIndex])}
            />

            {/* 渐变遮罩（增强视觉效果） */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />

            {/* 左右切换按钮 */}
            {images.length > 1 && (
                <>
                  <button
                      onClick={handlePrevious}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-all duration-300 backdrop-blur-sm opacity-0 group-hover:opacity-100"
                      style={{ opacity: isHovered ? 1 : 0 }}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <button
                      onClick={handleNext}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-all duration-300 backdrop-blur-sm opacity-0 group-hover:opacity-100"
                      style={{ opacity: isHovered ? 1 : 0 }}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
            )}

            {/* 图片计数 */}
            {images.length > 1 && (
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium">
                  {currentIndex + 1} / {images.length}
                </div>
            )}

            {/* 暂停提示 */}
            {isHovered && images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-full text-xs flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                  已暂停自动播放
                </div>
            )}
          </div>

          {/* 指示点 */}
          {images.length > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                {images.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => handleDotClick(index)}
                        className={`transition-all duration-300 rounded-full ${
                            index === currentIndex
                                ? 'w-8 h-2 bg-white'
                                : 'w-2 h-2 bg-white/40 hover:bg-white/60'
                        }`}
                    />
                ))}
              </div>
          )}
        </div>

        {/* 查看原图模态框 */}
        {showModal && (
            <div
                className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4"
                onClick={() => setShowModal(false)}
            >
              <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
                {/* 关闭按钮 */}
                <button
                    onClick={() => setShowModal(false)}
                    className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-all duration-300 backdrop-blur-sm z-10"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* 原图 */}
                <img
                    src={modalImage}
                    alt="原图"
                    className="max-w-full max-h-full object-contain rounded-2xl"
                    onClick={(e) => e.stopPropagation()}
                />

                {/* 下载按钮 */}
                <a
                    href={modalImage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-all duration-300 backdrop-blur-sm"
                    onClick={(e) => e.stopPropagation()}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </a>

                {/* 图片导航 */}
                {images.length > 1 && (
                    <>
                      <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newIndex = (currentIndex - 1 + images.length) % images.length;
                            setCurrentIndex(newIndex);
                            setModalImage(images[newIndex]);
                          }}
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-all duration-300 backdrop-blur-sm"
                      >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>

                      <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newIndex = (currentIndex + 1) % images.length;
                            setCurrentIndex(newIndex);
                            setModalImage(images[newIndex]);
                          }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-all duration-300 backdrop-blur-sm"
                      >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      {/* 模态框中的图片计数 */}
                      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium">
                        {currentIndex + 1} / {images.length}
                      </div>
                    </>
                )}
              </div>
            </div>
        )}
      </>
  );
};

export default CurvedCarousel;