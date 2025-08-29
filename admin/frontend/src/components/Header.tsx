import React from 'react';
import { Layout, Typography, Space, Button } from 'antd';
import { ReloadOutlined, SettingOutlined } from '@ant-design/icons';

const { Header: AntHeader } = Layout;
const { Title } = Typography;

const Header: React.FC = () => {
  const handleRefresh = () => {
    window.location.reload();
  };

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
      </Space>
    </AntHeader>
  );
};

export default Header;
