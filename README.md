# B-Pic

一个简约扁平化风格的图片托管服务，支持拖拽上传和多种链接格式生成。

## 🌟 特性

- ✨ **简约扁平化设计** - 现代化的用户界面，渐变背景和卡片设计
- 🖱️ **拖拽上传** - 支持直接拖拽图片到页面上传
- 🎯 **多格式支持** - 支持 JPG、PNG、GIF、BMP、WEBP、SVG、TIFF、ICO
- 🔗 **多种链接格式** - 自动生成信息页链接、直链、HTML代码、Markdown代码
- 📋 **一键复制** - 扁平化风格的复制按钮，带动画反馈
- ⏰ **自动删除功能** - 可设置图片保存时长，支持5分钟到永久保存
- 📱 **响应式设计** - 适配桌面和移动端
- 🗄️ **SQLite数据库** - 轻量级数据存储，无需配置
- 📊 **访问统计** - 图片查看次数统计
- 🖼️ **图片优化** - 自动优化图片质量和大小
- 🛡️ **智能弹窗** - 上传前设置保存时长的优雅弹窗
- 🔄 **定时清理** - 自动清理过期图片，释放存储空间
- 🔐 **密码保护** - 可选的密码认证功能，保护私人图床

## 🚀 快速开始

### 环境要求

- Node.js 14.0 或更高版本
- npm 或 yarn

### 安装

1. 克隆或下载项目到本地
2. 安装依赖：

```bash
npm install
```

### 运行

#### 开发模式
```bash
npm run dev
```

#### 生产模式
```bash
npm start
```

服务器将在 `http://localhost:3000` 启动。

## 🔐 密码认证功能

为了保护您的私人图床，本项目支持可选的密码认证功能，特别适合Docker部署场景。

### 启用认证

通过环境变量配置认证功能：

```bash
# 启用密码认证
ENABLE_AUTH=true
# 设置访问密码
AUTH_PASSWORD=your-secure-password
# 设置Session密钥（可选，建议设置）
SESSION_SECRET=your-random-session-secret
```

### 访问流程

1. **启用认证后**，访问任何页面都会自动跳转到登录页面
2. **登录页面** - 美观的密码验证界面，包含：
   - 🛡️ 安全提示信息
   - 🔒 密码输入框
   - 🎯 实时错误提示
   - ⚡ 加载动画效果
3. **输入正确密码** 后即可访问图床的所有功能
4. **登录状态** 会在浏览器中保持24小时

### Docker部署示例

#### 使用Docker Compose（推荐）

```yaml
version: '3.8'
services:
  image-host:
    build: .
    ports:
      - "3000:3000"
    environment:
      - ENABLE_AUTH=true
      - AUTH_PASSWORD=your-secure-password
      - SESSION_SECRET=your-random-secret
    volumes:
      - ./uploads:/app/uploads
      - ./database.db:/app/database.db
```

#### 直接使用Docker

```bash
# 基础部署（默认临时存储）
docker run -d \
  --name image-host \
  -p 3000:3000 \
  -e ENABLE_AUTH=true \
  -e AUTH_PASSWORD=your-secure-password \
  -e SESSION_SECRET=your-random-secret \
  -v ./uploads:/app/uploads \
  -v ./database.db:/app/database.db \
  your-image-name

# 启用永久存储的部署
docker run -d \
  --name image-host \
  -p 3000:3000 \
  -e ENABLE_AUTH=true \
  -e AUTH_PASSWORD=your-secure-password \
  -e SESSION_SECRET=your-random-secret \
  -e ALLOW_PERMANENT_STORAGE=true \
  -v ./uploads:/app/uploads \
  -v ./database.db:/app/database.db \
  your-image-name

# 公开访问（无需认证，仅临时存储）
docker run -d \
  --name image-host \
  -p 3000:3000 \
  -e ENABLE_AUTH=false \
  -v ./uploads:/app/uploads \
  -v ./database.db:/app/database.db \
  your-image-name
```

### 认证相关API

- `GET /login` - 登录页面
- `POST /api/login` - 登录验证
- `POST /api/logout` - 退出登录
- `GET /api/auth/status` - 检查认证状态

## 📖 使用说明

### 上传图片

1. 访问首页
2. 将图片拖拽到上传区域，或点击"选择文件"按钮
3. 在弹出的设置窗口中选择图片保存时长：
   - 🕐 **5分钟** - 临时分享 (默认)
   - 🕕 **10分钟** - 短期分享
   - ⏳ **1小时** - 中期分享
   - ☀️ **1天** - 日常分享
   - 📅 **2天** - 短期存储
   - 📆 **1周** - 周期分享
   - 🗓️ **1个月** - 长期存储
   - ♾️ **永不删除** - 永久保存
4. 点击"确认上传"开始上传
5. 支持的格式：JPG, PNG, GIF, BMP, WEBP, SVG, TIFF, ICO
6. 单个文件最大 10MB

### 获取链接

上传成功后，系统会自动生成四种类型的链接：

- **信息页链接**: 包含图片详细信息的页面
- **图片直链**: 图片的直接访问地址
- **HTML代码**: 可直接嵌入网页的HTML代码
- **Markdown代码**: 适用于Markdown文档的格式

每种链接都可以通过点击复制按钮一键复制到剪贴板。

### 图片信息页

通过信息页链接可以查看：
- 🖼️ **图片预览** - 高清图片展示
- 📄 **文件信息** - 文件名、大小、类型
- ⏰ **时间信息** - 上传时间、删除时间
- 📊 **访问统计** - 查看次数统计
- 🔗 **多种链接** - 各种格式的分享链接
- 🎨 **优雅设计** - 简约扁平化界面

## 🏗️ 项目结构

```
tc/
├── server.js              # 主服务器文件
├── package.json           # 项目配置和依赖
├── database.db           # SQLite数据库（运行后生成）
├── uploads/              # 上传的图片存储目录（运行后生成）
└── public/               # 静态文件目录
    ├── index.html        # 主页面
    ├── image.html        # 图片信息页面
    ├── style.css         # 样式文件
    └── script.js         # 前端JavaScript
```

## 🔧 技术栈

### 后端
- **Node.js** - 运行时环境
- **Express.js** - Web框架
- **SQLite3** - 数据库
- **Multer** - 文件上传中间件
- **Sharp** - 图片处理
- **UUID** - 唯一ID生成

### 前端
- **HTML5** - 结构
- **CSS3** - 样式（响应式设计）
- **JavaScript** - 交互逻辑
- **Font Awesome** - 图标库

## 🎨 设计特色

- **渐变背景** - 现代化的紫蓝渐变背景
- **卡片设计** - 白色卡片容器，圆角阴影
- **扁平化按钮** - 简洁的按钮设计
- **动画效果** - 悬停和加载动画
- **响应式布局** - 适配各种屏幕尺寸

## 📦 部署

### 本地部署

1. 按照安装步骤设置项目
2. 运行 `npm start`
3. 访问 `http://localhost:3000`

### 服务器部署

1. 将项目文件上传到服务器
2. 安装依赖：`npm install --production`
3. 使用进程管理器（如 PM2）运行：
   ```bash
   npm install -g pm2
   pm2 start server.js --name "image-host"
   ```

## ⚙️ 配置

可以通过环境变量配置：

### 基础配置
- `PORT` - 服务器端口（默认：3000）

### 认证配置
- `ENABLE_AUTH` - 是否启用密码认证（默认：false）
- `AUTH_PASSWORD` - 访问密码（默认：admin123）
- `SESSION_SECRET` - Session加密密钥（建议自定义）

### 存储配置
- `ALLOW_PERMANENT_STORAGE` - 是否允许永久保存图片（默认：false）
  - 设置为 `true` 时，显示"永不删除"选项，允许永久存储
  - 默认仅支持临时存储，适合大多数使用场景

### 配置示例

```bash
# 基础运行
PORT=8080 npm start

# 启用认证运行
ENABLE_AUTH=true AUTH_PASSWORD=mypassword npm start

# 完整配置
PORT=8080 ENABLE_AUTH=true AUTH_PASSWORD=mypassword SESSION_SECRET=my-secret npm start

# 启用永久存储
ALLOW_PERMANENT_STORAGE=true ENABLE_AUTH=true AUTH_PASSWORD=mypassword npm start
```

### 环境变量文件

可以创建 `.env` 文件来管理配置（参考 `env.example` 文件）：

```bash
# 复制示例文件
cp env.example .env
# 编辑配置
nano .env
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 📞 支持

如果遇到问题，请在项目仓库创建 Issue。 