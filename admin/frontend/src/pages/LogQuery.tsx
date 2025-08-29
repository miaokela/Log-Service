import React, { useState, useEffect, useCallback } from 'react';
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
  Tag,
  Divider,
  Tooltip,
  Collapse
} from 'antd';
import { SearchOutlined, ReloadOutlined, PlusOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { Panel } = Collapse;

interface MetadataFilter {
  key: string;
  value: string;
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

interface QueryParams {
  service_name?: string;
  level?: string;
  message?: string;
  trace_id?: string;
  start_time?: string;
  end_time?: string;
  metadata_filters?: Record<string, string>;
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
  const [metadataFilters, setMetadataFilters] = useState<MetadataFilter[]>([{ key: '', value: '' }]);

  const handleSearch = useCallback(async (values?: any) => {
    try {
      setLoading(true);
      const params: any = {
        limit: pageSize,
        offset: (current - 1) * pageSize,
        ...values
      };

      // 处理时间范围
      if (values?.dateRange) {
        params.start_time = values.dateRange[0].toISOString();
        params.end_time = values.dateRange[1].toISOString();
      }

      // 处理metadata过滤器
      const validMetadataFilters = metadataFilters.filter(filter => filter.key && filter.value);
      validMetadataFilters.forEach(filter => {
        params[`metadata_filters[${filter.key}]`] = filter.value;
      });

      const response = await axios.get('/api/logs', { params });
      setLogs(response.data.logs || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('查询失败:', error);
      message.error('查询失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [pageSize, current, metadataFilters]);

  useEffect(() => {
    handleSearch();
  }, [handleSearch]);

  const handleReset = () => {
    form.resetFields();
    setMetadataFilters([{ key: '', value: '' }]);
    setCurrent(1);
    handleSearch();
  };

  const handleTableChange = (pagination: any) => {
    setCurrent(pagination.current);
    setPageSize(pagination.pageSize);
  };

  const addMetadataFilter = () => {
    setMetadataFilters([...metadataFilters, { key: '', value: '' }]);
  };

  const removeMetadataFilter = (index: number) => {
    const newFilters = metadataFilters.filter((_, i) => i !== index);
    setMetadataFilters(newFilters);
  };

  const updateMetadataFilter = (index: number, field: 'key' | 'value', value: string) => {
    const newFilters = [...metadataFilters];
    newFilters[index][field] = value;
    setMetadataFilters(newFilters);
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
      width: 160,
      sorter: true,
      fixed: 'left' as const,
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      render: (level: string) => (
        <Tag color={getLevelColor(level)}>{level}</Tag>
      ),
      width: 70,
      filters: [
        { text: 'DEBUG', value: 'DEBUG' },
        { text: 'INFO', value: 'INFO' },
        { text: 'WARN', value: 'WARN' },
        { text: 'ERROR', value: 'ERROR' },
        { text: 'FATAL', value: 'FATAL' },
      ],
    },
    {
      title: '服务',
      dataIndex: 'service_name',
      key: 'service_name',
      width: 120,
      ellipsis: {
        showTitle: false,
      },
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message',
      ellipsis: {
        showTitle: false,
      },
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Metadata',
      dataIndex: 'metadata',
      key: 'metadata',
      width: 200,
      render: (metadata: Record<string, string>) => {
        if (!metadata || Object.keys(metadata).length === 0) {
          return <span style={{ color: '#666' }}>-</span>;
        }
        return (
          <div style={{ maxHeight: '80px', overflow: 'auto' }}>
            {Object.entries(metadata).map(([key, value]) => (
              <div key={key} style={{ marginBottom: '2px' }}>
                <Tag 
                  color="blue" 
                  style={{ 
                    fontSize: '11px', 
                    padding: '1px 4px',
                    marginBottom: '2px',
                    display: 'inline-block',
                    maxWidth: '180px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={`${key}: ${value}`}
                >
                  {key}: {value}
                </Tag>
              </div>
            ))}
          </div>
        );
      },
    },
    {
      title: 'Trace ID',
      dataIndex: 'trace_id',
      key: 'trace_id',
      width: 100,
      render: (text: string) => text ? (
        <Tooltip title={text}>
          <code style={{ 
            background: 'rgba(0, 217, 255, 0.1)',
            padding: '2px 4px',
            borderRadius: '3px',
            fontSize: '11px',
            cursor: 'pointer'
          }}>
            {text.substring(0, 8)}...
          </code>
        </Tooltip>
      ) : (
        <span style={{ color: '#666' }}>-</span>
      ),
    },
  ];

  return (
    <div className="fade-in">
      <Title level={2} className="glow-text" style={{ marginBottom: 24 }}>
        <SearchOutlined style={{ marginRight: 8 }} />
        日志查询
      </Title>

      <Card className="tech-card" style={{ marginBottom: 16 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSearch}
        >
          {/* 基础搜索条件 */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Form.Item 
                label="服务名称" 
                name="service_name"
                tooltip="按服务名称过滤日志"
              >
                <Input 
                  placeholder="输入服务名称" 
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Form.Item 
                label="日志级别" 
                name="level"
                tooltip="选择日志级别进行过滤"
              >
                <Select 
                  placeholder="选择日志级别" 
                  allowClear
                  showSearch
                >
                  <Option value="DEBUG">DEBUG</Option>
                  <Option value="INFO">INFO</Option>
                  <Option value="WARN">WARN</Option>
                  <Option value="ERROR">ERROR</Option>
                  <Option value="FATAL">FATAL</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Form.Item 
                label="消息内容" 
                name="message"
                tooltip="在日志消息中搜索关键字"
              >
                <Input 
                  placeholder="输入关键字" 
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Form.Item 
                label="Trace ID" 
                name="trace_id"
                tooltip="按Trace ID精确搜索"
              >
                <Input 
                  placeholder="输入Trace ID" 
                  allowClear
                />
              </Form.Item>
            </Col>
          </Row>

          {/* 时间范围 */}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Form.Item 
                label="时间范围" 
                name="dateRange"
                tooltip="选择日志的时间范围"
              >
                <RangePicker 
                  showTime 
                  style={{ width: '100%' }}
                  placeholder={['开始时间', '结束时间']}
                  format="YYYY-MM-DD HH:mm:ss"
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Metadata 过滤器 */}
          <Divider orientation="left">
            <span style={{ fontSize: '14px', color: '#1890ff' }}>
              <InfoCircleOutlined style={{ marginRight: 4 }} />
              Metadata 过滤器
            </span>
          </Divider>
          
          {metadataFilters.map((filter, index) => (
            <Row key={index} gutter={[8, 8]} style={{ marginBottom: 8 }}>
              <Col xs={24} sm={10} lg={8}>
                <Input
                  placeholder="字段名 (如: user_id)"
                  value={filter.key}
                  onChange={(e) => updateMetadataFilter(index, 'key', e.target.value)}
                  style={{ width: '100%' }}
                />
              </Col>
              <Col xs={24} sm={10} lg={8}>
                <Input
                  placeholder="字段值 (如: 12345)"
                  value={filter.value}
                  onChange={(e) => updateMetadataFilter(index, 'value', e.target.value)}
                  style={{ width: '100%' }}
                />
              </Col>
              <Col xs={24} sm={4} lg={8}>
                <Space>
                  {metadataFilters.length > 1 && (
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => removeMetadataFilter(index)}
                      title="删除此过滤器"
                    />
                  )}
                  {index === metadataFilters.length - 1 && (
                    <Button
                      type="dashed"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={addMetadataFilter}
                      title="添加过滤器"
                    >
                      添加
                    </Button>
                  )}
                </Space>
              </Col>
            </Row>
          ))}

          {/* 操作按钮 */}
          <Row gutter={16} style={{ marginTop: 24 }}>
            <Col>
              <Space size="middle">
                <Button 
                  type="primary" 
                  icon={<SearchOutlined />}
                  htmlType="submit"
                  loading={loading}
                  size="large"
                >
                  查询日志
                </Button>
                <Button 
                  icon={<ReloadOutlined />}
                  onClick={handleReset}
                  size="large"
                >
                  重置条件
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card className="tech-card">
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography.Text type="secondary">
            共找到 {total} 条日志记录
          </Typography.Text>
        </div>
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
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
            pageSizeOptions: ['10', '20', '50', '100'],
            size: 'default',
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
          size="small"
          bordered
          rowClassName={(record, index) => 
            index % 2 === 0 ? 'table-row-light' : 'table-row-dark'
          }
        />
      </Card>
    </div>
  );
};

export default LogQuery;
