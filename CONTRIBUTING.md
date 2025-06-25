# 贡献指南

感谢您对 B-Pic 项目的关注！我们欢迎所有形式的贡献。

## 🚀 如何贡献

### 报告问题

如果您发现了bug或有功能建议，请：

1. 检查 [Issues](https://github.com/xhhcn/B-pic/issues) 确认问题未被报告
2. 创建新的 Issue，详细描述问题或建议
3. 提供相关的环境信息和复现步骤

### 提交代码

1. **Fork 项目**
   ```bash
   git clone https://github.com/xhhcn/B-pic.git
   cd B-pic
   ```

2. **创建功能分支**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **安装依赖**
   ```bash
   npm install
   ```

4. **进行开发**
   - 遵循现有的代码风格
   - 添加必要的注释
   - 确保代码能够正常运行

5. **测试您的更改**
   ```bash
   npm start
   # 在浏览器中测试功能
   ```

6. **提交更改**
   ```bash
   git add .
   git commit -m "feat: 添加新功能描述"
   ```

7. **推送到GitHub**
   ```bash
   git push origin feature/your-feature-name
   ```

8. **创建 Pull Request**
   - 详细描述您的更改
   - 解释为什么需要这些更改
   - 包含相关的Issue编号

## 📝 代码规范

### 提交消息格式

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat:` 新功能
- `fix:` 修复bug
- `docs:` 文档更新
- `style:` 代码格式（不影响功能）
- `refactor:` 重构
- `test:` 测试相关
- `chore:` 构建过程或辅助工具的变动

### 代码风格

- 使用 2 个空格缩进
- 使用分号结尾
- 变量和函数使用驼峰命名
- 常量使用大写字母和下划线
- 添加有意义的注释

### 文件结构

```
public/
├── index.html      # 主页面
├── login.html      # 登录页面
├── image.html      # 图片信息页面
├── style.css       # 样式文件
├── script.js       # 前端脚本
├── logo.svg        # 项目logo
└── background.svg  # 背景图片
```

## 🧪 测试

在提交PR之前，请确保：

1. 代码能够正常启动
2. 所有功能都能正常工作
3. 在不同浏览器中测试
4. 检查响应式设计

## 📋 开发环境

### 必需环境

- Node.js 14.0+
- npm 或 yarn

### 可选工具

- Docker（用于容器化部署）
- PM2（用于生产环境进程管理）

## 🎯 开发重点

我们特别欢迎以下类型的贡献：

- 🐛 Bug修复
- ✨ 新功能开发
- 📚 文档改进
- 🎨 UI/UX优化
- ⚡ 性能优化
- 🔒 安全增强
- 🧪 测试覆盖

## 💬 交流讨论

- 📧 Email: contact@example.com
- 💬 微信: xhh1128
- 🐦 Twitter: [@xhh1128](https://twitter.com/xhh1128)

## 📄 许可证

通过贡献代码，您同意您的贡献将在 [MIT License](LICENSE) 下发布。

---

再次感谢您的贡献！🎉 