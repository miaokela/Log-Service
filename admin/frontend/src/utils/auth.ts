import axios from 'axios';

// 认证相关工具函数
export class AuthService {
  // 检查是否已登录
  static isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    return !!token;
  }

  // 获取当前用户
  static getCurrentUser(): string | null {
    return localStorage.getItem('username');
  }

  // 获取token
  static getToken(): string | null {
    return localStorage.getItem('token');
  }

  // 设置token到axios header
  static setAuthHeader(): void {
    const token = this.getToken();
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }

  // 清除认证信息
  static logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    delete axios.defaults.headers.common['Authorization'];
  }

  // 验证token是否有效
  static async verifyToken(): Promise<boolean> {
    try {
      const token = this.getToken();
      if (!token) return false;

      this.setAuthHeader();
      const response = await axios.get('/api/auth/verify');
      return response.status === 200;
    } catch (error) {
      this.logout();
      return false;
    }
  }
}

// 初始化axios拦截器
export const setupAxiosInterceptors = () => {
  // 请求拦截器
  axios.interceptors.request.use(
    (config) => {
      const token = AuthService.getToken();
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // 响应拦截器
  axios.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      if (error.response?.status === 401) {
        // Token过期或无效，清除认证信息并跳转到登录页
        AuthService.logout();
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );
};
