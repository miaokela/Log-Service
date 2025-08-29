import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Select, 
  Button, 
  Table, 
  DatePicker, 
  Space,
  Row,
  Col,
  Typography,
  message,
  Tag
} from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

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

interface QueryParams {
  service_name?: string;
  level?: string;
  message?: string;
  trace_id?: string;
  start_time?: string;
  end_time?: string;
  limit: number;
  offset: number;
}

const LogQuery: React.FC = () => {
  const [form] = Form.useForm();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    handleSearch();
  }, [current, pageSize]);

  const handleSearch = async (values?: any) => {
    try {
      setLoading(true);
      const params: QueryParams = {
        limit: pageSize,
        offset: (current - 1) * pageSize,
        ...values
      };

      // 处理时间范围
      if (values?.dateRange) {
        params.start_time = values.dateRange[0].toISOString();
        params.end_time = values.dateRange[1].toISOString();
      }

      const response = await axios.get('/api/logs', { params });
      setLogs(response.data.logs || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('查询失败:', error);
      message.error('查询失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
    setCurrent(1);
    handleSearch();
  };

  const handleTableChange = (pagination: any) => {
    setCurrent(pagination.current);
    setPageSize(pagination.pageSize);
  };

  const getLevelColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR':
      case 'FATAL':
        return 'red';
      case 'WARN':
        return 'orange';
      case 'INFO':
        return 'blue';
      case 'DEBUG':
        return 'green';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
      width: 180,
      sorter: true,
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      render: (level: string) => (
        <Tag color={getLevelColor(level)}>{level}</Tag>
      ),
      width: 80,
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
      ellipsis: {
        showTitle: false,
      },
      render: (text: string) => (
        <span title={text}>{text}</span>
      ),
    },
    {
      title: 'Trace ID',
      dataIndex: 'trace_id',
      key: 'trace_id',
      width: 120,
      render: (text: string) => text ? (
        <code style={{ 
          background: 'rgba(0, 217, 255, 0.1)',
          padding: '2px 4px',
          borderRadius: '3px',
          fontSize: '12px'
        }}>
          {text.substring(0, 8)}...
        </code>
      ) : '-',
    },
  ];

  return (
    <div className="fade-in">
      <Title level={2} className="glow-text" style={{ marginBottom: 24 }}>
        日志查询
      </Title>

      <Card className="tech-card" style={{ marginBottom: 16 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSearch}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="服务名称" name="service_name">
                <Input placeholder="输入服务名称" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="日志级别" name="level">
                <Select placeholder="选择日志级别" allowClear>
                  <Option value="DEBUG">DEBUG</Option>
                  <Option value="INFO">INFO</Option>
                  <Option value="WARN">WARN</Option>
                  <Option value="ERROR">ERROR</Option>
                  <Option value="FATAL">FATAL</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="消息内容" name="message">
                <Input placeholder="输入关键字" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Trace ID" name="trace_id">
                <Input placeholder="输入Trace ID" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="时间范围" name="dateRange">
                <RangePicker 
                  showTime 
                  style={{ width: '100%' }}
                  placeholder={['开始时间', '结束时间']}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label=" " style={{ marginTop: 30 }}>
                <Space>
                  <Button 
                    type="primary" 
                    icon={<SearchOutlined />}
                    htmlType="submit"
                    loading={loading}
                  >
                    查询
                  </Button>
                  <Button 
                    icon={<ReloadOutlined />}
                    onClick={handleReset}
                  >
                    重置
                  </Button>
                </Space>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card className="tech-card">
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          pagination={{
            current,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          onChange={handleTableChange}
          scroll={{ x: 800 }}
          size="small"
        />
      </Card>
    </div>
  );
};

export default LogQuery;
