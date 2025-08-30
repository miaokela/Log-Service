import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const { Title } = Typography;

interface LoginForm {
  username: string;
  password: string;
}

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values: LoginForm) => {
    setLoading(true);
    try {
      const response = await axios.post('/auth/login', values);
      
      if (response.data.token) {
        // 保存token到localStorage
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('username', response.data.username);
        
        // 设置axios默认header
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        
        message.success(`欢迎回来，${response.data.username}！`);
        
        // 跳转到Dashboard
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      message.error(error.response?.data?.error || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 50%, #16213e 100%)',
      padding: '20px'
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0, 217, 255, 0.3)',
          borderRadius: 16,
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
        }}
        bordered={false}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title 
            level={2} 
            style={{ 
              color: '#00d9ff', 
              textShadow: '0 0 10px rgba(0, 217, 255, 0.5)',
              marginBottom: 8
            }}
          >
            <LoginOutlined style={{ marginRight: 8 }} />
            管理后台登录
          </Title>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            日志管理系统
          </p>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
        >
          <Form.Item
            label={<span style={{ color: 'rgba(255, 255, 255, 0.85)' }}>用户名</span>}
            name="username"
            rules={[{ required: true, message: '请输入用户名!' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: 'rgba(0, 217, 255, 0.6)' }} />}
              placeholder="请输入用户名"
              size="large"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                borderRadius: 8,
                color: 'rgba(255, 255, 255, 0.85)'
              }}
            />
          </Form.Item>

          <Form.Item
            label={<span style={{ color: 'rgba(255, 255, 255, 0.85)' }}>密码</span>}
            name="password"
            rules={[{ required: true, message: '请输入密码!' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: 'rgba(0, 217, 255, 0.6)' }} />}
              placeholder="请输入密码"
              size="large"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                borderRadius: 8,
                color: 'rgba(255, 255, 255, 0.85)'
              }}
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 32 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              block
              style={{
                background: 'linear-gradient(45deg, #00d9ff, #0099cc)',
                border: 'none',
                borderRadius: 8,
                height: 48,
                fontSize: 16,
                fontWeight: 'bold',
                boxShadow: '0 4px 15px 0 rgba(0, 217, 255, 0.3)'
              }}
            >
              {loading ? '登录中...' : '登录'}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
