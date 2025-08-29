import React, { useState } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Select, 
  Button, 
  Typography, 
  message,
  Space,
  Row,
  Col,
  Alert
} from 'antd';
import { PlusOutlined, SendOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface CreateLogForm {
  service_name: string;
  level: string;
  message: string;
  trace_id?: string;
  span_id?: string;
  metadata?: Record<string, string>;
}

const LogCreate: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [metadataInputs, setMetadataInputs] = useState<{ key: string; value: string }[]>([]);

  const handleSubmit = async (values: CreateLogForm) => {
    try {
      setLoading(true);
      
      // 处理metadata
      const metadata: Record<string, string> = {};
      metadataInputs.forEach(item => {
        if (item.key && item.value) {
          metadata[item.key] = item.value;
        }
      });

      const logData = {
        ...values,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined
      };

      await axios.post('/api/logs', logData);
      message.success('日志创建成功！');
      form.resetFields();
      setMetadataInputs([]);
    } catch (error) {
      console.error('创建失败:', error);
      message.error('日志创建失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const addMetadataInput = () => {
    setMetadataInputs([...metadataInputs, { key: '', value: '' }]);
  };

  const removeMetadataInput = (index: number) => {
    const newInputs = metadataInputs.filter((_, i) => i !== index);
    setMetadataInputs(newInputs);
  };

  const updateMetadataInput = (index: number, field: 'key' | 'value', value: string) => {
    const newInputs = [...metadataInputs];
    newInputs[index][field] = value;
    setMetadataInputs(newInputs);
  };

  const handleQuickFill = (template: string) => {
    switch (template) {
      case 'error':
        form.setFieldsValue({
          service_name: 'web-service',
          level: 'ERROR',
          message: '数据库连接失败: Connection timeout after 30s',
          trace_id: `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          span_id: `span-${Math.random().toString(36).substr(2, 9)}`
        });
        setMetadataInputs([
          { key: 'error_code', value: 'DB_TIMEOUT' },
          { key: 'retry_count', value: '3' },
          { key: 'endpoint', value: '/api/users' }
        ]);
        break;
      case 'info':
        form.setFieldsValue({
          service_name: 'user-service',
          level: 'INFO',
          message: '用户登录成功',
          trace_id: `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        });
        setMetadataInputs([
          { key: 'user_id', value: '12345' },
          { key: 'ip_address', value: '192.168.1.100' },
          { key: 'user_agent', value: 'Mozilla/5.0' }
        ]);
        break;
      case 'warn':
        form.setFieldsValue({
          service_name: 'payment-service',
          level: 'WARN',
          message: 'API调用频率过高，即将触发限流',
          trace_id: `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        });
        setMetadataInputs([
          { key: 'api_endpoint', value: '/api/payment/process' },
          { key: 'current_rate', value: '95/100' },
          { key: 'client_id', value: 'client_123' }
        ]);
        break;
    }
  };

  return (
    <div className="fade-in">
      <Title level={2} className="glow-text" style={{ marginBottom: 24 }}>
        创建日志
      </Title>

      <Row gutter={16}>
        <Col xs={24} lg={16}>
          <Card className="tech-card">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              requiredMark={false}
            >
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="服务名称"
                    name="service_name"
                    rules={[{ required: true, message: '请输入服务名称' }]}
                  >
                    <Input placeholder="例如: user-service" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="日志级别"
                    name="level"
                    rules={[{ required: true, message: '请选择日志级别' }]}
                  >
                    <Select placeholder="选择日志级别">
                      <Option value="DEBUG">DEBUG</Option>
                      <Option value="INFO">INFO</Option>
                      <Option value="WARN">WARN</Option>
                      <Option value="ERROR">ERROR</Option>
                      <Option value="FATAL">FATAL</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="日志消息"
                name="message"
                rules={[{ required: true, message: '请输入日志消息' }]}
              >
                <TextArea 
                  rows={4} 
                  placeholder="输入详细的日志消息..."
                  showCount
                  maxLength={1000}
                />
              </Form.Item>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item label="Trace ID" name="trace_id">
                    <Input placeholder="分布式追踪ID（可选）" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="Span ID" name="span_id">
                    <Input placeholder="Span ID（可选）" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="元数据 (Metadata)">
                <div style={{ marginBottom: 16 }}>
                  <Button 
                    type="dashed" 
                    onClick={addMetadataInput}
                    icon={<PlusOutlined />}
                    style={{ width: '100%' }}
                  >
                    添加元数据字段
                  </Button>
                </div>
                
                {metadataInputs.map((item, index) => (
                  <div key={index} style={{ marginBottom: 8 }}>
                    <Row gutter={8}>
                      <Col span={10}>
                        <Input
                          placeholder="键名"
                          value={item.key}
                          onChange={(e) => updateMetadataInput(index, 'key', e.target.value)}
                        />
                      </Col>
                      <Col span={10}>
                        <Input
                          placeholder="值"
                          value={item.value}
                          onChange={(e) => updateMetadataInput(index, 'value', e.target.value)}
                        />
                      </Col>
                      <Col span={4}>
                        <Button 
                          type="text" 
                          danger
                          onClick={() => removeMetadataInput(index)}
                        >
                          删除
                        </Button>
                      </Col>
                    </Row>
                  </div>
                ))}
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button 
                    type="primary" 
                    htmlType="submit"
                    loading={loading}
                    icon={<SendOutlined />}
                  >
                    创建日志
                  </Button>
                  <Button onClick={() => form.resetFields()}>
                    重置表单
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="快速模板" className="tech-card">
            <Alert
              message="使用预设模板快速填充表单"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button 
                block 
                onClick={() => handleQuickFill('error')}
                style={{ 
                  background: 'rgba(255, 77, 79, 0.1)',
                  borderColor: 'rgba(255, 77, 79, 0.3)',
                  color: '#ff4d4f'
                }}
              >
                错误日志模板
              </Button>
              <Button 
                block 
                onClick={() => handleQuickFill('warn')}
                style={{ 
                  background: 'rgba(250, 173, 20, 0.1)',
                  borderColor: 'rgba(250, 173, 20, 0.3)',
                  color: '#faad14'
                }}
              >
                警告日志模板
              </Button>
              <Button 
                block 
                onClick={() => handleQuickFill('info')}
                style={{ 
                  background: 'rgba(24, 144, 255, 0.1)',
                  borderColor: 'rgba(24, 144, 255, 0.3)',
                  color: '#1890ff'
                }}
              >
                信息日志模板
              </Button>
            </Space>
          </Card>

          <Card title="使用说明" className="tech-card" style={{ marginTop: 16 }}>
            <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', lineHeight: '1.6' }}>
              <p>• <strong>服务名称</strong>: 标识日志来源的服务</p>
              <p>• <strong>日志级别</strong>: DEBUG &lt; INFO &lt; WARN &lt; ERROR &lt; FATAL</p>
              <p>• <strong>Trace ID</strong>: 用于分布式追踪的唯一标识</p>
              <p>• <strong>元数据</strong>: 附加的键值对信息，便于后续检索和分析</p>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default LogCreate;
