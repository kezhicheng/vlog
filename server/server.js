import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import multer from 'multer';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult, query } from 'express-validator';
import rateLimit from 'express-rate-limit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'vlog-secret-key-change-in-production-' + Date.now();
const BCRYPT_ROUNDS = 10;

// ========== 数据库初始化 ==========
const dbPath = path.join(__dirname, 'data', 'vlog.db');
if (!fs.existsSync(path.dirname(dbPath))) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    avatar TEXT DEFAULT '',
    bio TEXT DEFAULT '这个人很懒，什么都没写~',
    location TEXT DEFAULT '未知',
    role TEXT DEFAULT 'user',
    createdAt TEXT DEFAULT (datetime('now', '+8 hours'))
  );
  CREATE TABLE IF NOT EXISTS vlogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    videoUrl TEXT DEFAULT '',
    images TEXT DEFAULT '[]',
    thumbnail TEXT DEFAULT '',
    privacy TEXT DEFAULT 'public',
    likes INTEGER DEFAULT 0,
    likedBy TEXT DEFAULT '[]',
    views INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now', '+8 hours')),
    FOREIGN KEY (userId) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    friendId INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    createdAt TEXT DEFAULT (datetime('now', '+8 hours'))
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    senderId INTEGER NOT NULL,
    receiverId INTEGER NOT NULL,
    content TEXT DEFAULT '',
    type TEXT DEFAULT 'text',
    read INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now', '+8 hours'))
  );
  CREATE TABLE IF NOT EXISTS visitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    visitorId INTEGER NOT NULL,
    visitedAt TEXT DEFAULT (datetime('now', '+8 hours'))
  );
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vlogId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    content TEXT NOT NULL,
    parentId INTEGER DEFAULT NULL,
    createdAt TEXT DEFAULT (datetime('now', '+8 hours'))
  );
  CREATE TABLE IF NOT EXISTS views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vlogId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    viewedAt TEXT DEFAULT (datetime('now', '+8 hours'))
  );
  CREATE TABLE IF NOT EXISTS albums (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    images TEXT DEFAULT '[]',
    createdAt TEXT DEFAULT (datetime('now', '+8 hours'))
  );
  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT DEFAULT '群聊',
    members TEXT DEFAULT '[]',
    createdBy INTEGER NOT NULL,
    announcement TEXT DEFAULT '',
    muteAll INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now', '+8 hours'))
  );
  CREATE TABLE IF NOT EXISTS group_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId INTEGER NOT NULL,
    senderId INTEGER NOT NULL,
    content TEXT DEFAULT '',
    type TEXT DEFAULT 'text',
    createdAt TEXT DEFAULT (datetime('now', '+8 hours')),
    FOREIGN KEY (groupId) REFERENCES groups(id)
  );
  CREATE TABLE IF NOT EXISTS group_join_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    inviterId INTEGER,
    status TEXT DEFAULT 'pending',
    createdAt TEXT DEFAULT (datetime('now', '+8 hours'))
  );
`);

// 迁移：groups 表新增字段
try { db.exec('ALTER TABLE groups ADD COLUMN admins TEXT DEFAULT \'[]\''); } catch {}
try { db.exec('ALTER TABLE groups ADD COLUMN joinType TEXT DEFAULT \'free\''); } catch {}
// 迁移：users 表新增字段
try { db.exec('ALTER TABLE users ADD COLUMN lastActiveAt TEXT'); } catch {}
try { db.exec('ALTER TABLE users ADD COLUMN phone TEXT'); } catch {}
try { db.exec('ALTER TABLE users ADD COLUMN musicUrl TEXT DEFAULT \'\''); } catch {}
try { db.exec('ALTER TABLE users ADD COLUMN musicEnabled INTEGER DEFAULT 1'); } catch {}
try { db.exec('ALTER TABLE users ADD COLUMN banned INTEGER DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE users ADD COLUMN bannedUntil TEXT'); } catch {}
try { db.exec('ALTER TABLE users ADD COLUMN banReason TEXT DEFAULT \'\''); } catch {}
// 迁移：vlogs & shares 增加 tags + 审核字段
try { db.exec('ALTER TABLE vlogs ADD COLUMN tags TEXT DEFAULT \'[]\''); } catch {}
try { db.exec('ALTER TABLE vlogs ADD COLUMN status TEXT DEFAULT \'normal\''); } catch {}
try { db.exec('ALTER TABLE vlogs ADD COLUMN reviewedBy INTEGER'); } catch {}
try { db.exec('ALTER TABLE vlogs ADD COLUMN pinnedAt TEXT'); } catch {}
try { db.exec('ALTER TABLE shares ADD COLUMN tags TEXT DEFAULT \'[]\''); } catch {}
try { db.exec('ALTER TABLE shares ADD COLUMN status TEXT DEFAULT \'normal\''); } catch {}
try { db.exec('ALTER TABLE shares ADD COLUMN reviewedBy INTEGER'); } catch {}
try { db.exec('ALTER TABLE shares ADD COLUMN pinnedAt TEXT'); } catch {}
try { db.exec("ALTER TABLE groups ADD COLUMN historyVisible INTEGER DEFAULT -1"); } catch {}

// ========== 通知表 ==========
db.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    type TEXT NOT NULL,
    content TEXT DEFAULT '',
    relatedId INTEGER,
    fromUserId INTEGER,
    read INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now', '+8 hours'))
  );
`);


// 分享评论 & 收藏表
db.exec(`
  CREATE TABLE IF NOT EXISTS share_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shareId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    content TEXT NOT NULL,
    createdAt TEXT DEFAULT (datetime('now', '+8 hours'))
  );
  CREATE TABLE IF NOT EXISTS share_favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shareId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    createdAt TEXT DEFAULT (datetime('now', '+8 hours'))
  );
`);

// 好物分享表
db.exec(`
  CREATE TABLE IF NOT EXISTS shares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    link TEXT DEFAULT '',
    linkTitle TEXT DEFAULT '',
    linkImage TEXT DEFAULT '',
    files TEXT DEFAULT '[]',
    images TEXT DEFAULT '[]',
    category TEXT DEFAULT 'other',
    likes INTEGER DEFAULT 0,
    likedBy TEXT DEFAULT '[]',
    views INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now', '+8 hours')),
    FOREIGN KEY (userId) REFERENCES users(id)
  );
`);

// 系统设置表 & 在线日志表
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS online_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    action TEXT NOT NULL,
    createdAt TEXT DEFAULT (datetime('now', '+8 hours'))
  );
`);
// 默认设置
db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run('registration_enabled', 'true');
db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run('site_name', 'Vlog Life');

// 举报、草稿、积分表
db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reporterId INTEGER NOT NULL,
    targetType TEXT NOT NULL,
    targetId INTEGER NOT NULL,
    reason TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    createdAt TEXT DEFAULT (datetime('now', '+8 hours'))
  );
  CREATE TABLE IF NOT EXISTS drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT DEFAULT '',
    data TEXT DEFAULT '{}',
    createdAt TEXT DEFAULT (datetime('now', '+8 hours')),
    updatedAt TEXT DEFAULT (datetime('now', '+8 hours'))
  );
  CREATE TABLE IF NOT EXISTS points_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL,
    reason TEXT DEFAULT '',
    fromUserId INTEGER,
    createdAt TEXT DEFAULT (datetime('now', '+8 hours'))
  );
`);

// 迁移旧数据
function migrateJsonToSQLite(jsonFile, table, columns, transform) {
  const file = path.join(__dirname, 'data', jsonFile);
  if (!fs.existsSync(file)) return;
  const count = db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get().c;
  if (count > 0) return;
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!data.length) return;
  console.log(`Migrating ${data.length} rows to ${table}...`);
  const placeholders = columns.map(() => '?').join(',');
  const insert = db.prepare(`INSERT OR IGNORE INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`);
  const migrate = db.transaction(() => {
    for (const row of data) {
      const vals = transform(row);
      if (vals) insert.run(...vals);
    }
  });
  migrate();
}

try {
  // 迁移用户
  migrateJsonToSQLite('users.json', 'users',
    ['id', 'username', 'email', 'password', 'avatar', 'bio', 'location', 'createdAt'],
    u => [parseInt(u.id) || 0, u.username, u.email, bcrypt.hashSync(u.password || '123456', BCRYPT_ROUNDS), u.avatar || '', u.bio || '', u.location || '未知', u.createdAt || new Date().toISOString()]
  );
  db.prepare("UPDATE users SET role='admin' WHERE email='285443286@qq.com'").run();

  // 迁移 vlogs
  migrateJsonToSQLite('vlogs.json', 'vlogs',
    ['id', 'userId', 'title', 'content', 'videoUrl', 'images', 'thumbnail', 'privacy', 'likes', 'likedBy', 'views', 'createdAt'],
    v => [parseInt(v.id) || 0, parseInt(v.userId) || 0, v.title || '', v.content || '', v.videoUrl || '', JSON.stringify(v.images || []), v.thumbnail || '', v.privacy || 'public', v.likes || 0, JSON.stringify(v.likedBy || []), v.views || 0, v.createdAt || new Date().toISOString()]
  );

  // 迁移好友
  migrateJsonToSQLite('friends.json', 'friends',
    ['id', 'userId', 'friendId', 'status', 'createdAt'],
    f => [parseInt(f.id) || 0, parseInt(f.userId) || 0, parseInt(f.friendId) || 0, f.status || 'pending', f.createdAt || new Date().toISOString()]
  );

  // 迁移评论
  migrateJsonToSQLite('comments.json', 'comments',
    ['id', 'vlogId', 'userId', 'content', 'parentId', 'createdAt'],
    c => [parseInt(c.id) || 0, parseInt(c.vlogId) || 0, parseInt(c.userId) || 0, c.content || '', c.parentId ? parseInt(c.parentId) : null, c.createdAt || new Date().toISOString()]
  );

  // 迁移消息
  migrateJsonToSQLite('messages.json', 'messages',
    ['id', 'senderId', 'receiverId', 'content', 'type', 'read', 'createdAt'],
    m => [parseInt(m.id) || 0, parseInt(m.senderId) || 0, parseInt(m.receiverId) || 0, m.content || '', m.type || 'text', m.read ? 1 : 0, m.createdAt || new Date().toISOString()]
  );

  // 迁移访客
  migrateJsonToSQLite('visitors.json', 'visitors',
    ['id', 'userId', 'visitorId', 'visitedAt'],
    v => [parseInt(v.id) || 0, parseInt(v.userId) || 0, parseInt(v.visitorId) || 0, v.visitedAt || new Date().toISOString()]
  );

  // 迁移浏览
  migrateJsonToSQLite('views.json', 'views',
    ['id', 'vlogId', 'userId', 'viewedAt'],
    v => [parseInt(v.id) || 0, parseInt(v.vlogId) || 0, parseInt(v.userId) || 0, v.viewedAt || new Date().toISOString()]
  );

  // 迁移相册
  migrateJsonToSQLite('albums.json', 'albums',
    ['id', 'userId', 'title', 'description', 'images', 'createdAt'],
    a => [parseInt(a.id) || 0, parseInt(a.userId) || 0, a.title || '', a.description || '', JSON.stringify(a.images || []), a.createdAt || new Date().toISOString()]
  );

  console.log('Migration complete.');
} catch (e) { console.log('Migration error:', e.message); }

// ========== 中间件 ==========
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// 速率限制（开发阶段关闭）
// const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { message: '请求太频繁，请稍后再试' } });
// const apiLimiter = rateLimit({ windowMs: 1 * 60 * 1000, max: 200, message: { message: '请求太频繁' } });
// app.use('/api/auth', authLimiter);
// app.use('/api', apiLimiter);

// JWT 认证中间件
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: '请先登录' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    // 检查是否被封号
    const u = db.prepare('SELECT banned, bannedUntil FROM users WHERE id=?').get(req.user.id);
    if (u && u.banned) {
      if (u.bannedUntil) {
        const until = new Date(u.bannedUntil);
        if (new Date() > until) {
          // 封禁到期自动解封
          db.prepare('UPDATE users SET banned=0, bannedUntil=NULL WHERE id=?').run(req.user.id);
        } else {
          return res.status(403).json({ message: `账号已被封禁至 ${u.bannedUntil}，解封后可继续使用` });
        }
      } else {
        return res.status(403).json({ message: '账号已被永久封禁' });
      }
    }
    next();
  } catch (e) {
    return res.status(401).json({ message: '登录已过期，请重新登录' });
  }
};

// 管理员中间件
const adminMiddleware = (req, res, next) => {
  const user = db.prepare('SELECT role FROM users WHERE id=?').get(req.user.id);
  if (!user || user.role !== 'admin') return res.status(403).json({ message: '需要管理员权限' });
  next();
};

// 验证错误处理
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  next();
};

// ========== 文件上传 ==========
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }  // 默认 500MB（管理员）
});

// 按角色限制上传大小
const uploadWithRoleLimit = (req, res, next) => {
  const user = db.prepare('SELECT email, role FROM users WHERE id=?').get(req.user?.id);
  const isSuperAdmin = user?.email === '285443286@qq.com';
  const isAdmin = user?.role === 'admin';

  let limit;
  if (isSuperAdmin) limit = Infinity;       // 超级管理员：无限制
  else if (isAdmin) limit = 500 * 1024 * 1024;  // 普通管理员：500MB
  else limit = 100 * 1024 * 1024;           // 普通用户：100MB

  const instance = multer({ storage, limits: { fileSize: limit } });
  return instance.array('file', 10)(req, res, next);
};

app.use('/uploads', express.static(uploadsDir));

// ========== 辅助 ==========
const userWithoutPassword = (u) => {
  if (!u) return null;
  const { password, ...rest } = u;
  return rest;
};

// 将 DB 中的 JSON 字符串字段解析为数组
const parseVlog = (v) => {
  if (!v) return v;
  return {
    ...v,
    images: safeParseJSON(v.images, []),
    likedBy: safeParseJSON(v.likedBy, []),
    tags: safeParseJSON(v.tags, []),
  };
};

const safeParseJSON = (str, fallback) => {
  try { return JSON.parse(str); } catch { return fallback; }
};

// ========== 认证 API ==========

// 注册
app.post('/api/auth/register', [
  body('username').trim().isLength({ min: 1, max: 30 }).withMessage('用户名1-30字符'),
  body('email').trim().notEmpty().withMessage('请输入邮箱或手机号'),
  body('password').isLength({ min: 6, max: 100 }).withMessage('密码至少6位'),
], validate, async (req, res) => {
  // 检查是否允许注册
  const regSetting = db.prepare("SELECT value FROM settings WHERE key='registration_enabled'").get();
  if (regSetting && regSetting.value !== 'true') {
    return res.status(403).json({ message: '管理员已关闭注册功能' });
  }
  const { username, email, password } = req.body;
  const isPhone = /^1[3-9]\d{9}$/.test(email);
  const actualEmail = isPhone ? (email + '@phone.user') : email;
  try {
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const result = db.prepare(`INSERT INTO users (username, email, password, phone, avatar, createdAt) VALUES (?, ?, ?, ?, ?, datetime('now', '+8 hours'))`).run(
      username, actualEmail, hash, isPhone ? email : null, `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`
    );
    const user = db.prepare('SELECT * FROM users WHERE id=?').get(result.lastInsertRowid);
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    // 记录登录和在线状态
    db.prepare("UPDATE users SET lastActiveAt=datetime('now', '+8 hours') WHERE id=?").run(user.id);
    db.prepare("INSERT INTO online_log (userId, action, createdAt) VALUES (?, 'login', datetime('now', '+8 hours'))").run(user.id);
    res.json({ user: userWithoutPassword(user), token });
  } catch (e) {
    console.error('Register error:', e.message, e.code);
    if (e.message && e.message.includes('UNIQUE')) return res.status(400).json({ message: '用户名或邮箱已存在' });
    res.status(500).json({ message: '注册失败: ' + e.message });
  }
});

// 登录
app.post('/api/auth/login', [
  body('email').trim().notEmpty().withMessage('请输入邮箱或手机号'),
  body('password').isLength({ min: 1 }).withMessage('请输入密码'),
], validate, (req, res) => {
  const { email, password } = req.body;
  const isPhone = /^1[3-9]\d{9}$/.test(email);
  const user = db.prepare(isPhone ? 'SELECT * FROM users WHERE phone=?' : 'SELECT * FROM users WHERE email=?').get(email);
  if (!user) return res.status(401).json({ message: '账号或密码错误' });
  if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ message: '账号或密码错误' });
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
  db.prepare("UPDATE users SET location=? WHERE id=?").run(user.location || '未知', user.id);
  // 记录登录和在线状态
  db.prepare("UPDATE users SET lastActiveAt=datetime('now', '+8 hours') WHERE id=?").run(user.id);
  db.prepare("INSERT INTO online_log (userId, action, createdAt) VALUES (?, 'login', datetime('now', '+8 hours'))").run(user.id);
  // 检查封禁状态
  if (user.banned) {
    if (user.bannedUntil && new Date() > new Date(user.bannedUntil)) {
      db.prepare('UPDATE users SET banned=0, bannedUntil=NULL WHERE id=?').run(user.id);
      user.banned = 0;
    }
  }
  res.json({ user: userWithoutPassword(user), token, banned: !!user.banned, banReason: user.banReason });
});

// ========== 用户 API ==========

// 在线用户列表（必须在 /api/users/:id 之前注册，否则 :id 会拦截 "online"）
app.get('/api/users/online', authMiddleware, (req, res) => {
  const users = db.prepare('SELECT id, username, avatar, lastActiveAt FROM users').all();
  const now = new Date();
  const online = users.filter(u => {
    if (!u.lastActiveAt) return false;
    return (now - new Date(u.lastActiveAt)) < 5 * 60 * 1000;
  }).map(({ lastActiveAt, ...u }) => u);
  res.json(online);
});

app.get('/api/users/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (!user) return res.status(404).json({ message: '用户不存在' });
  res.json(userWithoutPassword(user));
});

app.get('/api/users', authMiddleware, (req, res) => {
  const users = db.prepare('SELECT * FROM users').all();
  res.json(users.map(userWithoutPassword));
});

// 上传头像
app.post('/api/users/:id/avatar', authMiddleware, upload.single('avatar'), (req, res) => {
  if (req.user.id != req.params.id) return res.status(403).json({ message: '无权操作' });
  if (!req.file) return res.status(400).json({ message: '没有上传文件' });
  const avatar = `/uploads/${req.file.filename}`;
  db.prepare('UPDATE users SET avatar=? WHERE id=?').run(avatar, req.params.id);
  res.json(userWithoutPassword(db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id)));
});

// 更新用户信息
app.patch('/api/users/:id', authMiddleware, (req, res) => {
  if (req.user.id != req.params.id) return res.status(403).json({ message: '无权操作' });
  const { username, bio, phone, oldPassword, newPassword } = req.body;
  if (username) db.prepare('UPDATE users SET username=? WHERE id=?').run(username, req.params.id);
  if (bio !== undefined) db.prepare('UPDATE users SET bio=? WHERE id=?').run(bio, req.params.id);
  if (phone !== undefined) db.prepare('UPDATE users SET phone=? WHERE id=?').run(phone, req.params.id);
  // 修改密码（需验证旧密码）
  if (newPassword && newPassword.length >= 6) {
    const user = db.prepare('SELECT password FROM users WHERE id=?').get(req.params.id);
    if (!oldPassword || !bcrypt.compareSync(oldPassword, user.password)) {
      return res.status(400).json({ message: '旧密码不正确' });
    }
    db.prepare('UPDATE users SET password=? WHERE id=?').run(bcrypt.hashSync(newPassword, BCRYPT_ROUNDS), req.params.id);
  }
  res.json(userWithoutPassword(db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id)));
});

// ========== 管理员 API ==========

app.get('/api/admin/users', authMiddleware, adminMiddleware, (req, res) => {
  const users = db.prepare('SELECT id, username, email, role, avatar, bio, location, createdAt, banned, bannedUntil FROM users ORDER BY id DESC').all();
  res.json(users);
});

app.patch('/api/admin/users/:id/reset-password', authMiddleware, adminMiddleware, (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ message: '新密码至少6位' });
  const hash = bcrypt.hashSync(newPassword, BCRYPT_ROUNDS);
  db.prepare('UPDATE users SET password=? WHERE id=?').run(hash, req.params.id);
  res.json({ message: '密码已重置' });
});

app.patch('/api/admin/users/:id/role', authMiddleware, adminMiddleware, (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) return res.status(400).json({ message: '无效角色' });
  db.prepare('UPDATE users SET role=? WHERE id=?').run(role, req.params.id);
  res.json({ message: '角色已更新' });
});

app.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, (req, res) => {
  db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  res.json({ message: '用户已删除' });
});

// ========== Vlog API ==========

app.get('/api/vlogs', (req, res) => {
  const { userId } = req.query;
  let vlogs;
  if (userId) {
    const friendIds = db.prepare("SELECT friendId FROM friends WHERE userId=? AND status='accepted'").all(userId).map(r => r.friendId);
    vlogs = db.prepare('SELECT * FROM vlogs ORDER BY createdAt DESC').all().filter(v =>
      v.privacy === 'public' || v.userId == userId || (v.privacy === 'private' && friendIds.includes(v.userId))
    );
  } else {
    vlogs = db.prepare("SELECT * FROM vlogs WHERE privacy='public' ORDER BY createdAt DESC").all();
  }
  // 过滤违规 + 置顶排序
  vlogs = vlogs.map(parseVlog).filter(v => v.status !== 'violation');
  res.json(sortPinned(vlogs));
});

app.get('/api/vlogs/user/:userId', (req, res) => {
  const vlogs = db.prepare('SELECT * FROM vlogs WHERE userId=? ORDER BY createdAt DESC').all(req.params.userId);
  res.json(vlogs.map(parseVlog));
});

app.post('/api/vlogs', authMiddleware, (req, res) => {
  try {
    console.log('POST /api/vlogs body:', JSON.stringify(req.body).substring(0, 200));
    const { title, content, videoUrl, images, privacy, tags } = req.body;
    if (!title) return res.status(400).json({ message: '标题不能为空' });
    const result = db.prepare('INSERT INTO vlogs (userId, title, content, videoUrl, images, thumbnail, privacy, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      req.user.id, title, content || '', videoUrl || '', JSON.stringify(images || []),
      (images && images.length) ? images[0] : `https://picsum.photos/seed/${Date.now()}/800/450`, privacy || 'public', JSON.stringify(tags || [])
    );
    res.json(parseVlog(db.prepare('SELECT * FROM vlogs WHERE id=?').get(result.lastInsertRowid)));
  } catch (e) {
    console.error('Vlog create error:', e.message);
    res.status(500).json({ message: '创建失败: ' + e.message });
  }
});

app.get('/api/vlogs/:id', (req, res) => {
  const vlog = parseVlog(db.prepare('SELECT * FROM vlogs WHERE id=?').get(req.params.id));
  if (!vlog) return res.status(404).json({ message: 'Vlog不存在' });
  const author = userWithoutPassword(db.prepare('SELECT * FROM users WHERE id=?').get(vlog.userId));
  vlog.author = author;
  res.json(vlog);
});

// 编辑Vlog（仅作者）
app.patch('/api/vlogs/:id', authMiddleware, (req, res) => {
  const vlog = db.prepare('SELECT * FROM vlogs WHERE id=?').get(req.params.id);
  if (!vlog) return res.status(404).json({ message: 'Vlog不存在' });
  if (vlog.userId !== req.user.id) return res.status(403).json({ message: '无权编辑' });
  const { title, content, tags } = req.body;
  if (title !== undefined) db.prepare('UPDATE vlogs SET title=? WHERE id=?').run(title, req.params.id);
  if (content !== undefined) db.prepare('UPDATE vlogs SET content=? WHERE id=?').run(content, req.params.id);
  if (tags !== undefined) db.prepare('UPDATE vlogs SET tags=? WHERE id=?').run(JSON.stringify(tags), req.params.id);
  res.json(parseVlog(db.prepare('SELECT * FROM vlogs WHERE id=?').get(req.params.id)));
});

app.post('/api/vlogs/:id/like', authMiddleware, (req, res) => {
  const vlog = db.prepare('SELECT * FROM vlogs WHERE id=?').get(req.params.id);
  if (!vlog) return res.status(404).json({ message: 'Vlog不存在' });
  let likedBy = JSON.parse(vlog.likedBy || '[]');
  const idx = likedBy.indexOf(req.user.id);
  if (idx > -1) likedBy.splice(idx, 1); else { likedBy.push(req.user.id); createNotification(vlog.userId, 'like_vlog', '赞了你的Vlog', vlog.id, req.user.id); awardContentPoints(vlog.userId, 'like'); }
  db.prepare('UPDATE vlogs SET likedBy=?, likes=? WHERE id=?').run(JSON.stringify(likedBy), likedBy.length, req.params.id);
  res.json(parseVlog(db.prepare('SELECT * FROM vlogs WHERE id=?').get(req.params.id)));
});

app.get('/api/vlogs/:id/likes', (req, res) => {
  const vlog = parseVlog(db.prepare('SELECT * FROM vlogs WHERE id=?').get(req.params.id));
  if (!vlog) return res.status(404).json({ message: 'Vlog不存在' });
  const users = vlog.likedBy.map(id => userWithoutPassword(db.prepare('SELECT * FROM users WHERE id=?').get(id))).filter(Boolean);
  res.json(users);
});

app.post('/api/vlogs/:id/view', authMiddleware, (req, res) => {
  const vlog = db.prepare('SELECT * FROM vlogs WHERE id=?').get(req.params.id);
  if (!vlog || vlog.userId == req.user.id) return res.json({ success: true });
  const viewer = db.prepare('SELECT role FROM users WHERE id=?').get(req.user.id);
  if (!viewer || viewer.role !== 'admin') {
    db.prepare('UPDATE vlogs SET views=views+1 WHERE id=?').run(req.params.id);
    const today = new Date().toISOString().split('T')[0];
    const existing = db.prepare("SELECT id FROM views WHERE vlogId=? AND userId=? AND viewedAt LIKE ?").get(req.params.id, req.user.id, today + '%');
    if (!existing) db.prepare(`INSERT INTO views (vlogId, userId, viewedAt) VALUES (?, ?, datetime('now', '+8 hours'))`).run(req.params.id, req.user.id);
  }
  res.json({ success: true });
});

app.get('/api/vlogs/:id/views', (req, res) => {
  const vlog = db.prepare('SELECT * FROM vlogs WHERE id=?').get(req.params.id);
  if (!vlog) return res.status(404).json({ message: 'Vlog不存在' });
  const views = db.prepare('SELECT * FROM views WHERE vlogId=? AND userId!=? ORDER BY viewedAt DESC LIMIT 50').all(req.params.id, vlog.userId);
  res.json(views.map(v => ({ ...v, viewer: userWithoutPassword(db.prepare('SELECT * FROM users WHERE id=?').get(v.userId)) })).filter(v => v.viewer));
});

// ========== 评论 API ==========

app.get('/api/vlogs/:id/comments', (req, res) => {
  const comments = db.prepare('SELECT * FROM comments WHERE vlogId=? ORDER BY createdAt DESC').all(req.params.id);
  res.json(comments.map(c => ({ ...c, user: userWithoutPassword(db.prepare('SELECT * FROM users WHERE id=?').get(c.userId)) })).filter(c => c.user));
});

app.post('/api/vlogs/:id/comments', authMiddleware, (req, res) => {
  const vlog = db.prepare('SELECT * FROM vlogs WHERE id=?').get(req.params.id);
  const result = db.prepare('INSERT INTO comments (vlogId, userId, content, parentId) VALUES (?, ?, ?, ?)').run(
    req.params.id, req.user.id, req.body.content, req.body.parentId || null
  );
  if (vlog) { createNotification(vlog.userId, 'comment_vlog', '评论了你的Vlog', vlog.id, req.user.id); awardContentPoints(vlog.userId, 'comment'); }
  res.json(db.prepare('SELECT * FROM comments WHERE id=?').get(result.lastInsertRowid));
});

app.delete('/api/vlogs/:vlogId/comments/:commentId', authMiddleware, (req, res) => {
  const comment = db.prepare('SELECT * FROM comments WHERE id=?').get(req.params.commentId);
  if (!comment) return res.status(404).json({ message: '评论不存在' });
  const vlog = db.prepare('SELECT * FROM vlogs WHERE id=?').get(req.params.vlogId);
  if (comment.userId != req.user.id && vlog.userId != req.user.id) return res.status(403).json({ message: '无权删除' });
  db.prepare('DELETE FROM comments WHERE id=?').run(req.params.commentId);
  res.json({ success: true });
});

// ========== 好友 API ==========

app.get('/api/friends/:userId', (req, res) => {
  const friends = db.prepare("SELECT friendId FROM friends WHERE userId=? AND status='accepted'").all(req.params.userId);
  res.json(friends.map(f => {
    const u = db.prepare('SELECT * FROM users WHERE id=?').get(f.friendId);
    if (!u) return null;
    const userData = userWithoutPassword(u);
    userData.banned = !!u.banned;
    userData.bannedUntil = u.bannedUntil;
    userData.banReason = u.banReason;
    return userData;
  }).filter(Boolean));
});

app.get('/api/friends/requests/:userId', (req, res) => {
  const requests = db.prepare("SELECT * FROM friends WHERE friendId=? AND status='pending'").all(req.params.userId);
  res.json(requests.map(r => ({ ...r, user: userWithoutPassword(db.prepare('SELECT * FROM users WHERE id=?').get(r.userId)) })).filter(r => r.user));
});

app.post('/api/friends', authMiddleware, (req, res) => {
  const { friendId } = req.body;
  const existing = db.prepare('SELECT * FROM friends WHERE (userId=? AND friendId=?) OR (userId=? AND friendId=?)').get(req.user.id, friendId, friendId, req.user.id);
  if (existing) {
    // 如果是拉黑状态，删除黑名单记录后重新添加
    if (existing.status === 'blocked') {
      db.prepare('DELETE FROM friends WHERE id=?').run(existing.id);
    } else {
      return res.status(400).json({ message: '已经是好友或已发送请求' });
    }
  }
  const result = db.prepare('INSERT INTO friends (userId, friendId, status) VALUES (?, ?, ?)').run(req.user.id, friendId, 'pending');
  createNotification(friendId, 'friend_request', '请求添加你为好友', result.lastInsertRowid, req.user.id);
  res.json(db.prepare('SELECT * FROM friends WHERE id=?').get(result.lastInsertRowid));
});

app.patch('/api/friends/:id/accept', authMiddleware, (req, res) => {
  const friend = db.prepare('SELECT * FROM friends WHERE id=?').get(req.params.id);
  if (!friend || friend.friendId != req.user.id) return res.status(404).json({ message: '请求不存在' });
  // 清除双方之间任何 blocked 记录
  db.prepare("DELETE FROM friends WHERE ((userId=? AND friendId=?) OR (userId=? AND friendId=?)) AND status='blocked'").run(friend.userId, friend.friendId, friend.friendId, friend.userId);
  // 接受请求
  db.prepare("UPDATE friends SET status='accepted' WHERE id=?").run(req.params.id);
  db.prepare('INSERT OR IGNORE INTO friends (userId, friendId, status) VALUES (?, ?, ?)').run(friend.friendId, friend.userId, 'accepted');
  createNotification(friend.userId, 'friend_accept', '接受了你的好友请求', friend.id, req.user.id);
  res.json({ success: true });
});

// ========== 私信 API ==========

app.get('/api/messages/:userId', authMiddleware, (req, res) => {
  const msgs = db.prepare('SELECT * FROM messages WHERE senderId=? OR receiverId=? ORDER BY createdAt').all(req.params.userId, req.params.userId);
  const conversations = {};
  msgs.forEach(m => {
    const other = m.senderId == req.params.userId ? m.receiverId : m.senderId;
    (conversations[other] = conversations[other] || []).push(m);
  });
  const result = Object.entries(conversations).map(([otherId, msgs]) => ({
    user: userWithoutPassword(db.prepare('SELECT * FROM users WHERE id=?').get(otherId)),
    messages: msgs,
    unread: msgs.filter(m => m.receiverId == req.params.userId && !m.read).length,
    lastMessage: msgs[msgs.length - 1]
  })).sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));
  res.json(result);
});

app.post('/api/messages', authMiddleware, (req, res) => {
  const { receiverId, content, type = 'text' } = req.body;
  const isFriend = db.prepare("SELECT id FROM friends WHERE ((userId=? AND friendId=?) OR (userId=? AND friendId=?)) AND status='accepted'").get(req.user.id, receiverId, receiverId, req.user.id)
    || db.prepare("SELECT id FROM friends WHERE userId=? AND friendId=? AND status='accepted'").get(req.user.id, receiverId)
    || db.prepare("SELECT id FROM friends WHERE userId=? AND friendId=? AND status='accepted'").get(receiverId, req.user.id);
  const prevCount = db.prepare('SELECT COUNT(*) as c FROM messages WHERE senderId=? AND receiverId=?').get(req.user.id, receiverId).c;
  if (!isFriend && prevCount >= 1) return res.status(403).json({ message: '非好友只能发送一条消息' });
  const maxLen = isFriend ? 999 : 99;
  if (content.length > maxLen) return res.status(400).json({ message: `消息不能超过${maxLen}字` });
  const result = db.prepare('INSERT INTO messages (senderId, receiverId, content, type) VALUES (?, ?, ?, ?)').run(req.user.id, receiverId, content, type);
  res.json(db.prepare('SELECT * FROM messages WHERE id=?').get(result.lastInsertRowid));
});

app.post('/api/messages/upload', authMiddleware, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: '没有上传文件' });
  res.json({ imageUrl: `/uploads/${req.file.filename}` });
});

app.patch('/api/messages/read', authMiddleware, (req, res) => {
  db.prepare('UPDATE messages SET read=1 WHERE senderId=? AND receiverId=?').run(req.body.otherId, req.user.id);
  res.json({ success: true });
});

// ========== 相册 & 访客 & 推荐 ==========

app.get('/api/albums/:userId', (req, res) => {
  const albums = db.prepare('SELECT * FROM albums WHERE userId=? ORDER BY createdAt DESC').all(req.params.userId);
  res.json(albums.map(a => ({ ...a, images: safeParseJSON(a.images, []) })));
});

app.post('/api/albums', authMiddleware, upload.array('images', 20), (req, res) => {
  const images = (req.files || []).map(f => `/uploads/${f.filename}`);
  const result = db.prepare('INSERT INTO albums (userId, title, description, images) VALUES (?, ?, ?, ?)').run(req.user.id, req.body.title, req.body.description || '', JSON.stringify(images));
  const album = db.prepare('SELECT * FROM albums WHERE id=?').get(result.lastInsertRowid);
  res.json({ ...album, images: safeParseJSON(album.images, []) });
});

// 删除相册
app.delete('/api/albums/:id', authMiddleware, (req, res) => {
  const album = db.prepare('SELECT * FROM albums WHERE id=?').get(req.params.id);
  if (!album) return res.status(404).json({ message: '相册不存在' });
  if (album.userId !== req.user.id) return res.status(403).json({ message: '无权删除' });
  db.prepare('DELETE FROM albums WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

app.post('/api/visitors', (req, res) => {
  const { userId, visitorId } = req.body;
  if (userId == visitorId) return res.json({ success: true });
  const today = new Date().toISOString().split('T')[0];
  const existing = db.prepare("SELECT id FROM visitors WHERE userId=? AND visitorId=? AND visitedAt LIKE ?").get(userId, visitorId, today + '%');
  if (!existing) db.prepare(`INSERT INTO visitors (userId, visitorId, visitedAt) VALUES (?, ?, datetime('now', '+8 hours'))`).run(userId, visitorId);
  res.json({ success: true });
});

app.get('/api/visitors/:userId', (req, res) => {
  const visitors = db.prepare('SELECT * FROM visitors WHERE userId=? ORDER BY visitedAt DESC LIMIT 50').all(req.params.userId);
  res.json(visitors.map(v => ({ ...v, visitor: userWithoutPassword(db.prepare('SELECT * FROM users WHERE id=?').get(v.visitorId)) })).filter(v => v.visitor));
});

// ========== 文件上传 ==========
app.post('/api/upload', upload.fields([{ name: 'video', maxCount: 1 }, { name: 'images', maxCount: 10 }]), (req, res) => {
  const result = {};
  if (req.files.video?.[0]) result.videoUrl = `/uploads/${req.files.video[0].filename}`;
  if (req.files.images?.length) result.images = req.files.images.map(f => `/uploads/${f.filename}`);
  res.json(result);
});

// ========== 好友管理 ==========

// 删除好友
app.delete('/api/friends/:userId/:friendId', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM friends WHERE userId=? AND friendId=?').run(req.params.userId, req.params.friendId);
  db.prepare('DELETE FROM friends WHERE userId=? AND friendId=?').run(req.params.friendId, req.params.userId);
  res.json({ success: true });
});

// 拉黑用户
app.post('/api/friends/block', authMiddleware, (req, res) => {
  const { blockerId, blockedId } = req.body;
  // 删除好友关系
  db.prepare('DELETE FROM friends WHERE (userId=? AND friendId=?) OR (userId=? AND friendId=?)').run(blockerId, blockedId, blockedId, blockerId);
  // 拉黑
  const existing = db.prepare('SELECT id FROM friends WHERE userId=? AND friendId=? AND status=?').get(blockerId, blockedId, 'blocked');
  if (!existing) db.prepare('INSERT INTO friends (userId, friendId, status) VALUES (?, ?, ?)').run(blockerId, blockedId, 'blocked');
  res.json({ success: true });
});

// 取消拉黑
app.post('/api/friends/unblock', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM friends WHERE userId=? AND friendId=? AND status=?').run(req.body.blockerId, req.body.blockedId, 'blocked');
  res.json({ success: true });
});

// 获取黑名单
app.get('/api/friends/blocked/:userId', authMiddleware, (req, res) => {
  const blocked = db.prepare("SELECT friendId FROM friends WHERE userId=? AND status='blocked'").all(req.params.userId);
  res.json(blocked.map(b => userWithoutPassword(db.prepare('SELECT * FROM users WHERE id=?').get(b.friendId))).filter(Boolean));
});

// ========== 群聊 API ==========

// 辅助：检查是否为群管理员
const isGroupAdmin = (group, userId) => {
  const admins = safeParseJSON(group.admins, []);
  return group.createdBy === userId || admins.includes(userId);
};

// 创建群聊
app.post('/api/groups', authMiddleware, (req, res) => {
  const { name, memberIds } = req.body;
  const allMembers = [...new Set([req.user.id, ...(memberIds || [])])];
  const result = db.prepare('INSERT INTO groups (name, members, createdBy, admins, joinType, createdAt) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))').run(
    name || '群聊', JSON.stringify(allMembers), req.user.id, '[]', 'free'
  );
  res.json({ id: result.lastInsertRowid, name: name || '群聊', members: allMembers, createdBy: req.user.id, admins: [], joinType: 'free' });
});

// 获取群聊列表
app.get('/api/groups/:userId', authMiddleware, (req, res) => {
  const groups = db.prepare('SELECT * FROM groups').all()
    .filter(g => JSON.parse(g.members || '[]').includes(parseInt(req.params.userId)))
    .map(g => ({
      ...g,
      members: JSON.parse(g.members || '[]'),
      admins: safeParseJSON(g.admins, []),
      memberUsers: JSON.parse(g.members || '[]').map(id => userWithoutPassword(db.prepare('SELECT * FROM users WHERE id=?').get(id))).filter(Boolean),
    }));
  res.json(groups);
});

// 发送群消息
app.post('/api/groups/:id/messages', authMiddleware, (req, res) => {
  const g = db.prepare('SELECT * FROM groups WHERE id=?').get(req.params.id);
  if (!g) return res.status(404).json({ message: '群不存在' });
  if (g.muteAll && g.createdBy !== req.user.id) return res.status(403).json({ message: '全员禁言中，仅群主可发言' });
  const { content, type = 'text' } = req.body;
  db.prepare("INSERT INTO group_messages (groupId, senderId, content, type, createdAt) VALUES (?, ?, ?, ?, datetime('now', '+8 hours'))").run(req.params.id, req.user.id, content, type);
  res.json({ success: true });
});

// 获取群成员
app.get('/api/groups/:id/members', authMiddleware, (req, res) => {
  const g = db.prepare('SELECT * FROM groups WHERE id=?').get(req.params.id);
  if (!g) return res.status(404).json({ message: '群不存在' });
  const memberIds = JSON.parse(g.members || '[]');
  const admins = safeParseJSON(g.admins, []);
  res.json(memberIds.map(id => {
    const u = userWithoutPassword(db.prepare('SELECT * FROM users WHERE id=?').get(id));
    if (!u) return null;
    return { ...u, isOwner: g.createdBy === id, isAdmin: admins.includes(id) };
  }).filter(Boolean));
});

// 踢人（群主和管理员）
app.post('/api/groups/:id/kick', authMiddleware, (req, res) => {
  const g = db.prepare('SELECT * FROM groups WHERE id=?').get(req.params.id);
  if (!g) return res.status(404).json({ message: '群不存在' });
  if (!isGroupAdmin(g, req.user.id)) return res.status(403).json({ message: '仅群主/管理员可踢人' });
  if (req.body.userId === g.createdBy) return res.status(403).json({ message: '不能踢出群主' });
  const members = JSON.parse(g.members || '[]').filter(id => id !== req.body.userId);
  // 同时从 admins 中移除
  let admins = safeParseJSON(g.admins, []).filter(id => id !== req.body.userId);
  db.prepare('UPDATE groups SET members=?, admins=? WHERE id=?').run(JSON.stringify(members), JSON.stringify(admins), req.params.id);
  res.json({ success: true });
});

// 修改群信息（群主和管理员）
app.patch('/api/groups/:id', authMiddleware, (req, res) => {
  const g = db.prepare('SELECT * FROM groups WHERE id=?').get(req.params.id);
  if (!g) return res.status(404).json({ message: '群不存在' });
  if (!isGroupAdmin(g, req.user.id)) return res.status(403).json({ message: '仅群主/管理员可修改' });
  const { name, announcement, joinType, historyVisible } = req.body;
  if (name !== undefined) db.prepare('UPDATE groups SET name=? WHERE id=?').run(name, req.params.id);
  if (announcement !== undefined) db.prepare('UPDATE groups SET announcement=? WHERE id=?').run(announcement, req.params.id);
  if (historyVisible !== undefined) db.prepare('UPDATE groups SET historyVisible=? WHERE id=?').run(historyVisible, req.params.id);
  if (joinType !== undefined) db.prepare('UPDATE groups SET joinType=? WHERE id=?').run(joinType, req.params.id);
  const updated = db.prepare('SELECT * FROM groups WHERE id=?').get(req.params.id);
  res.json({ ...updated, members: JSON.parse(updated.members || '[]'), admins: safeParseJSON(updated.admins, []) });
});

// 全员禁言切换（群主和管理员）
app.post('/api/groups/:id/mute-all', authMiddleware, (req, res) => {
  const g = db.prepare('SELECT * FROM groups WHERE id=?').get(req.params.id);
  if (!g) return res.status(404).json({ message: '群不存在' });
  if (!isGroupAdmin(g, req.user.id)) return res.status(403).json({ message: '仅群主/管理员可操作' });
  const muted = g.muteAll ? 0 : 1;
  db.prepare('UPDATE groups SET muteAll=? WHERE id=?').run(muted, req.params.id);
  res.json({ muteAll: !!muted });
});

// 获取群消息
app.get('/api/groups/:id/messages', authMiddleware, (req, res) => {
  const msgs = db.prepare('SELECT * FROM group_messages WHERE groupId=? ORDER BY createdAt').all(req.params.id);
  res.json(msgs.map(m => ({ ...m, sender: m.senderId ? userWithoutPassword(db.prepare('SELECT * FROM users WHERE id=?').get(m.senderId)) : null })));
});

// ========== 群聊邀请与入群审批 ==========

// 邀请好友入群
app.post('/api/groups/:id/invite', authMiddleware, (req, res) => {
  const g = db.prepare('SELECT * FROM groups WHERE id=?').get(req.params.id);
  if (!g) return res.status(404).json({ message: '群不存在' });
  const members = JSON.parse(g.members || '[]');
  if (!members.includes(req.user.id)) return res.status(403).json({ message: '你不是群成员' });

  const { userIds } = req.body; // 邀请的用户ID数组
  const joinType = g.joinType || 'free';
  const admins = safeParseJSON(g.admins, []);

  const results = [];
  for (const uid of (userIds || [])) {
    if (members.includes(uid)) continue;
    if (joinType === 'free') {
      // 免审批：直接入群
      members.push(uid);
      const newUser = db.prepare('SELECT username FROM users WHERE id=?').get(uid);
      db.prepare("INSERT INTO group_messages (groupId, senderId, content, type, createdAt) VALUES (?, 0, ?, 'system', datetime('now', '+8 hours'))").run(req.params.id, '欢迎 ' + (newUser?.username || '新成员') + ' 加入群聊 🎉');
      results.push({ userId: uid, status: 'joined' });
    } else {
      // 需要审批：创建入群申请
      const existing = db.prepare("SELECT id FROM group_join_requests WHERE groupId=? AND userId=? AND status='pending'").get(req.params.id, uid);
      if (!existing) {
        db.prepare('INSERT INTO group_join_requests (groupId, userId, inviterId, status, createdAt) VALUES (?, ?, ?, ?, datetime(\'now\'))').run(req.params.id, uid, req.user.id, 'pending');
      }
      results.push({ userId: uid, status: 'pending' });
    }
  }
  db.prepare('UPDATE groups SET members=? WHERE id=?').run(JSON.stringify(members), req.params.id);
  res.json({ results, joinType });
});

// 申请入群（非成员主动申请）
app.post('/api/groups/:id/join', authMiddleware, (req, res) => {
  const g = db.prepare('SELECT * FROM groups WHERE id=?').get(req.params.id);
  if (!g) return res.status(404).json({ message: '群不存在' });
  const members = JSON.parse(g.members || '[]');
  if (members.includes(req.user.id)) return res.status(400).json({ message: '你已在群中' });

  const joinType = g.joinType || 'free';
  if (joinType === 'free') {
    members.push(req.user.id);
    db.prepare('UPDATE groups SET members=? WHERE id=?').run(JSON.stringify(members), req.params.id);
    return res.json({ status: 'joined' });
  }

  const existing = db.prepare("SELECT id FROM group_join_requests WHERE groupId=? AND userId=? AND status='pending'").get(req.params.id, req.user.id);
  if (existing) return res.status(400).json({ message: '已有待处理的申请' });

  db.prepare('INSERT INTO group_join_requests (groupId, userId, inviterId, status, createdAt) VALUES (?, ?, NULL, ?, datetime(\'now\'))').run(req.params.id, req.user.id, 'pending');
  res.json({ status: 'pending' });
});

// 获取入群申请列表
app.get('/api/groups/:id/join-requests', authMiddleware, (req, res) => {
  const g = db.prepare('SELECT * FROM groups WHERE id=?').get(req.params.id);
  if (!g) return res.status(404).json({ message: '群不存在' });
  if (!isGroupAdmin(g, req.user.id)) return res.status(403).json({ message: '仅群主/管理员可查看' });

  const requests = db.prepare("SELECT * FROM group_join_requests WHERE groupId=? AND status='pending' ORDER BY createdAt DESC").all(req.params.id);
  res.json(requests.map(r => ({
    ...r,
    user: userWithoutPassword(db.prepare('SELECT * FROM users WHERE id=?').get(r.userId)),
    inviter: r.inviterId ? userWithoutPassword(db.prepare('SELECT * FROM users WHERE id=?').get(r.inviterId)) : null,
  })).filter(r => r.user));
});

// 审批入群申请
app.post('/api/groups/:id/join-requests/:requestId', authMiddleware, (req, res) => {
  const g = db.prepare('SELECT * FROM groups WHERE id=?').get(req.params.id);
  if (!g) return res.status(404).json({ message: '群不存在' });
  if (!isGroupAdmin(g, req.user.id)) return res.status(403).json({ message: '仅群主/管理员可审批' });

  const { action } = req.body; // 'approve' | 'reject'
  const request = db.prepare('SELECT * FROM group_join_requests WHERE id=? AND groupId=?').get(req.params.requestId, req.params.id);
  if (!request) return res.status(404).json({ message: '申请不存在' });

  if (action === 'approve') {
    const members = JSON.parse(g.members || '[]');
    if (!members.includes(request.userId)) {
      members.push(request.userId);
      db.prepare('UPDATE groups SET members=? WHERE id=?').run(JSON.stringify(members), req.params.id);
      const newUser = db.prepare('SELECT username FROM users WHERE id=?').get(request.userId);
      db.prepare("INSERT INTO group_messages (groupId, senderId, content, type, createdAt) VALUES (?, 0, ?, 'system', datetime('now', '+8 hours'))").run(req.params.id, '欢迎 ' + (newUser?.username || '新成员') + ' 加入群聊 🎉');
    }
  }
  db.prepare('UPDATE group_join_requests SET status=? WHERE id=?').run(action === 'approve' ? 'approved' : 'rejected', req.params.requestId);
  res.json({ success: true });
});

// 获取用户的入群申请通知（所有群的待处理申请数量）
app.get('/api/groups/join-requests/pending/:userId', authMiddleware, (req, res) => {
  const adminGroups = db.prepare('SELECT * FROM groups').all().filter(g => {
    const admins = safeParseJSON(g.admins, []);
    return g.createdBy === parseInt(req.params.userId) || admins.includes(parseInt(req.params.userId));
  });
  let total = 0;
  for (const g of adminGroups) {
    const count = db.prepare("SELECT COUNT(*) as c FROM group_join_requests WHERE groupId=? AND status='pending'").get(g.id).c;
    total += count;
  }
  res.json({ count: total });
});

// ========== 群管理员 API ==========

// 设置/取消管理员（仅群主）
app.post('/api/groups/:id/admins', authMiddleware, (req, res) => {
  const g = db.prepare('SELECT * FROM groups WHERE id=?').get(req.params.id);
  if (!g) return res.status(404).json({ message: '群不存在' });
  if (g.createdBy !== req.user.id) return res.status(403).json({ message: '仅群主可设置管理员' });

  const { userId, action } = req.body; // 'add' | 'remove'
  let admins = safeParseJSON(g.admins, []);
  if (action === 'add') {
    if (!admins.includes(userId)) admins.push(userId);
  } else {
    admins = admins.filter(id => id !== userId);
  }
  db.prepare('UPDATE groups SET admins=? WHERE id=?').run(JSON.stringify(admins), req.params.id);
  res.json({ admins });
});

// ========== 推荐 API ==========

app.get('/api/recommendations/:userId', (req, res) => {
  const { userId } = req.params;
  const allVlogs = db.prepare('SELECT * FROM vlogs ORDER BY createdAt DESC').all().map(parseVlog);
  const vlogs = allVlogs;
  const friendIds = db.prepare("SELECT friendId FROM friends WHERE userId=? AND status='accepted'").all(userId).map(r => r.friendId);

  const userLikedVlogs = vlogs.filter(v => {
    return v.likedBy.includes(parseInt(userId));
  });

  // 相似用户
  const similarUsers = new Set();
  userLikedVlogs.forEach(v => {
    v.likedBy.forEach(uid => {
      if (uid !== parseInt(userId) && !friendIds.includes(uid)) similarUsers.add(uid);
    });
  });

  // 个性化推荐
  const personalizedVlogs = vlogs.filter(v => {
    if (v.userId === parseInt(userId)) return false;
    if (v.privacy === 'private' && !friendIds.includes(v.userId)) return false;
    return Array.from(similarUsers).some(uid => v.likedBy.includes(uid));
  }).slice(0, 10);

  // 热门
  const trendingVlogs = vlogs.filter(v => {
    if (v.userId === parseInt(userId)) return false;
    if (v.privacy === 'private' && !friendIds.includes(v.userId)) return false;
    return true;
  }).sort((a, b) => ((b.likes || 0) * 2 + (b.views || 0)) - ((a.likes || 0) * 2 + (a.views || 0))).slice(0, 10);

  // 推荐好友
  const potentialFriends = [];
  friendIds.forEach(fid => {
    const fof = db.prepare("SELECT friendId FROM friends WHERE userId=? AND status='accepted' AND friendId!=?").all(fid, parseInt(userId));
    fof.forEach(f => {
      if (!friendIds.includes(f.friendId) && f.friendId !== parseInt(userId)) {
        const existing = potentialFriends.find(p => p.userId === f.friendId);
        if (existing) existing.mutualFriends++; else {
          const u = db.prepare('SELECT * FROM users WHERE id=?').get(f.friendId);
          if (u) {
            const { password, ...rest } = u;
            potentialFriends.push({ ...rest, userId: f.friendId, mutualFriends: 1 });
          }
        }
      }
    });
  });
  potentialFriends.sort((a, b) => b.mutualFriends - a.mutualFriends);

  res.json({ personalizedVlogs, trendingVlogs: trendingVlogs.map(v => ({ ...v })), suggestedUsers: potentialFriends.slice(0, 10) });
});

// ========== 系统设置 API ==========

// 获取设置
app.get('/api/settings', (req, res) => {
  const rows = db.prepare('SELECT * FROM settings').all();
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  res.json(settings);
});

// 公开获取站点名称
app.get('/api/site-name', (req, res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key='site_name'").get();
  res.json({ name: row?.value || 'Vlog Life' });
});

// 更新设置（仅管理员）
app.patch('/api/admin/settings', authMiddleware, adminMiddleware, (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ message: '缺少key参数' });
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
  res.json({ success: true });
});

// ========== 在线状态追踪 ==========

// 记录登录
app.post('/api/users/:id/login', authMiddleware, (req, res) => {
  db.prepare("INSERT INTO online_log (userId, action, createdAt) VALUES (?, 'login', datetime('now', '+8 hours'))").run(req.params.id);
  db.prepare("UPDATE users SET lastActiveAt=datetime('now', '+8 hours') WHERE id=?").run(req.params.id);
  res.json({ success: true });
});

// 记录登出（立即清空 lastActiveAt 以显示离线）
app.post('/api/users/:id/logout', authMiddleware, (req, res) => {
  db.prepare("INSERT INTO online_log (userId, action, createdAt) VALUES (?, 'logout', datetime('now', '+8 hours'))").run(req.params.id);
  db.prepare("UPDATE users SET lastActiveAt=NULL WHERE id=?").run(req.params.id);
  res.json({ success: true });
});

// 更新活跃时间（心跳）
app.post('/api/users/:id/heartbeat', authMiddleware, (req, res) => {
  db.prepare("UPDATE users SET lastActiveAt=datetime('now', '+8 hours') WHERE id=?").run(req.params.id);
  res.json({ success: true });
});

// 获取所有用户在线状态（管理员）
app.get('/api/admin/users/online-status', authMiddleware, adminMiddleware, (req, res) => {
  const users = db.prepare('SELECT id, username, email, avatar, role, lastActiveAt, createdAt, banned, bannedUntil FROM users ORDER BY id DESC').all();
  const now = new Date();
  const result = users.map(u => {
    const lastActive = u.lastActiveAt ? new Date(u.lastActiveAt) : null;
    const isOnline = lastActive && (now - lastActive) < 5 * 60 * 1000; // 5分钟内活跃视为在线
    const loginLogs = db.prepare("SELECT * FROM online_log WHERE userId=? ORDER BY createdAt DESC LIMIT 50").all(u.id);
    let totalOnlineMs = 0;
    let sessionStart = null;
    for (const log of [...loginLogs].reverse()) {
      if (log.action === 'login') sessionStart = new Date(log.createdAt);
      else if (log.action === 'logout' && sessionStart) {
        totalOnlineMs += new Date(log.createdAt) - sessionStart;
        sessionStart = null;
      }
    }
    if (sessionStart && lastActive) totalOnlineMs += now - sessionStart;
    const totalHours = Math.floor(totalOnlineMs / 3600000);
    const totalMinutes = Math.floor((totalOnlineMs % 3600000) / 60000);
    return {
      ...u,
      isOnline,
      onlineDuration: `${totalHours}小时${totalMinutes}分钟`,
      lastActiveAt: u.lastActiveAt || null,
      loginCount: loginLogs.filter(l => l.action === 'login').length,
      recentLogs: loginLogs.slice(0, 10),
    };
  });
  res.json(result);
});

// ========== 管理员手动创建用户 ==========
app.post('/api/admin/users', authMiddleware, adminMiddleware, [
  body('username').trim().isLength({ min: 1, max: 30 }).withMessage('用户名1-30字符'),
  body('email').trim().isEmail().withMessage('邮箱格式不正确'),
  body('password').isLength({ min: 6, max: 100 }).withMessage('密码至少6位'),
], validate, async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const result = db.prepare("INSERT INTO users (username, email, password, avatar, createdAt) VALUES (?, ?, ?, ?, datetime('now', '+8 hours'))").run(
      username, email, hash, `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`
    );
    const user = db.prepare('SELECT * FROM users WHERE id=?').get(result.lastInsertRowid);
    res.json(userWithoutPassword(user));
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE')) return res.status(400).json({ message: '用户名或邮箱已存在' });
    res.status(500).json({ message: '创建失败: ' + e.message });
  }
});

// 管理员编辑用户信息
app.patch('/api/admin/users/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { username, email, bio, location, role, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (!user) return res.status(404).json({ message: '用户不存在' });
  if (username) db.prepare('UPDATE users SET username=? WHERE id=?').run(username, req.params.id);
  if (email) db.prepare('UPDATE users SET email=? WHERE id=?').run(email, req.params.id);
  if (bio !== undefined) db.prepare('UPDATE users SET bio=? WHERE id=?').run(bio, req.params.id);
  if (location !== undefined) db.prepare('UPDATE users SET location=? WHERE id=?').run(location, req.params.id);
  if (role) db.prepare('UPDATE users SET role=? WHERE id=?').run(role, req.params.id);
  if (password && password.length >= 6) {
    const hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
    db.prepare('UPDATE users SET password=? WHERE id=?').run(hash, req.params.id);
  }
  res.json(userWithoutPassword(db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id)));
});

// 检查是否开启注册
app.get('/api/auth/registration-status', (req, res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key='registration_enabled'").get();
  res.json({ enabled: row ? row.value === 'true' : true });
});

// ========== 好物分享 API ==========

const parseShare = (s) => {
  if (!s) return s;
  return {
    ...s,
    images: safeParseJSON(s.images, []),
    files: safeParseJSON(s.files, []),
    likedBy: safeParseJSON(s.likedBy, []),
    tags: safeParseJSON(s.tags, []),
  };
};

// 获取分享列表
app.get('/api/shares', (req, res) => {
  const shares = db.prepare('SELECT * FROM shares ORDER BY createdAt DESC').all().map(parseShare).filter(s => s.status !== 'violation');
  res.json(sortPinned(shares).map(s => ({
    ...s,
    favorites: db.prepare('SELECT COUNT(*) as c FROM share_favorites WHERE shareId=?').get(s.id).c,
    author: userWithoutPassword(db.prepare('SELECT * FROM users WHERE id=?').get(s.userId))
  })).filter(s => s.author));
});

// 获取单个分享
app.get('/api/shares/:id', (req, res) => {
  const share = parseShare(db.prepare('SELECT * FROM shares WHERE id=?').get(req.params.id));
  if (!share) return res.status(404).json({ message: '分享不存在' });
  share.author = userWithoutPassword(db.prepare('SELECT * FROM users WHERE id=?').get(share.userId));
  share.favorites = db.prepare('SELECT COUNT(*) as c FROM share_favorites WHERE shareId=?').get(share.id).c;
  res.json(share);
});

// 编辑分享（仅作者）
app.patch('/api/shares/:id', authMiddleware, (req, res) => {
  const share = db.prepare('SELECT * FROM shares WHERE id=?').get(req.params.id);
  if (!share) return res.status(404).json({ message: '分享不存在' });
  if (share.userId !== req.user.id) return res.status(403).json({ message: '无权编辑' });
  const { title, content, link, linkTitle, tags, category } = req.body;
  if (title !== undefined) db.prepare('UPDATE shares SET title=? WHERE id=?').run(title, req.params.id);
  if (content !== undefined) db.prepare('UPDATE shares SET content=? WHERE id=?').run(content, req.params.id);
  if (link !== undefined) db.prepare('UPDATE shares SET link=? WHERE id=?').run(link, req.params.id);
  if (linkTitle !== undefined) db.prepare('UPDATE shares SET linkTitle=? WHERE id=?').run(linkTitle, req.params.id);
  if (tags !== undefined) db.prepare('UPDATE shares SET tags=? WHERE id=?').run(JSON.stringify(tags), req.params.id);
  if (category !== undefined) db.prepare('UPDATE shares SET category=? WHERE id=?').run(category, req.params.id);
  res.json(parseShare(db.prepare('SELECT * FROM shares WHERE id=?').get(req.params.id)));
});

// 获取用户的分享
app.get('/api/shares/user/:userId', (req, res) => {
  const shares = db.prepare('SELECT * FROM shares WHERE userId=? ORDER BY createdAt DESC').all(req.params.userId);
  res.json(shares.map(parseShare).map(s => ({
    ...s,
    favorites: db.prepare('SELECT COUNT(*) as c FROM share_favorites WHERE shareId=?').get(s.id).c,
    author: userWithoutPassword(db.prepare('SELECT * FROM users WHERE id=?').get(s.userId))
  })).filter(s => s.author));
});

// 上传分享附件（按角色限大小：超管无限制 / 管理员500MB / 用户100MB）
app.post('/api/shares/upload', authMiddleware, (req, res, next) => {
  uploadWithRoleLimit(req, res, (err) => {
    if (err) {
      console.error('上传错误:', err.message);
      return res.status(400).json({ message: '上传失败: ' + (err.message || '文件太大') });
    }
    const urls = (req.files || []).map(f => ({
      name: f.originalname,
      url: `/uploads/${f.filename}`,
      size: f.size
    }));
    res.json(urls);
  });
});

// 创建分享（JSON body）
app.post('/api/shares', authMiddleware, (req, res) => {
  try {
    console.log('POST /api/shares body:', JSON.stringify(req.body).substring(0, 300));
    const { title, content, link, linkTitle, images, files, category, tags } = req.body;
    if (!title) return res.status(400).json({ message: '标题不能为空' });
    const result = db.prepare(`INSERT INTO shares (userId, title, content, link, linkTitle, linkImage, files, images, category, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      req.user.id, title, content || '', link || '', linkTitle || '', '',
      JSON.stringify(files || []), JSON.stringify(images || []), category || 'other', JSON.stringify(tags || [])
    );
    console.log('Insert OK, id:', result.lastInsertRowid);
    const share = parseShare(db.prepare('SELECT * FROM shares WHERE id=?').get(result.lastInsertRowid));
    share.author = userWithoutPassword(db.prepare('SELECT * FROM users WHERE id=?').get(share.userId));
    res.json(share);
  } catch (e) {
    console.error('创建分享失败:', e.message, e.stack);
    res.status(500).json({ message: '创建失败: ' + e.message });
  }
});

// 点赞
app.post('/api/shares/:id/like', authMiddleware, (req, res) => {
  const share = db.prepare('SELECT * FROM shares WHERE id=?').get(req.params.id);
  if (!share) return res.status(404).json({ message: '分享不存在' });
  let likedBy = JSON.parse(share.likedBy || '[]');
  const idx = likedBy.indexOf(req.user.id);
  if (idx > -1) likedBy.splice(idx, 1); else { likedBy.push(req.user.id); createNotification(share.userId, 'like_share', '赞了你的分享', share.id, req.user.id); awardContentPoints(share.userId, 'like'); }
  db.prepare('UPDATE shares SET likedBy=?, likes=? WHERE id=?').run(JSON.stringify(likedBy), likedBy.length, req.params.id);
  res.json(parseShare(db.prepare('SELECT * FROM shares WHERE id=?').get(req.params.id)));
});

// 浏览计数
app.post('/api/shares/:id/view', authMiddleware, (req, res) => {
  const viewer = db.prepare('SELECT role FROM users WHERE id=?').get(req.user.id);
  if (!viewer || viewer.role !== 'admin') {
    db.prepare('UPDATE shares SET views=views+1 WHERE id=?').run(req.params.id);
  }
  res.json({ success: true });
});

// 删除分享
app.delete('/api/shares/:id', authMiddleware, (req, res) => {
  const share = db.prepare('SELECT * FROM shares WHERE id=?').get(req.params.id);
  if (!share) return res.status(404).json({ message: '分享不存在' });
  if (share.userId !== req.user.id) return res.status(403).json({ message: '无权删除' });
  db.prepare('DELETE FROM shares WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ========== 分享评论 ==========

app.get('/api/shares/:id/comments', (req, res) => {
  const comments = db.prepare('SELECT * FROM share_comments WHERE shareId=? ORDER BY createdAt DESC').all(req.params.id);
  res.json(comments.map(c => ({
    ...c,
    user: userWithoutPassword(db.prepare('SELECT * FROM users WHERE id=?').get(c.userId))
  })).filter(c => c.user));
});

app.post('/api/shares/:id/comments', authMiddleware, (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ message: '评论不能为空' });
  const share = db.prepare('SELECT * FROM shares WHERE id=?').get(req.params.id);
  const result = db.prepare('INSERT INTO share_comments (shareId, userId, content) VALUES (?, ?, ?)').run(req.params.id, req.user.id, content);
  if (share) { createNotification(share.userId, 'comment_share', '评论了你的分享', share.id, req.user.id); awardContentPoints(share.userId, 'comment'); }
  const comment = db.prepare('SELECT * FROM share_comments WHERE id=?').get(result.lastInsertRowid);
  comment.user = userWithoutPassword(db.prepare('SELECT * FROM users WHERE id=?').get(comment.userId));
  res.json(comment);
});

app.delete('/api/shares/:shareId/comments/:commentId', authMiddleware, (req, res) => {
  const comment = db.prepare('SELECT * FROM share_comments WHERE id=?').get(req.params.commentId);
  if (!comment) return res.status(404).json({ message: '评论不存在' });
  const share = db.prepare('SELECT * FROM shares WHERE id=?').get(req.params.shareId);
  if (comment.userId !== req.user.id && (!share || share.userId !== req.user.id))
    return res.status(403).json({ message: '无权删除' });
  db.prepare('DELETE FROM share_comments WHERE id=?').run(req.params.commentId);
  res.json({ success: true });
});

// ========== 分享收藏 ==========

app.get('/api/shares/:id/favorite', authMiddleware, (req, res) => {
  const fav = db.prepare('SELECT id FROM share_favorites WHERE shareId=? AND userId=?').get(req.params.id, req.user.id);
  res.json({ favorited: !!fav });
});

app.get('/api/shares/favorites/:userId', (req, res) => {
  const favs = db.prepare('SELECT shareId FROM share_favorites WHERE userId=? ORDER BY createdAt DESC').all(req.params.userId);
  const shares = favs.map(f => {
    const s = parseShare(db.prepare('SELECT * FROM shares WHERE id=?').get(f.shareId));
    if (!s) return null;
    s.author = userWithoutPassword(db.prepare('SELECT * FROM users WHERE id=?').get(s.userId));
    s.favorites = db.prepare('SELECT COUNT(*) as c FROM share_favorites WHERE shareId=?').get(s.id).c;
    return s;
  }).filter(Boolean);
  res.json(shares);
});

app.post('/api/shares/:id/favorite', authMiddleware, (req, res) => {
  const existing = db.prepare('SELECT id FROM share_favorites WHERE shareId=? AND userId=?').get(req.params.id, req.user.id);
  if (existing) {
    db.prepare('DELETE FROM share_favorites WHERE id=?').run(existing.id);
    res.json({ favorited: false });
  } else {
    db.prepare('INSERT INTO share_favorites (shareId, userId) VALUES (?, ?)').run(req.params.id, req.user.id);
    res.json({ favorited: true });
  }
});

// ========== 通知辅助函数 ==========
const createNotification = (userId, type, content, relatedId, fromUserId) => {
  if (userId === fromUserId) return; // 不给自己发通知
  db.prepare('INSERT INTO notifications (userId, type, content, relatedId, fromUserId) VALUES (?, ?, ?, ?, ?)').run(userId, type, content, relatedId, fromUserId);
};

// ========== 通知 API ==========
app.get('/api/notifications', authMiddleware, (req, res) => {
  const list = db.prepare('SELECT * FROM notifications WHERE userId=? ORDER BY createdAt DESC LIMIT 100').all(req.user.id);
  const unread = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE userId=? AND read=0').get(req.user.id).c;
  res.json({
    list: list.map(n => ({
      ...n,
      fromUser: n.fromUserId ? userWithoutPassword(db.prepare('SELECT * FROM users WHERE id=?').get(n.fromUserId)) : null
    })),
    unread
  });
});

app.patch('/api/notifications/read', authMiddleware, (req, res) => {
  const { id } = req.body;
  if (id) {
    db.prepare('UPDATE notifications SET read=1 WHERE id=? AND userId=?').run(id, req.user.id);
  } else {
    db.prepare('UPDATE notifications SET read=1 WHERE userId=?').run(req.user.id);
  }
  res.json({ success: true });
});

// ========== 标签 API ==========

// 获取所有标签（含计数）
app.get('/api/tags', (req, res) => {
  const tagMap = new Map();
  const addTags = (tagsStr) => {
    const tags = safeParseJSON(tagsStr, []);
    tags.forEach(t => { if (t) tagMap.set(t, (tagMap.get(t) || 0) + 1); });
  };
  db.prepare("SELECT tags FROM vlogs WHERE tags IS NOT NULL AND tags != '[]'").all().forEach(r => addTags(r.tags));
  db.prepare("SELECT tags FROM shares WHERE tags IS NOT NULL AND tags != '[]'").all().forEach(r => addTags(r.tags));
  const sorted = [...tagMap.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  res.json(sorted);
});

// 按标签获取内容
app.get('/api/tags/:tag', (req, res) => {
  const tag = req.params.tag;
  const vlogs = db.prepare('SELECT * FROM vlogs ORDER BY createdAt DESC').all()
    .filter(v => (safeParseJSON(v.tags, [])).some(t => t === tag))
    .map(parseVlog).map(v => ({ ...v, author: userWithoutPassword(db.prepare('SELECT * FROM users WHERE id=?').get(v.userId)), type: 'vlog' })).filter(v => v.author);
  const shares = db.prepare('SELECT * FROM shares ORDER BY createdAt DESC').all()
    .filter(s => (safeParseJSON(s.tags, [])).some(t => t === tag))
    .map(parseShare).map(s => ({ ...s, author: userWithoutPassword(db.prepare('SELECT * FROM users WHERE id=?').get(s.userId)), type: 'share' })).filter(s => s.author);
  const all = [...vlogs, ...shares].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ tag, items: all, total: all.length });
});

// ========== 搜索 API ==========
app.get('/api/search', (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 1) return res.json({ users: [], vlogs: [], shares: [] });
  const like = `%${q}%`;
  const users = db.prepare('SELECT * FROM users WHERE username LIKE ? OR email LIKE ? OR bio LIKE ? LIMIT 20').all(like, like, like).map(userWithoutPassword);
  const vlogs = db.prepare("SELECT * FROM vlogs WHERE (title LIKE ? OR content LIKE ? OR tags LIKE ?) AND privacy='public' LIMIT 20").all(like, like, like).map(parseVlog).map(v => ({ ...v, author: userWithoutPassword(db.prepare('SELECT * FROM users WHERE id=?').get(v.userId)) })).filter(v => v.author);
  const shares = db.prepare('SELECT * FROM shares WHERE title LIKE ? OR content LIKE ? OR tags LIKE ? LIMIT 20').all(like, like, like).map(parseShare).map(s => ({ ...s, author: userWithoutPassword(db.prepare('SELECT * FROM users WHERE id=?').get(s.userId)) })).filter(s => s.author);
  res.json({ users, vlogs, shares });
});

// ========== 好友动态 Feed ==========
app.get('/api/feed/:userId', authMiddleware, (req, res) => {
  const friends = db.prepare("SELECT friendId FROM friends WHERE userId=? AND status='accepted'").all(req.params.userId).map(r => r.friendId);
  const ids = [parseInt(req.params.userId), ...friends];

  // 好友最新 vlogs（公开 + 好友私密）
  const vlogs = db.prepare('SELECT * FROM vlogs ORDER BY createdAt DESC').all()
    .filter(v => ids.includes(v.userId) && (v.privacy === 'public' || friends.includes(v.userId)))
    .slice(0, 30).map(parseVlog)
    .map(v => ({ ...v, author: userWithoutPassword(db.prepare('SELECT * FROM users WHERE id=?').get(v.userId)), itemType: 'vlog' })).filter(v => v.author);

  // 好友最新分享
  const shares = db.prepare('SELECT * FROM shares ORDER BY createdAt DESC').all()
    .filter(s => ids.includes(s.userId))
    .slice(0, 30).map(parseShare)
    .map(s => ({ ...s, author: userWithoutPassword(db.prepare('SELECT * FROM users WHERE id=?').get(s.userId)), itemType: 'share' })).filter(s => s.author);

  const allMixed = [...vlogs, ...shares].filter(i => i.status !== 'violation').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const all = sortPinned(allMixed).slice(0, 50);
  res.json(all);
});

// ========== 封号管理 API ==========

// 封禁用户
app.post('/api/admin/users/:id/ban', authMiddleware, adminMiddleware, (req, res) => {
  const { duration, reason } = req.body; // duration: '3d','7d','30d','forever'
  let bannedUntil = null;
  if (duration === '3d') bannedUntil = new Date(Date.now() + 3*86400000).toISOString();
  else if (duration === '7d') bannedUntil = new Date(Date.now() + 7*86400000).toISOString();
  else if (duration === '30d') bannedUntil = new Date(Date.now() + 30*86400000).toISOString();
  else if (duration === '365d') bannedUntil = new Date(Date.now() + 365*86400000).toISOString();
  else if (duration === '1095d') bannedUntil = new Date(Date.now() + 1095*86400000).toISOString();
  db.prepare('UPDATE users SET banned=1, bannedUntil=?, banReason=? WHERE id=?').run(bannedUntil, reason || '', req.params.id);
  res.json({ success: true });
});

// 解封用户
app.post('/api/admin/users/:id/unban', authMiddleware, adminMiddleware, (req, res) => {
  db.prepare('UPDATE users SET banned=0, bannedUntil=NULL, banReason=\'\' WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ========== 内容审核 API ==========

// 获取审核列表（vlogs + shares）
app.get('/api/admin/review', authMiddleware, adminMiddleware, (req, res) => {
  const vlogs = db.prepare('SELECT * FROM vlogs ORDER BY createdAt DESC').all().map(parseVlog).map(v => ({
    ...v, type: 'vlog',
    author: userWithoutPassword(db.prepare('SELECT * FROM users WHERE id=?').get(v.userId))
  })).filter(v => v.author);
  const shares = db.prepare('SELECT * FROM shares ORDER BY createdAt DESC').all().map(parseShare).map(s => ({
    ...s, type: 'share',
    author: userWithoutPassword(db.prepare('SELECT * FROM users WHERE id=?').get(s.userId))
  })).filter(s => s.author);
  const all = [...vlogs, ...shares].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(all);
});

// 审核操作
app.post('/api/admin/review/:type/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { action } = req.body; // 'normal' | 'violation' | 'pin'
  const { type, id } = req.params;
  const table = type === 'vlog' ? 'vlogs' : 'shares';
  if (action === 'pin') {
    db.prepare(`UPDATE ${table} SET status='pin', reviewedBy=?, pinnedAt=datetime('now','+8 hours') WHERE id=?`).run(req.user.id, id);
  } else {
    db.prepare(`UPDATE ${table} SET status=?, reviewedBy=? WHERE id=?`).run(action, req.user.id, id);
  }
  res.json({ success: true });
});

// 置顶排序：3小时内按置顶时间，超时按人气（浏览*1 + 点赞*5 + 评论*10 + 收藏*10）
const sortPinned = (items) => {
  const now = new Date();
  const getPopularity = (item) => {
    const views = item.views || 0;
    const likes = item.likes || 0;
    const comments = (item.type === 'vlog')
      ? (db.prepare('SELECT COUNT(*) as c FROM comments WHERE vlogId=?').get(item.id)?.c || 0)
      : (db.prepare('SELECT COUNT(*) as c FROM share_comments WHERE shareId=?').get(item.id)?.c || 0);
    const favorites = db.prepare('SELECT COUNT(*) as c FROM share_favorites WHERE shareId=?').get(item.id)?.c || 0;
    return views + likes * 5 + comments * 10 + favorites * 10;
  };
  const pinned = items.filter(i => i.status === 'pin');
  const normal = items.filter(i => i.status !== 'pin');
  pinned.sort((a, b) => {
    const aNew = a.pinnedAt && (now - new Date(a.pinnedAt)) < 3 * 3600000;
    const bNew = b.pinnedAt && (now - new Date(b.pinnedAt)) < 3 * 3600000;
    if (aNew && !bNew) return -1;
    if (!aNew && bNew) return 1;
    if (aNew && bNew) return new Date(b.pinnedAt) - new Date(a.pinnedAt);
    return getPopularity(b) - getPopularity(a);
  });
  // 非置顶按人气排
  normal.sort((a, b) => getPopularity(b) - getPopularity(a));
  return [...pinned, ...normal];
};

// ========== 举报 API ==========
app.post('/api/reports', authMiddleware, (req, res) => {
  const { targetType, targetId, reason } = req.body;
  db.prepare('INSERT INTO reports (reporterId, targetType, targetId, reason) VALUES (?, ?, ?, ?)').run(req.user.id, targetType, targetId, reason || '');
  res.json({ success: true });
});

app.get('/api/admin/reports', authMiddleware, adminMiddleware, (req, res) => {
  const list = db.prepare('SELECT * FROM reports ORDER BY createdAt DESC LIMIT 100').all();
  res.json(list.map(r => ({
    ...r,
    reporter: userWithoutPassword(db.prepare('SELECT * FROM users WHERE id=?').get(r.reporterId))
  })).filter(r => r.reporter));
});

app.patch('/api/admin/reports/:id', authMiddleware, adminMiddleware, (req, res) => {
  db.prepare('UPDATE reports SET status=? WHERE id=?').run(req.body.status, req.params.id);
  res.json({ success: true });
});

// ========== 草稿 API ==========
app.get('/api/drafts/:userId', authMiddleware, (req, res) => {
  const drafts = db.prepare('SELECT * FROM drafts WHERE userId=? ORDER BY updatedAt DESC').all(req.params.userId);
  res.json(drafts.map(d => ({ ...d, data: safeParseJSON(d.data, {}) })));
});

app.post('/api/drafts', authMiddleware, (req, res) => {
  const { type, title, data } = req.body;
  const result = db.prepare('INSERT INTO drafts (userId, type, title, data) VALUES (?, ?, ?, ?)').run(req.user.id, type, title || '', JSON.stringify(data || {}));
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/drafts/:id', authMiddleware, (req, res) => {
  const { title, data } = req.body;
  db.prepare("UPDATE drafts SET title=?, data=?, updatedAt=datetime('now','+8 hours') WHERE id=? AND userId=?").run(title || '', JSON.stringify(data || {}), req.params.id, req.user.id);
  res.json({ success: true });
});

app.delete('/api/drafts/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM drafts WHERE id=? AND userId=?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

// ========== 积分 API ==========
const addPoints = (userId, amount, type, reason, fromUserId) => {
  db.prepare('INSERT INTO points_log (userId, amount, type, reason, fromUserId) VALUES (?, ?, ?, ?, ?)').run(userId, amount, type, reason || '', fromUserId || null);
  db.prepare('UPDATE users SET points=points+? WHERE id=?').run(amount, userId);
};

app.get('/api/points/:userId', (req, res) => {
  const user = db.prepare('SELECT points FROM users WHERE id=?').get(req.params.userId);
  const logs = db.prepare('SELECT * FROM points_log WHERE userId=? ORDER BY createdAt DESC LIMIT 50').all(req.params.userId);
  res.json({ points: user?.points || 0, logs: logs.map(l => ({ ...l, fromUser: l.fromUserId ? userWithoutPassword(db.prepare('SELECT * FROM users WHERE id=?').get(l.fromUserId)) : null })) });
});

app.post('/api/points/tip', authMiddleware, (req, res) => {
  const { toUserId, amount, contentId, contentType } = req.body;
  const amt = parseInt(amount) || 0;
  if (amt <= 0 || amt > (req.user.points || db.prepare('SELECT points FROM users WHERE id=?').get(req.user.id)?.points || 0)) {
    return res.status(400).json({ message: '积分不足' });
  }
  if (toUserId === req.user.id) return res.status(400).json({ message: '不能给自己打赏' });
  addPoints(req.user.id, -amt, 'tip_sent', `打赏给用户`, toUserId);
  addPoints(toUserId, amt, 'tip_received', `收到打赏`, req.user.id);
  res.json({ success: true });
});

app.get('/api/points/leaderboard', (req, res) => {
  const top = db.prepare('SELECT id, username, avatar, points FROM users WHERE points > 0 ORDER BY points DESC LIMIT 20').all().map(userWithoutPassword);
  res.json(top);
});

// 自动积分：每日首次登录 +5
app.post('/api/points/daily', authMiddleware, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const existing = db.prepare("SELECT id FROM points_log WHERE userId=? AND type='daily_login' AND createdAt LIKE ?").get(req.user.id, today + '%');
  if (!existing) {
    addPoints(req.user.id, 5, 'daily_login', '每日签到');
    res.json({ earned: 5, message: '签到成功 +5积分' });
  } else {
    res.json({ earned: 0, message: '今日已签到' });
  }
});

// 内容被点赞/评论时给作者积分（在like/comment端点中触发）
const awardContentPoints = (authorId, type) => {
  if (type === 'like') addPoints(authorId, 1, 'content_liked', '内容被点赞');
  if (type === 'comment') addPoints(authorId, 2, 'content_commented', '内容被评论');
};

// ========== 分享转发（通过私信） ==========
app.post('/api/share-content', authMiddleware, (req, res) => {
  const { receiverId, content } = req.body;
  db.prepare('INSERT INTO messages (senderId, receiverId, content, type) VALUES (?, ?, ?, ?)').run(req.user.id, receiverId, content, 'text');
  res.json({ success: true });
});

// ========== 背景音乐 API ==========
app.post('/api/users/:id/music', authMiddleware, upload.single('music'), (req, res) => {
  if (req.user.id != req.params.id) return res.status(403).json({ message: '无权操作' });
  if (!req.file) return res.status(400).json({ message: '没有上传文件' });
  const url = '/uploads/' + req.file.filename;
  db.prepare('UPDATE users SET musicUrl=?, musicEnabled=1 WHERE id=?').run(url, req.params.id);
  res.json({ musicUrl: url });
});

app.patch('/api/users/:id/music-toggle', authMiddleware, (req, res) => {
  if (req.user.id != req.params.id) return res.status(403).json({ message: '无权操作' });
  const user = db.prepare('SELECT musicEnabled FROM users WHERE id=?').get(req.params.id);
  db.prepare('UPDATE users SET musicEnabled=? WHERE id=?').run(user.musicEnabled ? 0 : 1, req.params.id);
  res.json({ musicEnabled: !user.musicEnabled });
});

// ========== 资源文件管理（管理员） ==========
app.get('/api/admin/files', authMiddleware, adminMiddleware, (req, res) => {
  const dir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(dir)) return res.json([]);
  const files = fs.readdirSync(dir).map(f => {
    const stat = fs.statSync(path.join(dir, f));
    return { name: f, size: stat.size, mtime: stat.mtime.toISOString(), url: '/uploads/' + f };
  }).sort((a, b) => new Date(b.mtime) - new Date(a.mtime));
  res.json(files);
});

app.delete('/api/admin/files/:name', authMiddleware, adminMiddleware, (req, res) => {
  const filepath = path.join(__dirname, 'uploads', req.params.name);
  if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
  res.json({ success: true });
});

// ========== 管理员删除消息 ==========
app.delete('/api/admin/messages/:id', authMiddleware, adminMiddleware, (req, res) => {
  db.prepare('DELETE FROM messages WHERE id=?').run(req.params.id);
  res.json({ success: true });
});
app.delete('/api/admin/group-messages/:id', authMiddleware, adminMiddleware, (req, res) => {
  db.prepare('DELETE FROM group_messages WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ========== 全局错误处理 ==========
app.use((err, req, res, next) => {
  console.error('Server error:', err.message || err);
  res.status(500).json({ message: '服务器错误: ' + (err.message || '未知错误') });
});

// ========== 托管前端静态文件（生产模式） ==========
const frontendDist = path.join(__dirname, '..', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  // SPA fallback：所有非 API 请求返回 index.html
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(frontendDist, 'index.html'));
    }
  });
  console.log('Frontend static files served from dist/');
}

// ========== 启动 ==========
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Other users: http://<本机IP>:${PORT}`);
});
