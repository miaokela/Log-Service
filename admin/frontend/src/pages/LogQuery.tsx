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
  Collapse,
  Popover
} from 'antd';
import { SearchOutlined, ReloadOutlined, PlusOutlined, DeleteOutlined, InfoCircleOutlined, CopyOutlined } from '@ant-design/icons';
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

  // 复制到剪贴板的函数
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success('已复制到剪贴板');
    }).catch(err => {
      console.error('复制失败:', err);
      message.error('复制失败');
    });
  };

  // 渲染metadata的Popover内容
  const renderMetadataPopover = (metadata: Record<string, string>) => {
    if (!metadata || Object.keys(metadata).length === 0) {
      return (
        <div style={{ 
          padding: '12px', 
          backgroundColor: '#1a1a1a', 
          color: '#e6e6e6',
          border: '1px solid #333',
          borderRadius: '8px'
        }}>
          暂无数据
        </div>
      );
    }

    const metadataText = JSON.stringify(metadata, null, 2);
    
    return (
      <div style={{ 
        maxWidth: '450px', 
        maxHeight: '350px', 
        overflow: 'auto',
        backgroundColor: '#1a1a1a',
        color: '#e6e6e6',
        padding: '16px',
        border: '1px solid #333',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)'
      }}>
        <div style={{ 
          marginBottom: '12px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '1px solid #333',
          paddingBottom: '8px'
        }}>
          <strong style={{ 
            color: '#00d4ff', 
            fontSize: '14px',
            textShadow: '0 0 8px rgba(0, 212, 255, 0.3)'
          }}>
            Metadata 详情
          </strong>
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => copyToClipboard(metadataText)}
            style={{ 
              color: '#00d4ff',
              background: 'rgba(0, 212, 255, 0.1)',
              border: '1px solid rgba(0, 212, 255, 0.3)',
              borderRadius: '6px'
            }}
          >
            复制全部
          </Button>
        </div>
        {Object.entries(metadata).map(([key, value]) => (
          <div key={key} style={{ 
            marginBottom: '8px', 
            padding: '12px',
            backgroundColor: '#262626',
            borderRadius: '8px',
            border: '1px solid #404040',
            position: 'relative',
            background: 'linear-gradient(135deg, #262626 0%, #1f1f1f 100%)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, marginRight: '8px' }}>
                <div style={{ 
                  fontWeight: 'bold', 
                  color: '#00d4ff', 
                  fontSize: '12px',
                  marginBottom: '4px',
                  textShadow: '0 0 4px rgba(0, 212, 255, 0.2)'
                }}>
                  {key}
                </div>
                <div style={{ 
                  wordBreak: 'break-word', 
                  fontSize: '12px',
                  maxHeight: '60px',
                  overflow: 'auto',
                  color: '#e6e6e6',
                  backgroundColor: '#1a1a1a',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  border: '1px solid #404040',
                  fontFamily: 'Monaco, "Courier New", monospace'
                }}>
                  {value}
                </div>
              </div>
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => copyToClipboard(`${key}: ${value}`)}
                style={{ 
                  flexShrink: 0, 
                  color: '#666',
                  background: 'rgba(102, 102, 102, 0.1)',
                  border: '1px solid rgba(102, 102, 102, 0.3)',
                  borderRadius: '4px'
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 表单提交处理函数
  const handleFormSubmit = (values: any) => {
    setCurrent(1); // 重置到第一页
    
    // 在表单提交时处理metadata过滤器
    const params: any = {
      limit: pageSize,
      offset: 0, // 重置到第一页，所以offset是0
      ...values
    };

    // 处理时间范围
    if (values?.dateRange) {
      params.start_time = values.dateRange[0].toISOString();
      params.end_time = values.dateRange[1].toISOString();
    }

    // 处理metadata过滤器 - 使用当前的metadataFilters状态
    const validMetadataFilters = metadataFilters.filter(filter => filter.key && filter.value);
    validMetadataFilters.forEach(filter => {
      let cleanValue = filter.value;
      // 如果值包含 "key: value" 格式，只取value部分
      if (cleanValue.includes(': ') && cleanValue.startsWith(filter.key + ': ')) {
        cleanValue = cleanValue.substring(filter.key.length + 2).trim();
      }
      params[`metadata_filters[${filter.key}]`] = cleanValue;
    });

    console.log('搜索参数:', params); // 添加调试日志
    
    // 执行搜索
    executeSearch(params);
  };

  // 执行搜索的函数
  const executeSearch = useCallback(async (params: any) => {
    try {
      setLoading(true);
      const response = await axios.get('/api/logs/', { params });
      setLogs(response.data.logs || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('查询失败:', error);
      message.error('查询失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = useCallback(async (values?: any) => {
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

    // 不在这里处理metadata过滤器，因为这个函数用于分页等其他场景
    await executeSearch(params);
  }, [pageSize, current, executeSearch]);

  // 初始加载函数
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        limit: pageSize,
        offset: (current - 1) * pageSize
      };

      const response = await axios.get('/api/logs/', { params });
      setLogs(response.data.logs || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('加载失败:', error);
      message.error('加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [pageSize, current]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleReset = () => {
    form.resetFields();
    setMetadataFilters([{ key: '', value: '' }]);
    setCurrent(1);
    // 重置时执行基本搜索，不包含任何过滤条件
    const params = {
      limit: pageSize,
      offset: 0
    };
    executeSearch(params);
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
    
    // 如果是在value字段粘贴了 "key: value" 格式的内容，自动分离
    if (field === 'value' && value.includes(': ') && !newFilters[index].key) {
      const colonIndex = value.indexOf(': ');
      const key = value.substring(0, colonIndex).trim();
      const actualValue = value.substring(colonIndex + 2).trim();
      
      newFilters[index].key = key;
      newFilters[index].value = actualValue;
    } else {
      newFilters[index][field] = value;
    }
    
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

        // 显示简化版本
        const entries = Object.entries(metadata);
        const firstEntry = entries[0];
        const hasMore = entries.length > 1;

        return (
          <Popover
            content={renderMetadataPopover(metadata)}
            title={null}
            trigger="hover"
            placement="right"
            overlayStyle={{ maxWidth: '500px' }}
          >
            <div style={{ 
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px dashed #d9d9d9',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#1890ff';
              e.currentTarget.style.background = 'rgba(57, 136, 182, 1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#d9d9d9';
              e.currentTarget.style.background = 'transparent';
            }}
            >
              <Tag 
                color="blue" 
                style={{ 
                  fontSize: '11px', 
                  padding: '1px 4px',
                  marginBottom: '2px',
                  display: 'inline-block',
                  maxWidth: '150px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {firstEntry[0]}: {firstEntry[1]}
              </Tag>
              {hasMore && (
                <div style={{ 
                  fontSize: '10px', 
                  color: '#666', 
                  marginTop: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <InfoCircleOutlined />
                  +{entries.length - 1} 更多
                </div>
              )}
            </div>
          </Popover>
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
          onFinish={handleFormSubmit}
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
