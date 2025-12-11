import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Friends from './pages/Friends';
import Messages from './pages/Messages';
import Visitors from './pages/Visitors';
import VlogDetail from './pages/VlogDetail';
import Albums from './pages/Albums';
import Discover from './pages/Discover';
import MusicPlayer from './components/MusicPlayer';

// 受保护路由组件
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
            </div>
        );
    }
    return isAuthenticated ? children : <Navigate to="/login" />;
};

// 根据当前路径决定是否显示 MusicPlayer
const ConditionalMusicPlayer = () => {
    const location = useLocation();
    const { isAuthenticated } = useAuth();

    // 如果未登录，或者在 /login 页面，不显示播放器
    if (!isAuthenticated || location.pathname === '/login') {
        return null;
    }

    return <MusicPlayer />;
};

// 路由配置
const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <Home />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/profile/:userId"
                element={
                    <ProtectedRoute>
                        <Profile />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/friends"
                element={
                    <ProtectedRoute>
                        <Friends />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/messages"
                element={
                    <ProtectedRoute>
                        <Messages />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/visitors"
                element={
                    <ProtectedRoute>
                        <Visitors />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/vlog/:id"
                element={
                    <ProtectedRoute>
                        <VlogDetail />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/albums/:userId"
                element={
                    <ProtectedRoute>
                        <Albums />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/discover"
                element={
                    <ProtectedRoute>
                        <Discover />
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
};

// 主 App 组件
function App() {
    return (
        <AuthProvider>
            <Router>
                <AppRoutes />
                <ConditionalMusicPlayer />
            </Router>
        </AuthProvider>
    );
}

export default App;