import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from 'antd';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import LogQuery from './pages/LogQuery';
import LogCreate from './pages/LogCreate';
import IndexManagement from './pages/IndexManagement';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { setupAxiosInterceptors, AuthService } from './utils/auth';
import './App.css';

const { Content } = Layout;

const App: React.FC = () => {
  useEffect(() => {
    // 初始化axios拦截器
    setupAxiosInterceptors();
    
    // 如果有token，设置到axios header
    AuthService.setAuthHeader();
  }, []);

  return (
    <Routes>
      {/* 公开路由 - 登录页 */}
      <Route path="/login" element={<Login />} />
      
      {/* 受保护的路由 */}
      <Route path="/*" element={
        <ProtectedRoute>
          <Layout style={{ minHeight: '100vh' }}>
            <Sidebar />
            <Layout>
              <Header />
              <Content style={{ 
                margin: '16px',
                padding: '24px',
                background: 'transparent'
              }}>
                <div className="fade-in">
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/query" element={<LogQuery />} />
                    <Route path="/create" element={<LogCreate />} />
                    <Route path="/indexes" element={<IndexManagement />} />
                  </Routes>
                </div>
              </Content>
            </Layout>
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  );
};

export default App;
