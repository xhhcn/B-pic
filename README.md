# B-Pic

<div align="center">

<img src="public/logo.svg" alt="B-Pic Logo" width="120" height="120" style="border-radius: 20px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">

<br><br>

🖼️ **一个简约扁平化风格的图片托管服务** 🖼️

*支持拖拽上传和多种链接格式生成*

<br>

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18+-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

<br>

```
    ╔══════════════════════════════════════╗
    ║  🎨 简约设计  📱 响应式  🔐 安全认证  ║
    ║  ⚡ 快速上传  🔗 多种链接  ⏰ 定时清理  ║
    ╚══════════════════════════════════════╝
```

</div>

---

## 🌟 特性

- ✨ **简约扁平化设计** - 现代化的用户界面
- 🖱️ **拖拽上传** - 支持直接拖拽图片到页面上传
- 🎯 **多格式支持** - 支持 JPG、PNG、GIF、BMP、WEBP、SVG、TIFF、ICO
- 🔗 **多种链接格式** - 自动生成信息页链接、直链、HTML代码、Markdown代码
- ⏰ **自动删除功能** - 可设置图片保存时长，支持5分钟到永久保存
- 🔐 **密码保护** - 可选的密码认证功能，保护私人图床
- 📱 **响应式设计** - 适配桌面和移动端
- 🌐 **智能协议检测** - 自动识别HTTPS环境，支持反向代理
- 🚀 **优化用户体验** - 移除频率限制，确保流畅使用
- 🔧 **文件名优化** - 自动转换文件扩展名为小写
- 🐳 **Docker部署** - 一键部署，开箱即用

## 🚀 快速部署

[![Docker Hub](https://img.shields.io/badge/Docker%20Hub-xhh1128%2Fb--pic-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://hub.docker.com/r/xhh1128/b-pic)

### Docker Compose 部署（推荐）

1. **下载项目文件**
   ```bash
   git clone https://github.com/xhhcn/B-pic.git
   cd B-pic
   ```

2. **配置环境变量**
   ```bash
   cp env.example .env
   # 编辑 .env 文件，设置您的密码和配置
   ```

3. **启动服务**
```bash
   docker-compose up -d
   ```

4. **访问服务**
   - 打开浏览器访问: `http://localhost:8007`
   - 如果启用了认证，请使用设置的密码登录

### 单独 Docker 部署

**⚠️ 重要：使用数据持久化前，请先创建必要的目录和文件**

```bash
# 1. 创建数据目录和文件（首次部署必须执行）
mkdir -p uploads
touch database.db

# 2. 启用认证的部署
docker run -d \
  --name b-pic \
  -p 8007:8007 \
  -e ENABLE_AUTH=true \
  -e AUTH_PASSWORD=your-secure-password \
  -e SESSION_SECRET=your-random-secret \
  -v ./uploads:/app/uploads \
  -v ./database.db:/app/database.db \
  xhh1128/b-pic

# 3. 公开访问（无认证）
docker run -d \
  --name b-pic \
  -p 8007:8007 \
  -e ENABLE_AUTH=false \
  -v ./uploads:/app/uploads \
  -v ./database.db:/app/database.db \
  xhh1128/b-pic
```

**🚀 快速启动（无数据持久化）**

如果您不需要数据持久化，可以直接运行：

```bash
# 简单启动（数据不会保存）
docker run -d --name b-pic -p 8007:8007 -e ENABLE_AUTH=false xhh1128/b-pic
```

## ⚙️ 环境配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | `8007` | 服务器端口 |
| `ENABLE_AUTH` | `false` | 是否启用密码认证 |
| `AUTH_PASSWORD` | `admin123` | 访问密码 |
| `SESSION_SECRET` | `随机生成` | Session加密密钥 |
| `ALLOW_PERMANENT_STORAGE` | `false` | 是否允许永久存储 |

## 📖 使用说明

### 上传图片
1. 访问首页
2. 拖拽图片到上传区域或点击选择文件
3. 选择图片保存时长（5分钟到永久）
4. 获取多种格式的分享链接

### 支持格式
- **图片格式**: JPG, PNG, GIF, BMP, WEBP, SVG, TIFF, ICO
- **文件大小**: 最大 10MB
- **链接类型**: 信息页链接、直链、HTML代码、Markdown代码

## 🔧 高级配置

<details>
<summary><b>🔒 安全建议</b></summary>

- 使用复杂密码，包含大小写字母、数字和特殊字符
- 生产环境建议使用HTTPS
- 定期更新Docker镜像
- 合理配置防火墙规则

</details>

<details>
<summary><b>🐳 Docker Compose 完整配置</b></summary>

```yaml
version: '3.8'
services:
  b-pic:
    build: .
    container_name: b-pic
    restart: unless-stopped
    ports:
      - "8007:8007"
    environment:
      - NODE_ENV=production
      - PORT=8007
      - ENABLE_AUTH=true
      - AUTH_PASSWORD=your-secure-password-change-me
      - SESSION_SECRET=your-random-session-secret-change-me
      - ALLOW_PERMANENT_STORAGE=false
    volumes:
      - ./uploads:/app/uploads
      - ./database.db:/app/database.db
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8007/api/auth/status"]
      interval: 30s
      timeout: 10s
      retries: 3
```

</details>

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

[MIT License](LICENSE)

---

<div align="center">

**⭐ 如果这个项目对您有帮助，请给它一个星标！**

<br>

<img src="public/logo.svg" alt="B-Pic Logo" width="48" height="48" style="border-radius: 12px;">

```
╔═══════════════════════════════════════════════════════════════╗
║                    🎨 B-Pic Image Hosting                    ║
║                                                               ║
║  简约 • 快速 • 安全 • 易用                                     ║
║                                                               ║
║              Built with ❤️ by @xhh1128                       ║
╚═══════════════════════════════════════════════════════════════╝
```

</div> 