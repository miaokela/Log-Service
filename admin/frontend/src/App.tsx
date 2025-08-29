import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from 'antd';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import LogQuery from './pages/LogQuery';
import LogCreate from './pages/LogCreate';
import IndexManagement from './pages/IndexManagement';
import './App.css';

const { Content } = Layout;

const App: React.FC = () => {
  return (
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
  );
};

export default App;
