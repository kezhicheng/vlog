import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import VlogCard from '../components/VlogCard';
import { useAuth } from '../contexts/AuthContext';

const Discover = () => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personalized');

  useEffect(() => {
    fetchRecommendations();
  }, [user.id]);

  const fetchRecommendations = async () => {
    try {
      const response = await axios.get(`/api/recommendations/${user.id}`);
      setRecommendations(response.data);
    } catch (error) {
      console.error('获取推荐失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !recommendations) {
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">发现</h1>
          <p className="text-gray-400">基于你的兴趣为你推荐精彩内容</p>
        </div>

        {/* 标签切换 */}
        <div className="flex gap-4 mb-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('personalized')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 whitespace-nowrap ${
              activeTab === 'personalized'
                ? 'bg-white/90 text-black'
                : 'glass-effect text-gray-300'
            }`}
          >
            🎯 为你推荐
          </button>
          <button
            onClick={() => setActiveTab('trending')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 whitespace-nowrap ${
              activeTab === 'trending'
                ? 'bg-white/90 text-black'
                : 'glass-effect text-gray-300'
            }`}
          >
            🔥 热门内容
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-white/90 text-black'
                : 'glass-effect text-gray-300'
            }`}
          >
            👥 推荐好友
          </button>
        </div>

        {/* 个性化推荐 */}
        {activeTab === 'personalized' && (
          <div>
            {recommendations.personalizedVlogs.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🎯</div>
                <h3 className="text-2xl font-bold text-gray-300 mb-2">暂无个性化推荐</h3>
                <p className="text-gray-500 mb-6">
                  多浏览、点赞和评论，系统将为你推荐更多感兴趣的内容
                </p>
                <button
                  onClick={() => setActiveTab('trending')}
                  className="btn-primary"
                >
                  查看热门内容
                </button>
              </div>
            ) : (
              <>
                <div className="card mb-6 p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">✨</div>
                    <div>
                      <h3 className="font-semibold text-lg">智能推荐</h3>
                      <p className="text-sm text-gray-400">
                        基于你的浏览历史和兴趣，为你精心挑选了 {recommendations.personalizedVlogs.length} 个Vlog
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recommendations.personalizedVlogs.map((vlog) => (
                    <VlogCard key={vlog.id} vlog={vlog} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* 热门内容 */}
        {activeTab === 'trending' && (
          <div>
            {recommendations.trendingVlogs.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🔥</div>
                <h3 className="text-2xl font-bold text-gray-300 mb-2">暂无热门内容</h3>
                <p className="text-gray-500">快去创建第一个热门Vlog吧</p>
              </div>
            ) : (
              <>
                <div className="card mb-6 p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">🔥</div>
                    <div>
                      <h3 className="font-semibold text-lg">热门榜单</h3>
                      <p className="text-sm text-gray-400">
                        根据点赞和浏览量综合排名
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recommendations.trendingVlogs.map((vlog, index) => (
                    <div key={vlog.id} className="relative">
                      {index < 3 && (
                        <div className="absolute -top-2 -left-2 z-10">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-lg ${
                            index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white' :
                            index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white' :
                            'bg-gradient-to-br from-orange-400 to-orange-600 text-white'
                          }`}>
                            #{index + 1}
                          </div>
                        </div>
                      )}
                      <VlogCard vlog={vlog} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* 推荐好友 */}
        {activeTab === 'users' && (
          <div>
            {recommendations.suggestedUsers.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">👥</div>
                <h3 className="text-2xl font-bold text-gray-300 mb-2">暂无推荐好友</h3>
                <p className="text-gray-500">
                  多添加好友，系统将为你推荐更多可能认识的人
                </p>
              </div>
            ) : (
              <>
                <div className="card mb-6 p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">👥</div>
                    <div>
                      <h3 className="font-semibold text-lg">你可能认识的人</h3>
                      <p className="text-sm text-gray-400">
                        基于共同好友为你推荐
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recommendations.suggestedUsers.map((suggestedUser) => (
                    <div key={suggestedUser.id} className="card">
                      <div className="flex items-center justify-between">
                        <Link
                          to={`/profile/${suggestedUser.id}`}
                          className="flex items-center gap-4 flex-1 hover:opacity-80 transition-opacity"
                        >
                          <img
                            src={suggestedUser.avatar}
                            alt={suggestedUser.username}
                            className="w-16 h-16 rounded-full border-2 border-white/30"
                          />
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{suggestedUser.username}</h3>
                            <p className="text-gray-400 text-sm line-clamp-1">{suggestedUser.bio}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                              </svg>
                              <span className="text-xs text-gray-400">
                                {suggestedUser.mutualFriends} 个共同好友
                              </span>
                            </div>
                          </div>
                        </Link>

                        <Link
                          to={`/profile/${suggestedUser.id}`}
                          className="btn-primary"
                        >
                          查看
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Discover;
