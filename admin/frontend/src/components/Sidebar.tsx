import React from 'react';
import { Layout, Menu } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  SearchOutlined,
  PlusOutlined,
  BugOutlined
} from '@ant-design/icons';

const { Sider } = Layout;

const Sidebar: React.FC = () => {
  const location = useLocation();

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: <Link to="/dashboard">仪表盘</Link>,
    },
    {
      key: '/query',
      icon: <SearchOutlined />,
      label: <Link to="/query">日志查询</Link>,
    },
    {
      key: '/create',
      icon: <PlusOutlined />,
      label: <Link to="/create">创建日志</Link>,
    },
  ];

  return (
    <Sider width={200} className="tech-container">
      <div style={{ 
        padding: '16px', 
        textAlign: 'center',
        borderBottom: '1px solid rgba(0, 217, 255, 0.2)'
      }}>
        <BugOutlined style={{ 
          fontSize: '32px', 
          color: '#00d9ff',
          textShadow: '0 0 10px rgba(0, 217, 255, 0.5)'
        }} />
        <h3 className="glow-text" style={{ margin: '8px 0 0 0' }}>
          Log Admin
        </h3>
      </div>
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        style={{ border: 'none', background: 'transparent' }}
      />
    </Sider>
  );
};

export default Sidebar;
