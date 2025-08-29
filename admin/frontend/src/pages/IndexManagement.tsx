import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  message,
  Modal,
  Form,
  Input,
  Popconfirm,
  Tag,
  Row,
  Col,
  Statistic,
  Alert,
  Tooltip,
  Checkbox
} from 'antd';
import {
  ReloadOutlined,
  PlusOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  DatabaseOutlined,
  FieldNumberOutlined,
  FileTextOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;

interface Index {
  name: string;
  key: { [key: string]: number };
  unique?: boolean;
  background?: boolean;
  sparse?: boolean;
  size?: number;
  version?: number;
}

interface IndexStats {
  total_indexes: number;
  total_index_size: number;
  collection_size: number;
  document_count: number;
  avg_obj_size: number;
}

const IndexManagement: React.FC = () => {
  const [indexes, setIndexes] = useState<Index[]>([]);
  const [stats, setStats] = useState<IndexStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // 加载索引列表
  const loadIndexes = async () => {
    try {
      const response = await axios.get('/api/indexes/');
      setIndexes(response.data.indexes || []);
    } catch (error) {
      console.error('Failed to load indexes:', error);
    }
  };

  // 加载统计信息
  const loadStats = async () => {
    try {
      const response = await axios.get('/api/indexes/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  // 删除索引
  const deleteIndex = async (indexName: string) => {
    try {
      await axios.delete(`/api/indexes/${indexName}`);
      message.success('索引删除成功！');
      loadIndexes();
      loadStats();
    } catch (error: any) {
      message.error('删除失败: ' + (error.response?.data?.error || error.message));
    }
  };

  // 处理表单提交
  const handleFormSubmit = async (values: any) => {
    try {
      // 解析键字段，支持 "field1:1,field2:-1" 或 JSON 格式
      let keyObj: { [key: string]: number };
      if (values.key.startsWith('{')) {
        keyObj = JSON.parse(values.key);
      } else {
        keyObj = {};
        const pairs = values.key.split(',');
        for (const pair of pairs) {
          const [field, direction] = pair.split(':');
          keyObj[field.trim()] = parseInt(direction?.trim() || '1');
        }
      }

      const data = {
        name: values.name,
        key: keyObj,
        unique: values.unique || false,
        background: values.background || false,
        sparse: values.sparse || false
      };

      await axios.post('/api/indexes/', data);
      message.success('索引创建成功！');
      setShowCreateForm(false);
      loadIndexes();
      loadStats();
    } catch (error: any) {
      message.error('创建失败: ' + (error.response?.data?.error || error.message));
    }
  };

  // 格式化文件大小
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化索引键
  const formatIndexKey = (key: { [key: string]: number }): string => {
    return Object.entries(key)
      .map(([field, direction]) => `${field}: ${direction}`)
      .join(', ');
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadIndexes(), loadStats()]);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '50px',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
        minHeight: '100vh'
      }}>
        <Card style={{
          backgroundColor: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: '12px',
          maxWidth: '400px',
          margin: '0 auto'
        }}>
          <Statistic
            title={<span style={{ color: '#00d4ff' }}>加载中...</span>}
            value=""
            prefix={<ReloadOutlined spin style={{ color: '#00d4ff' }} />}
          />
        </Card>
      </div>
    );
  }

  // 表格列定义
  const columns = [
    {
      title: '索引名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <Text strong style={{ color: name === '_id_' ? '#00d4ff' : '#e6e6e6' }}>
          {name}
        </Text>
      ),
    },
    {
      title: '索引字段',
      dataIndex: 'key',
      key: 'key',
      render: (key: { [key: string]: number }) => (
        <Tag 
          style={{ 
            fontFamily: 'Monaco, "Courier New", monospace',
            backgroundColor: '#262626',
            color: '#00d4ff',
            border: '1px solid #404040',
            borderRadius: '4px'
          }}
        >
          {formatIndexKey(key)}
        </Tag>
      ),
    },
    {
      title: '选项',
      key: 'options',
      render: (record: Index) => (
        <Space>
          {record.unique && (
            <Tag style={{ backgroundColor: '#722ed1', color: '#fff', border: 'none' }}>
              Unique
            </Tag>
          )}
          {record.sparse && (
            <Tag style={{ backgroundColor: '#fa8c16', color: '#fff', border: 'none' }}>
              Sparse
            </Tag>
          )}
          {record.background && (
            <Tag style={{ backgroundColor: '#52c41a', color: '#fff', border: 'none' }}>
              Background
            </Tag>
          )}
          {!record.unique && !record.sparse && !record.background && (
            <Text style={{ color: '#999' }}>无特殊选项</Text>
          )}
        </Space>
      ),
    },
    {
      title: '大小',
      key: 'size',
      render: (record: Index) => (
        <Text style={{ color: '#e6e6e6' }}>{record.size ? formatSize(record.size) : '-'}</Text>
      ),
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      render: (version: number) => <Text style={{ color: '#e6e6e6' }}>{version || '-'}</Text>,
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: Index) => (
        <Space>
          {record.name !== '_id_' ? (
            <Popconfirm
              title="确定要删除这个索引吗？"
              description="删除索引是不可逆的操作，请谨慎操作。"
              onConfirm={() => deleteIndex(record.name)}
              okText="确定"
              cancelText="取消"
              okType="danger"
            >
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
                style={{
                  backgroundColor: '#ff4d4f',
                  border: '1px solid #ff4d4f',
                  color: '#fff',
                  borderRadius: '4px'
                }}
              >
                删除
              </Button>
            </Popconfirm>
          ) : (
            <Tooltip title="系统默认索引，不可删除">
              <Button 
                size="small" 
                disabled 
                icon={<InfoCircleOutlined />}
                style={{
                  backgroundColor: '#404040',
                  border: '1px solid #666',
                  color: '#999',
                  borderRadius: '4px'
                }}
              >
                系统索引
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ 
      padding: '24px', 
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)', 
      minHeight: '100vh',
      color: '#e6e6e6'
    }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ 
          margin: 0, 
          display: 'flex', 
          alignItems: 'center',
          color: '#00d4ff',
          textShadow: '0 0 12px rgba(0, 212, 255, 0.3)'
        }}>
          <DatabaseOutlined style={{ marginRight: '8px', color: '#00d4ff' }} />
          索引管理
        </Title>
        <Text style={{ color: '#999', fontSize: '14px' }}>管理MongoDB数据库索引，提升查询性能</Text>
      </div>

      {/* 统计信息卡片 */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} md={6}>
            <Card style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #1a1a1a 0%, #262626 100%)'
            }}>
              <Statistic
                title={<span style={{ color: '#999' }}>索引总数</span>}
                value={stats.total_indexes}
                prefix={<BarChartOutlined style={{ color: '#00d4ff' }} />}
                valueStyle={{ color: '#00d4ff', textShadow: '0 0 8px rgba(0, 212, 255, 0.3)' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #1a1a1a 0%, #262626 100%)'
            }}>
              <Statistic
                title={<span style={{ color: '#999' }}>索引大小</span>}
                value={formatSize(stats.total_index_size)}
                prefix={<DatabaseOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a', textShadow: '0 0 8px rgba(82, 196, 26, 0.3)' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #1a1a1a 0%, #262626 100%)'
            }}>
              <Statistic
                title={<span style={{ color: '#999' }}>集合大小</span>}
                value={formatSize(stats.collection_size)}
                prefix={<FileTextOutlined style={{ color: '#fa8c16' }} />}
                valueStyle={{ color: '#fa8c16', textShadow: '0 0 8px rgba(250, 140, 22, 0.3)' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #1a1a1a 0%, #262626 100%)'
            }}>
              <Statistic
                title={<span style={{ color: '#999' }}>文档数量</span>}
                value={stats.document_count.toLocaleString()}
                prefix={<FieldNumberOutlined style={{ color: '#722ed1' }} />}
                valueStyle={{ color: '#722ed1', textShadow: '0 0 8px rgba(114, 46, 209, 0.3)' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 索引列表 */}
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <DatabaseOutlined style={{ color: '#00d4ff' }} />
              <span style={{ color: '#e6e6e6', fontWeight: 'bold' }}>索引列表</span>
              <Text style={{ color: '#999' }}>({indexes.length} 个索引)</Text>
            </Space>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  loadIndexes();
                  loadStats();
                }}
                style={{
                  backgroundColor: '#262626',
                  border: '1px solid #404040',
                  color: '#e6e6e6',
                  borderRadius: '6px'
                }}
              >
                刷新
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setShowCreateForm(true)}
                style={{
                  backgroundColor: '#00d4ff',
                  border: '1px solid #00d4ff',
                  color: '#000',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  boxShadow: '0 0 12px rgba(0, 212, 255, 0.3)'
                }}
              >
                创建索引
              </Button>
            </Space>
          </div>
        }
        style={{ 
          marginBottom: '24px',
          backgroundColor: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #1a1a1a 0%, #262626 100%)'
        }}
      >
        <Table
          columns={columns}
          dataSource={indexes}
          rowKey="name"
          pagination={false}
          loading={loading}
          size="middle"
          style={{
            backgroundColor: 'transparent'
          }}
          components={{
            header: {
              cell: (props: any) => (
                <th 
                  {...props} 
                  style={{
                    backgroundColor: '#262626',
                    color: '#00d4ff',
                    borderBottom: '1px solid #404040',
                    fontWeight: 'bold'
                  }}
                />
              )
            },
            body: {
              row: (props: any) => (
                <tr 
                  {...props} 
                  style={{
                    backgroundColor: '#1a1a1a',
                    color: '#e6e6e6',
                    borderBottom: '1px solid #333'
                  }}
                />
              ),
              cell: (props: any) => (
                <td 
                  {...props} 
                  style={{
                    backgroundColor: 'transparent',
                    color: '#e6e6e6',
                    borderBottom: '1px solid #333'
                  }}
                />
              )
            }
          }}
        />
      </Card>

      {/* 创建索引模态框 */}
      <Modal
        title={
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            color: '#00d4ff',
            fontSize: '16px',
            fontWeight: 'bold',
            textShadow: '0 0 8px rgba(0, 212, 255, 0.3)'
          }}>
            <PlusOutlined style={{ marginRight: '8px', color: '#00d4ff' }} />
            <span>创建新索引</span>
          </div>
        }
        open={showCreateForm}
        onCancel={() => setShowCreateForm(false)}
        footer={null}
        width={650}
        styles={{
          mask: { backgroundColor: 'rgba(0, 0, 0, 0.8)' },
          content: { 
            backgroundColor: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '12px',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.8)'
          },
          body: { 
            backgroundColor: '#1a1a1a', 
            color: '#e6e6e6',
            padding: '24px'
          },
          header: {
            backgroundColor: '#1a1a1a',
            borderBottom: '1px solid #333',
            borderRadius: '12px 12px 0 0'
          }
        }}
        maskClosable={false}
      >
        <div style={{ 
          backgroundColor: '#1a1a1a', 
          color: '#e6e6e6', 
          padding: '0',
          background: 'linear-gradient(135deg, #1a1a1a 0%, #262626 100%)'
        }}>
          <Alert
            message="创建索引提示"
            description="创建索引会影响数据库性能，建议在业务低峰期进行。大型集合建议勾选后台创建选项。"
            type="info"
            showIcon
            style={{ 
              marginBottom: '20px', 
              backgroundColor: 'rgba(0, 212, 255, 0.1)',
              border: '1px solid rgba(0, 212, 255, 0.3)',
              borderRadius: '8px',
              color: '#e6e6e6'
            }}
          />
        <Form
          layout="vertical"
          onFinish={handleFormSubmit}
          initialValues={{
            unique: false,
            background: true,
            sparse: false,
          }}
          style={{ 
            backgroundColor: 'transparent', 
            color: '#e6e6e6'
          }}
        >
          <Form.Item
            name="name"
            label={<span style={{ color: '#00d4ff', fontWeight: 'bold' }}>索引名称</span>}
            rules={[{ required: true, message: '请输入索引名称' }]}
          >
            <Input 
              placeholder="例如: user_email_index" 
              prefix={<FieldNumberOutlined style={{ color: '#666' }} />}
              style={{
                backgroundColor: '#262626',
                border: '1px solid #404040',
                color: '#e6e6e6',
                borderRadius: '6px'
              }}
            />
          </Form.Item>
          
          <Form.Item
            name="key"
            label={<span style={{ color: '#00d4ff', fontWeight: 'bold' }}>索引字段</span>}
            rules={[{ required: true, message: '请输入索引字段' }]}
          >
            <Input.TextArea
              placeholder="例如: email:1,created_at:-1 或 {'email':1,'metadata.userId':1}"
              rows={3}
              style={{
                backgroundColor: '#262626',
                border: '1px solid #404040',
                color: '#e6e6e6',
                borderRadius: '6px',
                fontFamily: 'Monaco, "Courier New", monospace'
              }}
            />
          </Form.Item>
          
          <Form.Item label={<span style={{ color: '#00d4ff', fontWeight: 'bold' }}>索引选项</span>}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Form.Item name="unique" valuePropName="checked" style={{ margin: 0 }}>
                <Checkbox style={{ color: '#e6e6e6' }}>
                  <span style={{ color: '#e6e6e6' }}>唯一索引 - 确保字段值唯一性</span>
                </Checkbox>
              </Form.Item>
              <Form.Item name="background" valuePropName="checked" style={{ margin: 0 }}>
                <Checkbox style={{ color: '#e6e6e6' }}>
                  <span style={{ color: '#e6e6e6' }}>后台创建 - 不阻塞数据库操作</span>
                </Checkbox>
              </Form.Item>
              <Form.Item name="sparse" valuePropName="checked" style={{ margin: 0 }}>
                <Checkbox style={{ color: '#e6e6e6' }}>
                  <span style={{ color: '#e6e6e6' }}>稀疏索引 - 只索引存在该字段的文档</span>
                </Checkbox>
              </Form.Item>
            </Space>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: '24px' }}>
            <Space size="large">
              <Button 
                onClick={() => setShowCreateForm(false)}
                style={{
                  backgroundColor: '#404040',
                  border: '1px solid #666',
                  color: '#e6e6e6',
                  borderRadius: '6px',
                  padding: '6px 20px'
                }}
              >
                取消
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                icon={<PlusOutlined />}
                style={{
                  backgroundColor: '#00d4ff',
                  border: '1px solid #00d4ff',
                  color: '#000',
                  borderRadius: '6px',
                  padding: '6px 20px',
                  fontWeight: 'bold',
                  boxShadow: '0 0 12px rgba(0, 212, 255, 0.3)'
                }}
              >
                创建索引
              </Button>
            </Space>
          </Form.Item>
        </Form>
        </div>
      </Modal>
    </div>
  );
};

export default IndexManagement;
