const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const cors = require('cors');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, param, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3000;

// 认证配置
const ENABLE_AUTH = process.env.ENABLE_AUTH === 'true';
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'admin123';
const SESSION_SECRET = process.env.SESSION_SECRET || 'your-secret-key-' + Math.random().toString(36);

// 存储配置
const ALLOW_PERMANENT_STORAGE = process.env.ALLOW_PERMANENT_STORAGE === 'true'; // 默认不允许永久存储

// 安全配置
const UPLOAD_LIMIT_PER_DAY = 100; // 未认证用户每天上传限制

// 安全中间件
app.use(helmet({
    contentSecurityPolicy: false, // 暂时禁用CSP以支持内联样式
    crossOriginEmbedderPolicy: false
}));

// CORS配置（简化版，适合图床应用）
app.use(cors({
    origin: true, // 允许所有源，因为图床通常用于分享
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 请求体大小限制
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 安全的 key generator
function secureKeyGenerator(req) {
    return getClientIP(req);
}

// 通用速率限制
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100, // 限制每个IP 15分钟内最多100个请求
    message: { error: '请求过于频繁，请稍后再试' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: secureKeyGenerator,
    skip: (req) => {
        // 跳过健康检查等系统请求
        return req.path === '/health' || req.path === '/favicon.ico';
    }
});

// 登录速率限制
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 5, // 限制每个IP 15分钟内最多5次登录尝试
    message: { error: '登录尝试过于频繁，请15分钟后再试' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: secureKeyGenerator,
});

// 上传速率限制（认证用户）
const uploadLimiter = rateLimit({
    windowMs: 60 * 1000, // 1分钟
    max: 10, // 限制每个IP每分钟最多10次上传
    message: { error: '上传过于频繁，请稍后再试' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: secureKeyGenerator,
});

app.use(generalLimiter);

// Session配置
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // 在生产环境中使用HTTPS时设置为true
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24小时
    }
}));

// 认证中间件
function requireAuth(req, res, next) {
    if (!ENABLE_AUTH) {
        return next(); // 如果未启用认证，直接继续
    }
    
    if (req.session && req.session.authenticated) {
        return next(); // 已认证，继续
    }
    
    // 对于API请求，返回JSON错误
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: '未授权访问，请先登录' });
    }
    
    // 对于页面请求，重定向到登录页
    res.redirect('/login');
}

// 静态文件中间件，对需要认证的文件进行保护
app.use((req, res, next) => {
    // 登录页面相关的资源不需要认证
    if (req.path === '/login.html' || req.path === '/background.svg') {
        return next();
    }
    
    // 阻止直接访问index.html，强制通过路由
    if (req.path === '/index.html') {
        return res.redirect('/');
    }
    
    // 其他静态资源需要认证保护
    if (req.path.match(/\.(css|js|html|ico|png|jpg|jpeg|gif)$/) && req.path !== '/background.svg') {
        return requireAuth(req, res, next);
    }
    
    next();
});

// 使用自定义的静态文件服务，禁用index.html自动查找
app.use(express.static('public', { index: false }));

// 创建上传目录
const uploadsDir = 'uploads';
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// 数据库设置
const db = new sqlite3.Database('database.db');

// 创建图片表并处理数据库升级
db.serialize(() => {
    // 创建图片表（如果不存在）
    db.run(`
        CREATE TABLE IF NOT EXISTS images (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            original_name TEXT NOT NULL,
            mimetype TEXT NOT NULL,
            size INTEGER NOT NULL,
            upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            download_count INTEGER DEFAULT 0
        )
    `);
    
    // 创建IP限流表（如果不存在）
    db.run(`
        CREATE TABLE IF NOT EXISTS ip_upload_limits (
            ip_address TEXT PRIMARY KEY,
            upload_count INTEGER DEFAULT 0,
            last_reset_date DATE DEFAULT (DATE('now')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // 检查并添加新列（数据库升级）
    db.all(`PRAGMA table_info(images)`, (err, rows) => {
        if (err) {
            console.error('检查表结构失败:', err);
            return;
        }
        
        const columnNames = rows.map(row => row.name);
        let upgrades = 0;
        
        // 添加 delete_time 列（如果不存在）
        if (!columnNames.includes('delete_time')) {
            db.run(`ALTER TABLE images ADD COLUMN delete_time DATETIME`, (err) => {
                if (err) {
                    console.error('添加 delete_time 列失败:', err);
                } else {
                    console.log('✓ 添加 delete_time 列成功');
                    upgrades++;
                    if (upgrades === 2) console.log('🎉 数据库结构升级完成');
                }
            });
        } else {
            upgrades++;
        }
        
        // 添加 auto_delete 列（如果不存在）
        if (!columnNames.includes('auto_delete')) {
            db.run(`ALTER TABLE images ADD COLUMN auto_delete INTEGER DEFAULT 1`, (err) => {
                if (err) {
                    console.error('添加 auto_delete 列失败:', err);
                } else {
                    console.log('✓ 添加 auto_delete 列成功');
                    upgrades++;
                    if (upgrades === 2) console.log('🎉 数据库结构升级完成');
                }
            });
        } else {
            upgrades++;
        }
        
        if (upgrades === 2) {
            console.log('📊 数据库结构已是最新版本');
        }
    });
});

// 工具函数

// 获取客户端真实IP（安全版本）
function getClientIP(req) {
    // 在生产环境中，可以配置信任的代理IP列表
    // 这里为了安全，优先使用连接的真实IP
    const directIP = req.connection.remoteAddress || 
                     req.socket.remoteAddress ||
                     (req.connection.socket ? req.connection.socket.remoteAddress : null);
    
    if (directIP) {
        return directIP.replace(/^::ffff:/, ''); // 移除IPv6映射前缀
    }
    
    // 如果在可信代理后面，才使用 X-Forwarded-For
    // 注意：在生产环境中应该验证代理来源
    return req.ip || '127.0.0.1';
}

// 输入验证错误处理中间件
function handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: '输入参数验证失败',
            details: errors.array().map(err => err.msg)
        });
    }
    next();
}

// 检查IP上传限制
async function checkIPUploadLimit(ip) {
    return new Promise((resolve, reject) => {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD格式
        
        db.get(
            'SELECT * FROM ip_upload_limits WHERE ip_address = ?',
            [ip],
            (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (!row) {
                    // 新IP，创建记录
                    db.run(
                        'INSERT INTO ip_upload_limits (ip_address, upload_count, last_reset_date) VALUES (?, 1, ?)',
                        [ip, today],
                        function(insertErr) {
                            if (insertErr) {
                                reject(insertErr);
                            } else {
                                resolve({ allowed: true, remaining: UPLOAD_LIMIT_PER_DAY - 1 });
                            }
                        }
                    );
                } else {
                    // 检查是否需要重置计数器
                    if (row.last_reset_date !== today) {
                        // 新的一天，重置计数器
                        db.run(
                            'UPDATE ip_upload_limits SET upload_count = 1, last_reset_date = ?, updated_at = CURRENT_TIMESTAMP WHERE ip_address = ?',
                            [today, ip],
                            function(updateErr) {
                                if (updateErr) {
                                    reject(updateErr);
                                } else {
                                    resolve({ allowed: true, remaining: UPLOAD_LIMIT_PER_DAY - 1 });
                                }
                            }
                        );
                    } else {
                        // 同一天，检查限制
                        if (row.upload_count >= UPLOAD_LIMIT_PER_DAY) {
                            resolve({ allowed: false, remaining: 0 });
                        } else {
                            // 增加计数器
                            db.run(
                                'UPDATE ip_upload_limits SET upload_count = upload_count + 1, updated_at = CURRENT_TIMESTAMP WHERE ip_address = ?',
                                [ip],
                                function(updateErr) {
                                    if (updateErr) {
                                        reject(updateErr);
                                    } else {
                                        resolve({ allowed: true, remaining: UPLOAD_LIMIT_PER_DAY - row.upload_count - 1 });
                                    }
                                }
                            );
                        }
                    }
                }
            }
        );
    });
}

// 获取IP上传状态
async function getIPUploadStatus(ip) {
    return new Promise((resolve, reject) => {
        const today = new Date().toISOString().split('T')[0];
        
        db.get(
            'SELECT * FROM ip_upload_limits WHERE ip_address = ?',
            [ip],
            (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (!row || row.last_reset_date !== today) {
                    resolve({ count: 0, remaining: UPLOAD_LIMIT_PER_DAY });
                } else {
                    resolve({ count: row.upload_count, remaining: UPLOAD_LIMIT_PER_DAY - row.upload_count });
                }
            }
        );
    });
}

// 安全的路径验证
function isValidPath(filePath) {
    const normalizedPath = path.normalize(filePath);
    return !normalizedPath.includes('..');
}

// 文件过滤器
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|bmp|webp|svg|tiff|ico/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('只支持图片文件格式！'));
    }
};

// Multer配置
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueId = uuidv4();
        const ext = path.extname(file.originalname);
        cb(null, uniqueId + ext);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB限制
    }
});

// 路由

// 健康检查端点（无需认证和限流）
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// 登录页面（不需要认证）
app.get('/login', (req, res) => {
    if (!ENABLE_AUTH) {
        return res.redirect('/'); // 如果未启用认证，重定向到主页
    }
    
    if (req.session && req.session.authenticated) {
        return res.redirect('/'); // 已登录用户重定向到主页
    }
    
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// 登录API
app.post('/api/login', 
    loginLimiter,
    [
        body('password')
            .isLength({ min: 1, max: 128 })
            .withMessage('密码长度必须在1-128字符之间')
            .trim()
    ],
    handleValidationErrors,
    (req, res) => {
        try {
            if (!ENABLE_AUTH) {
                return res.json({ success: true, message: '认证已禁用' });
            }
            
            const { password } = req.body;
            
            if (password === AUTH_PASSWORD) {
                req.session.authenticated = true;
                req.session.loginTime = new Date().toISOString();
                
                res.json({ 
                    success: true, 
                    message: '登录成功',
                    loginTime: req.session.loginTime
                });
            } else {
                // 记录失败的登录尝试
                const clientIP = getClientIP(req);
                console.warn(`登录失败尝试 - IP: ${clientIP}, 时间: ${new Date().toISOString()}`);
                res.status(401).json({ error: '密码错误' });
            }
        } catch (error) {
            console.error('登录处理错误:', error);
            res.status(500).json({ error: '服务器内部错误' });
        }
    }
);

// 登出API
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: '登出失败' });
        }
        res.json({ success: true, message: '已成功登出' });
    });
});

// 检查认证状态API
app.get('/api/auth/status', (req, res) => {
    if (!ENABLE_AUTH) {
        return res.json({ 
            authEnabled: false, 
            authenticated: true, 
            message: '认证已禁用' 
        });
    }
    
    res.json({
        authEnabled: true,
        authenticated: !!(req.session && req.session.authenticated),
        loginTime: req.session ? req.session.loginTime : null
    });
});

// 获取系统配置API（需要认证）
app.get('/api/config', requireAuth, (req, res) => {
    res.json({
        allowPermanentStorage: ALLOW_PERMANENT_STORAGE,
        authEnabled: ENABLE_AUTH
    });
});

// 获取上传限制状态API（无需认证，用于显示限制信息）
app.get('/api/upload-limit', async (req, res) => {
    try {
        if (ENABLE_AUTH) {
            // 如果启用了认证，返回无限制
            return res.json({
                hasLimit: false,
                message: '已启用认证，无上传限制'
            });
        }
        
        const clientIP = getClientIP(req);
        const status = await getIPUploadStatus(clientIP);
        
        res.json({
            hasLimit: true,
            dailyLimit: UPLOAD_LIMIT_PER_DAY,
            used: status.count,
            remaining: status.remaining,
            resetTime: new Date(new Date().setHours(24, 0, 0, 0)).toISOString()
        });
    } catch (error) {
        console.error('获取上传限制状态失败:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 主页（需要认证）
app.get('/', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 上传图片（需要认证）
app.post('/api/upload', 
    requireAuth, 
    uploadLimiter,
    [
        body('deleteTime')
            .optional()
            .isInt({ min: 0, max: 525600 }) // 最大1年（分钟）
            .withMessage('删除时间必须是0-525600之间的整数')
    ],
    handleValidationErrors,
    upload.single('image'), 
    async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '没有上传文件' });
        }

            // 如果未启用认证，检查IP上传限制
            if (!ENABLE_AUTH) {
                const clientIP = getClientIP(req);
                try {
                    const limitResult = await checkIPUploadLimit(clientIP);
                    if (!limitResult.allowed) {
                        return res.status(429).json({ 
                            error: '今日上传次数已达上限',
                            details: `每日限制 ${UPLOAD_LIMIT_PER_DAY} 次，请明天再试`,
                            dailyLimit: UPLOAD_LIMIT_PER_DAY,
                            resetTime: new Date(new Date().setHours(24, 0, 0, 0)).toISOString()
                        });
                    }
                } catch (limitError) {
                    console.error('检查IP上传限制失败:', limitError);
                    return res.status(500).json({ error: '服务器内部错误' });
                }
            }

        const file = req.file;
        const imageId = path.parse(file.filename).name;
        
        // 尝试优化图片（如果不是SVG）
        if (file.mimetype !== 'image/svg+xml') {
            try {
                await sharp(file.path)
                    .resize(2000, 2000, { 
                        fit: 'inside', 
                        withoutEnlargement: true 
                    })
                    .jpeg({ quality: 85 })
                    .toFile(file.path + '.optimized');
                
                // 替换原文件
                fs.renameSync(file.path + '.optimized', file.path);
            } catch (sharpError) {
                console.log('图片优化失败，使用原文件:', sharpError.message);
            }
        }

        // 计算删除时间
        const deleteTimeMinutes = parseInt(req.body.deleteTime) || 5;
        let deleteTime = null;
        let autoDelete = 1;
        
        // 检查是否允许永久存储
        if (deleteTimeMinutes === 0 && !ALLOW_PERMANENT_STORAGE) {
            return res.status(400).json({ error: '系统不允许永久存储，请选择其他保存时长' });
        }
        
        if (deleteTimeMinutes > 0) {
            deleteTime = new Date(Date.now() + deleteTimeMinutes * 60 * 1000).toISOString();
        } else {
            autoDelete = 0; // 永不删除
        }

        // 保存到数据库
        const stmt = db.prepare(`
            INSERT INTO images (id, filename, original_name, mimetype, size, delete_time, auto_delete)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(imageId, file.filename, file.originalname, file.mimetype, file.size, deleteTime, autoDelete);
        stmt.finalize();

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        
        res.json({
            success: true,
            id: imageId,
            filename: file.filename,
            originalName: file.originalname,
            size: file.size,
            urls: {
                info: `${baseUrl}/image/${imageId}`,
                direct: `${baseUrl}/uploads/${file.filename}`,
                html: `<img src="${baseUrl}/uploads/${file.filename}" alt="${file.originalname}">`,
                markdown: `![${file.originalname}](${baseUrl}/uploads/${file.filename})`
            }
        });
    } catch (error) {
        console.error('上传错误:', error);
        res.status(500).json({ error: '上传失败' });
    }
});

// 获取图片信息（需要认证）
app.get('/api/image/:id', 
    requireAuth,
    [
        param('id')
            .isLength({ min: 1, max: 64 })
            .matches(/^[a-zA-Z0-9\-_]+$/)
            .withMessage('图片ID格式无效')
    ],
    handleValidationErrors,
    (req, res) => {
        try {
    const imageId = req.params.id;
    
    db.get(
        'SELECT * FROM images WHERE id = ?', 
        [imageId], 
        (err, row) => {
            if (err) {
                        console.error('数据库查询错误:', err);
                return res.status(500).json({ error: '数据库错误' });
            }
            
            if (!row) {
                return res.status(404).json({ error: '图片不存在' });
            }
            
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            
            // 格式化删除时间信息
            let deleteInfo = '永不删除';
            if (row.auto_delete && row.delete_time) {
                const deleteTime = new Date(row.delete_time);
                const now = new Date();
                if (deleteTime > now) {
                    deleteInfo = deleteTime.toLocaleString('zh-CN');
                } else {
                    deleteInfo = '已过期';
                }
            }

            res.json({
                id: row.id,
                filename: row.filename,
                originalName: row.original_name,
                mimetype: row.mimetype,
                size: row.size,
                uploadDate: row.upload_date,
                downloadCount: row.download_count,
                deleteTime: row.delete_time,
                autoDelete: row.auto_delete,
                deleteInfo: deleteInfo,
                urls: {
                    info: `${baseUrl}/image/${row.id}`,
                    direct: `${baseUrl}/uploads/${row.filename}`,
                    html: `<img src="${baseUrl}/uploads/${row.filename}" alt="${row.original_name}">`,
                    markdown: `![${row.original_name}](${baseUrl}/uploads/${row.filename})`
                }
            });
        }
    );
        } catch (error) {
            console.error('获取图片信息错误:', error);
            res.status(500).json({ error: '服务器内部错误' });
        }
    }
);

// 图片信息页面（需要认证）
app.get('/image/:id', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'image.html'));
});

// 提供上传文件的访问（需要认证）
app.get('/uploads/:filename', 
    requireAuth,
    [
        param('filename')
            .isLength({ min: 1, max: 128 })
            .matches(/^[a-zA-Z0-9\-_\.]+$/)
            .withMessage('文件名格式无效')
    ],
    handleValidationErrors,
    (req, res) => {
        try {
    const filename = req.params.filename;
            
            // 验证文件路径安全性
            if (!isValidPath(filename)) {
                return res.status(400).json({ error: '无效的文件路径' });
            }
            
            const filePath = path.join(__dirname, 'uploads', filename);
            
            // 确保文件路径在uploads目录内
            const uploadsPath = path.resolve(__dirname, 'uploads');
            const resolvedFilePath = path.resolve(filePath);
            if (!resolvedFilePath.startsWith(uploadsPath)) {
                return res.status(403).json({ error: '访问被拒绝' });
            }
            
            // 检查文件是否存在
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: '文件不存在' });
            }
    
    // 增加下载计数
    db.run(
        'UPDATE images SET download_count = download_count + 1 WHERE filename = ?',
        [filename],
        (err) => {
            if (err) {
                console.error('更新下载计数失败:', err);
            }
        }
    );
    
            // 发送文件
            res.sendFile(filePath);
        } catch (error) {
            console.error('文件访问错误:', error);
            res.status(500).json({ error: '服务器内部错误' });
        }
    }
);

// 清理过期图片的函数
function cleanupExpiredImages() {
    const now = new Date().toISOString();
    
    db.all(
        'SELECT * FROM images WHERE auto_delete = 1 AND delete_time <= ?',
        [now],
        (err, rows) => {
            if (err) {
                console.error('查询过期图片失败:', err);
                return;
            }
            
            rows.forEach(row => {
                // 删除文件
                const filePath = path.join(uploadsDir, row.filename);
                fs.unlink(filePath, (unlinkErr) => {
                    if (unlinkErr && unlinkErr.code !== 'ENOENT') {
                        console.error(`删除文件失败 ${row.filename}:`, unlinkErr);
                    }
                });
                
                // 从数据库删除记录
                db.run('DELETE FROM images WHERE id = ?', [row.id], (deleteErr) => {
                    if (deleteErr) {
                        console.error(`删除数据库记录失败 ${row.id}:`, deleteErr);
                    } else {
                        console.log(`已清理过期图片: ${row.original_name} (${row.id})`);
                    }
                });
            });
            
            if (rows.length > 0) {
                console.log(`清理了 ${rows.length} 张过期图片`);
            }
        }
    );
}

// 同步数据库和文件系统
function syncDatabaseAndFiles() {
    // 获取数据库中的所有文件名
    db.all('SELECT filename FROM images', (err, rows) => {
        if (err) {
            console.error('查询数据库文件失败:', err);
            return;
        }
        
        const dbFiles = new Set(rows.map(row => row.filename));
        
        // 读取uploads文件夹中的文件
        fs.readdir(uploadsDir, (readErr, files) => {
            if (readErr) {
                console.error('读取uploads文件夹失败:', readErr);
                return;
            }
            
            // 查找孤儿文件（文件存在但数据库无记录）
            const orphanFiles = files.filter(file => !dbFiles.has(file));
            
            if (orphanFiles.length > 0) {
                console.log(`发现 ${orphanFiles.length} 个孤儿文件，正在清理...`);
                orphanFiles.forEach(file => {
                    const filePath = path.join(uploadsDir, file);
                    fs.unlink(filePath, (unlinkErr) => {
                        if (unlinkErr) {
                            console.error(`删除孤儿文件失败 ${file}:`, unlinkErr);
                        } else {
                            console.log(`已删除孤儿文件: ${file}`);
                        }
                    });
                });
            }
            
            // 查找数据库中存在但文件不存在的记录
            dbFiles.forEach(filename => {
                if (!files.includes(filename)) {
                    console.log(`发现数据库记录但文件不存在: ${filename}，删除数据库记录`);
                    db.run('DELETE FROM images WHERE filename = ?', [filename], (deleteErr) => {
                        if (deleteErr) {
                            console.error(`删除数据库记录失败 ${filename}:`, deleteErr);
                        } else {
                            console.log(`已删除数据库中的无效记录: ${filename}`);
                        }
                    });
                }
            });
        });
    });
}

// 启动服务器
app.listen(PORT, () => {
    console.log(`图床服务器运行在 http://localhost:${PORT}`);
    
    // 认证状态信息
    if (ENABLE_AUTH) {
        console.log('🔐 密码认证已启用');
        console.log(`📝 访问密码: ${AUTH_PASSWORD}`);
        console.log(`🔗 登录页面: http://localhost:${PORT}/login`);
    } else {
        console.log('🔓 密码认证已禁用，所有用户可直接访问');
    }
    
    // 存储配置信息
    if (ALLOW_PERMANENT_STORAGE) {
        console.log('♾️ 永久存储已启用，用户可选择永不删除选项');
    } else {
        console.log('⏱️ 永久存储已禁用，仅支持临时存储');
    }
    
    // 启动时同步数据库和文件系统
    setTimeout(() => {
        syncDatabaseAndFiles();
    }, 1000);
    
    // 启动时立即清理一次过期图片
    setTimeout(() => {
        cleanupExpiredImages();
    }, 2000);
    
    // 每分钟检查一次过期图片
    setInterval(cleanupExpiredImages, 60 * 1000);
    
    // 每小时同步一次数据库和文件系统
    setInterval(syncDatabaseAndFiles, 60 * 60 * 1000);
    
    console.log('自动清理功能已启动，每分钟检查一次过期图片');
    console.log('数据库同步功能已启动，每小时同步一次数据库和文件系统');
});

// 优雅关闭
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('关闭数据库连接时出错:', err.message);
        } else {
            console.log('数据库连接已关闭');
        }
        process.exit(0);
    });
}); 