#!/usr/bin/env node

/**
 * 健康检查脚本
 * 用于Docker容器和监控系统检查服务状态
 */

const http = require('http');

const PORT = process.env.PORT || 8007;
const HOST = process.env.HOST || 'localhost';

const options = {
  hostname: HOST,
  port: PORT,
  path: '/api/auth/status',
  method: 'GET',
  timeout: 5000
};

const healthCheck = () => {
  const req = http.request(options, (res) => {
    if (res.statusCode === 200) {
      console.log('✅ 健康检查通过');
      process.exit(0);
    } else {
      console.log(`❌ 健康检查失败: HTTP ${res.statusCode}`);
      process.exit(1);
    }
  });

  req.on('error', (error) => {
    console.log(`❌ 健康检查失败: ${error.message}`);
    process.exit(1);
  });

  req.on('timeout', () => {
    console.log('❌ 健康检查超时');
    req.destroy();
    process.exit(1);
  });

  req.end();
};

// 执行健康检查
healthCheck(); 