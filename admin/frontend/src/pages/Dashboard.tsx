import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Table, Typography, Spin } from 'antd';
import { 
  BugOutlined, 
  ExclamationCircleOutlined, 
  InfoCircleOutlined,
  WarningOutlined 
} from '@ant-design/icons';
import axios from 'axios';

const { Title } = Typography;

interface Stats {
  total_logs: number;
  logs_by_level: Record<string, number>;
  logs_by_service: Record<string, number>;
  recent_24h: number;
}

interface LogEntry {
  id: string;
  service_name: string;
  level: string;
  message: string;
  timestamp: string;
  metadata: Record<string, string>;
  trace_id: string;
  span_id: string;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, logsRes] = await Promise.all([
        axios.get('/api/stats/'),
        axios.get('/api/logs/?limit=10')
      ]);
      
      setStats(statsRes.data);
      setRecentLogs(logsRes.data.logs || []);
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR':
      case 'FATAL':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'WARN':
        return <WarningOutlined style={{ color: '#faad14' }} />;
      case 'INFO':
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
      default:
        return <BugOutlined style={{ color: '#52c41a' }} />;
    }
  };

  const columns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
      width: 180,
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      render: (level: string) => (
        <span>
          {getLevelIcon(level)} {level}
        </span>
      ),
      width: 100,
    },
    {
      title: '服务',
      dataIndex: 'service_name',
      key: 'service_name',
      width: 120,
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <Title level={2} className="glow-text" style={{ marginBottom: 24 }}>
        仪表盘
      </Title>
      
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <div className="stat-card pulse">
            <div className="stat-number">{stats?.total_logs || 0}</div>
            <div className="stat-label">总日志数</div>
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div className="stat-card">
            <div className="stat-number">{stats?.recent_24h || 0}</div>
            <div className="stat-label">24小时内</div>
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div className="stat-card">
            <div className="stat-number">{stats?.logs_by_level?.ERROR || 0}</div>
            <div className="stat-label">错误日志</div>
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div className="stat-card">
            <div className="stat-number">
              {Object.keys(stats?.logs_by_service || {}).length}
            </div>
            <div className="stat-label">活跃服务</div>
          </div>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card 
            title="最近日志" 
            className="tech-card"
            extra={
              <a onClick={fetchDashboardData} style={{ color: '#00d9ff' }}>
                刷新
              </a>
            }
          >
            <Table
              columns={columns}
              dataSource={recentLogs}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={{ x: 600 }}
            />
          </Card>
        </Col>
        
        <Col xs={24} lg={8}>
          <Card title="日志级别分布" className="tech-card">
            <div style={{ padding: '16px 0' }}>
              {Object.entries(stats?.logs_by_level || {}).map(([level, count]) => (
                <div key={level} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  marginBottom: 12,
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 6,
                  border: '1px solid rgba(0, 217, 255, 0.1)'
                }}>
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    {getLevelIcon(level)}
                    <span style={{ marginLeft: 8 }}>{level}</span>
                  </span>
                  <span className="glow-text">{count}</span>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
