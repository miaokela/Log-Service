import React from 'react';
import { Layout, Typography, Space, Button, Dropdown, Avatar } from 'antd';
import { ReloadOutlined, SettingOutlined, UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../utils/auth';
import type { MenuProps } from 'antd';

const { Header: AntHeader } = Layout;
const { Title } = Typography;

const Header: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = AuthService.getCurrentUser();

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleLogout = () => {
    AuthService.logout();
    navigate('/login');
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: `当前用户: ${currentUser}`,
      disabled: true,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  return (
    <AntHeader style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(0, 217, 255, 0.2)',
    }}>
      <Title level={4} style={{ 
        margin: 0, 
        color: '#00d9ff',
        textShadow: '0 0 10px rgba(0, 217, 255, 0.5)'
      }}>
        日志管理系统
      </Title>
      
      <Space>
        <Button 
          type="text" 
          icon={<ReloadOutlined />}
          onClick={handleRefresh}
          style={{ color: 'rgba(255, 255, 255, 0.7)' }}
        >
          刷新
        </Button>
        <Button 
          type="text" 
          icon={<SettingOutlined />}
          style={{ color: 'rgba(255, 255, 255, 0.7)' }}
        >
          设置
        </Button>
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <Button 
            type="text" 
            style={{ 
              color: 'rgba(255, 255, 255, 0.85)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Avatar 
              size="small" 
              icon={<UserOutlined />} 
              style={{ 
                background: 'linear-gradient(45deg, #00d9ff, #0099cc)',
                border: '1px solid rgba(0, 217, 255, 0.3)'
              }} 
            />
            {currentUser}
          </Button>
        </Dropdown>
      </Space>
    </AntHeader>
  );
};

export default Header;
