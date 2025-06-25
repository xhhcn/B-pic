#!/bin/bash

echo "🚀 启动简约图床服务器..."
echo "📍 项目目录: $(pwd)"
echo "⏰ 启动时间: $(date)"
echo ""

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js，请先安装 Node.js"
    exit 1
fi

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "📦 正在安装依赖..."
    npm install
    echo ""
fi

# 启动服务器
echo "🌟 正在启动服务器..."
echo "📡 服务器地址: http://localhost:8007"
echo "📝 按 Ctrl+C 停止服务器"
echo ""
echo "==================================="
echo ""

node server.js 