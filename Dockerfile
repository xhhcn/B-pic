# 使用官方Node.js运行时作为基础镜像
FROM node:18-alpine

# 安装必要的系统依赖
RUN apk add --no-cache \
    build-base \
    vips-dev \
    python3 \
    python3-dev \
    py3-pip \
    py3-setuptools \
    make \
    g++ \
    && pip3 install --break-system-packages setuptools

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production && npm cache clean --force

# 复制应用代码
COPY . .

# 创建必要的目录
RUN mkdir -p uploads

# 暴露端口
EXPOSE 8007

# 设置默认环境变量
ENV NODE_ENV=production
ENV PORT=8007
ENV ENABLE_AUTH=true
ENV AUTH_PASSWORD=admin123

# 启动应用
CMD ["npm", "start"] 