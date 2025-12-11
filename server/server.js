import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import multer from 'multer';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

// 配置文件上传
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 配置multer存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB限制
  },
  fileFilter: (req, file, cb) => {
    // 允许的文件类型
    const allowedTypes = /jpeg|jpg|png|gif|mp4|avi|mov|wmv|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只支持图片和视频文件'));
    }
  }
});

// 提供静态文件访问
app.use('/uploads', express.static(uploadsDir));

// 数据文件路径
const dataDir = path.join(__dirname, 'data');
const usersFile = path.join(dataDir, 'users.json');
const vlogsFile = path.join(dataDir, 'vlogs.json');
const friendsFile = path.join(dataDir, 'friends.json');
const messagesFile = path.join(dataDir, 'messages.json');
const visitorsFile = path.join(dataDir, 'visitors.json');
const commentsFile = path.join(dataDir, 'comments.json');
const viewsFile = path.join(dataDir, 'views.json');
const albumsFile = path.join(dataDir, 'albums.json');

// 确保数据目录存在
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 初始化数据文件
const initFile = (file, defaultData) => {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(defaultData, null, 2));
  }
};

initFile(usersFile, []);
initFile(vlogsFile, []);
initFile(friendsFile, []);
initFile(messagesFile, []);
initFile(visitorsFile, []);
initFile(commentsFile, []);
initFile(viewsFile, []);
initFile(albumsFile, []);

// 读取数据
const readData = (file) => {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
};

// 写入数据
const writeData = (file, data) => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

// 获取IP归属地
const getIpLocation = async (ip) => {
  try {
    let targetIp = ip;

    // 如果是本地IP，获取真实的公网IP
    if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost' || ip.startsWith('::ffff:127.')) {
      try {
        // 使用ipify获取真实公网IP
        const ipResponse = await axios.get('https://api.ipify.org?format=json');
        targetIp = ipResponse.data.ip;
      } catch (error) {
        console.error('获取公网IP失败:', error.message);
        // 如果获取失败，使用默认值
        return '未知 · 中国';
      }
    }

    // 使用免费的IP查询API
    const response = await axios.get(`http://ip-api.com/json/${targetIp}?lang=zh-CN&fields=status,country,regionName,city`);

    if (response.data.status === 'success') {
      const { country, regionName, city } = response.data;
      return `${city || regionName} · ${country}`;
    }

    return '未知';
  } catch (error) {
    console.error('IP查询失败:', error.message);
    return '未知';
  }
};

// ==================== 用户相关API ====================

// 注册
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  const users = readData(usersFile);

  if (users.find(u => u.username === username)) {
    return res.status(400).json({ message: '用户名已存在' });
  }

  if (users.find(u => u.email === email)) {
    return res.status(400).json({ message: '邮箱已被注册' });
  }

  // 获取用户IP
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;
  const location = await getIpLocation(ip);

  const newUser = {
    id: Date.now().toString(),
    username,
    email,
    password,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
    bio: '这个人很懒，什么都没写~',
    location,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  writeData(usersFile, users);

  const { password: _, ...userWithoutPassword } = newUser;
  res.json({ user: userWithoutPassword, token: newUser.id });
});

// 登录
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const users = readData(usersFile);

  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ message: '邮箱或密码错误' });
  }

  // 更新用户IP归属地
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;
  const location = await getIpLocation(ip);

  const userIndex = users.findIndex(u => u.id === user.id);
  users[userIndex].location = location;
  writeData(usersFile, users);

  const { password: _, ...userWithoutPassword } = users[userIndex];
  res.json({ user: userWithoutPassword, token: user.id });
});

// 获取用户信息
app.get('/api/users/:id', (req, res) => {
  const users = readData(usersFile);
  const user = users.find(u => u.id === req.params.id);

  if (!user) {
    return res.status(404).json({ message: '用户不存在' });
  }

  const { password, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

// 获取所有用户（用于查找好友）
app.get('/api/users', (req, res) => {
  const users = readData(usersFile);
  const usersWithoutPassword = users.map(({ password, ...user }) => user);
  res.json(usersWithoutPassword);
});

// 上传头像
app.post('/api/users/:id/avatar', upload.single('avatar'), (req, res) => {
  try {
    const { id } = req.params;
    const users = readData(usersFile);
    const userIndex = users.findIndex(u => u.id === id);

    if (userIndex === -1) {
      return res.status(404).json({ message: '用户不存在' });
    }

    if (req.file) {
      users[userIndex].avatar = `/uploads/${req.file.filename}`;
      writeData(usersFile, users);

      const { password, ...userWithoutPassword } = users[userIndex];
      res.json(userWithoutPassword);
    } else {
      res.status(400).json({ message: '没有上传文件' });
    }
  } catch (error) {
    res.status(500).json({ message: '上传失败', error: error.message });
  }
});

// 更新用户信息
app.patch('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const { username, bio } = req.body;
  const users = readData(usersFile);

  const userIndex = users.findIndex(u => u.id === id);
  if (userIndex === -1) {
    return res.status(404).json({ message: '用户不存在' });
  }

  if (username) users[userIndex].username = username;
  if (bio !== undefined) users[userIndex].bio = bio;

  writeData(usersFile, users);

  const { password, ...userWithoutPassword } = users[userIndex];
  res.json(userWithoutPassword);
});

// ==================== Vlog相关API ====================

// 上传文件
app.post('/api/upload', upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'images', maxCount: 10 }
]), (req, res) => {
  try {
    const files = req.files;
    const result = {};

    if (files.video && files.video[0]) {
      result.videoUrl = `/uploads/${files.video[0].filename}`;
    }

    if (files.images && files.images.length > 0) {
      result.images = files.images.map(file => `/uploads/${file.filename}`);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: '文件上传失败', error: error.message });
  }
});

// 获取Vlog列表
app.get('/api/vlogs', (req, res) => {
  const { userId } = req.query;
  const vlogs = readData(vlogsFile);
  const friends = readData(friendsFile);

  let filteredVlogs = vlogs;

  if (userId) {
    // 获取用户的好友列表
    const userFriends = friends
      .filter(f => f.userId === userId && f.status === 'accepted')
      .map(f => f.friendId);

    // 过滤Vlog：公开的 + 自己的 + 好友的
    filteredVlogs = vlogs.filter(vlog => {
      if (vlog.privacy === 'public') return true;
      if (vlog.userId === userId) return true;
      if (vlog.privacy === 'private' && userFriends.includes(vlog.userId)) return true;
      return false;
    });
  } else {
    // 未登录只能看公开的
    filteredVlogs = vlogs.filter(vlog => vlog.privacy === 'public');
  }

  res.json(filteredVlogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

// 获取用户的Vlog
app.get('/api/vlogs/user/:userId', (req, res) => {
  const { userId } = req.params;
  const { currentUserId } = req.query;
  const vlogs = readData(vlogsFile);
  const friends = readData(friendsFile);

  let userVlogs = vlogs.filter(vlog => vlog.userId === userId);

  // 如果不是自己，需要检查权限
  if (currentUserId !== userId) {
    const isFriend = friends.some(f =>
      f.userId === currentUserId &&
      f.friendId === userId &&
      f.status === 'accepted'
    );

    userVlogs = userVlogs.filter(vlog => {
      if (vlog.privacy === 'public') return true;
      if (vlog.privacy === 'private' && isFriend) return true;
      return false;
    });
  }

  res.json(userVlogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

// 创建Vlog
app.post('/api/vlogs', (req, res) => {
  const { userId, title, content, videoUrl, images, privacy } = req.body;
  const vlogs = readData(vlogsFile);

  const newVlog = {
    id: Date.now().toString(),
    userId,
    title,
    content,
    videoUrl,
    images: images || [],
    thumbnail: images && images.length > 0 ? images[0] : `https://picsum.photos/seed/${Date.now()}/800/450`,
    privacy: privacy || 'public',
    likes: 0,
    likedBy: [],
    views: 0,
    createdAt: new Date().toISOString()
  };

  vlogs.push(newVlog);
  writeData(vlogsFile, vlogs);

  res.json(newVlog);
});

// 更新Vlog隐私设置
app.patch('/api/vlogs/:id/privacy', (req, res) => {
  const { id } = req.params;
  const { privacy } = req.body;
  const vlogs = readData(vlogsFile);

  const vlogIndex = vlogs.findIndex(v => v.id === id);
  if (vlogIndex === -1) {
    return res.status(404).json({ message: 'Vlog不存在' });
  }

  vlogs[vlogIndex].privacy = privacy;
  writeData(vlogsFile, vlogs);

  res.json(vlogs[vlogIndex]);
});

// 获取单个Vlog详情
app.get('/api/vlogs/:id', (req, res) => {
  const { id } = req.params;
  const vlogs = readData(vlogsFile);
  const users = readData(usersFile);

  const vlog = vlogs.find(v => v.id === id);
  if (!vlog) {
    return res.status(404).json({ message: 'Vlog不存在' });
  }

  // 获取作者信息
  const author = users.find(u => u.id === vlog.userId);
  if (author) {
    const { password, ...authorWithoutPassword } = author;
    vlog.author = authorWithoutPassword;
  }

  res.json(vlog);
});

// 点赞/取消点赞Vlog
app.post('/api/vlogs/:id/like', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  const vlogs = readData(vlogsFile);

  const vlogIndex = vlogs.findIndex(v => v.id === id);
  if (vlogIndex === -1) {
    return res.status(404).json({ message: 'Vlog不存在' });
  }

  if (!vlogs[vlogIndex].likedBy) {
    vlogs[vlogIndex].likedBy = [];
  }

  const likedIndex = vlogs[vlogIndex].likedBy.indexOf(userId);
  if (likedIndex > -1) {
    // 取消点赞
    vlogs[vlogIndex].likedBy.splice(likedIndex, 1);
    vlogs[vlogIndex].likes = vlogs[vlogIndex].likedBy.length;
  } else {
    // 点赞
    vlogs[vlogIndex].likedBy.push(userId);
    vlogs[vlogIndex].likes = vlogs[vlogIndex].likedBy.length;
  }

  writeData(vlogsFile, vlogs);
  res.json(vlogs[vlogIndex]);
});

// 获取点赞用户列表
app.get('/api/vlogs/:id/likes', (req, res) => {
  const { id } = req.params;
  const vlogs = readData(vlogsFile);
  const users = readData(usersFile);

  const vlog = vlogs.find(v => v.id === id);
  if (!vlog) {
    return res.status(404).json({ message: 'Vlog不存在' });
  }

  const likedUsers = (vlog.likedBy || [])
    .map(userId => {
      const user = users.find(u => u.id === userId);
      if (user) {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      }
      return null;
    })
    .filter(u => u !== null);

  res.json(likedUsers);
});

// 记录Vlog查看
app.post('/api/vlogs/:id/view', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  const views = readData(viewsFile);
  const vlogs = readData(vlogsFile);

  // 获取vlog信息
  const vlog = vlogs.find(v => v.id === id);
  if (!vlog) {
    return res.status(404).json({ message: 'Vlog不存在' });
  }

  // 如果是作者自己，不记录查看
  if (vlog.userId === userId) {
    return res.json({ success: true });
  }

  // 更新vlog的浏览次数
  const vlogIndex = vlogs.findIndex(v => v.id === id);
  if (vlogIndex !== -1) {
    vlogs[vlogIndex].views = (vlogs[vlogIndex].views || 0) + 1;
    writeData(vlogsFile, vlogs);
  }

  // 检查今天是否已经有访问记录
  const today = new Date().toISOString().split('T')[0];
  const existingViewIndex = views.findIndex(v =>
    v.vlogId === id &&
    v.userId === userId &&
    v.viewedAt.startsWith(today)
  );

  if (existingViewIndex > -1) {
    // 更新现有记录的时间
    views[existingViewIndex].viewedAt = new Date().toISOString();
  } else {
    // 创建新记录
    const newView = {
      id: Date.now().toString(),
      vlogId: id,
      userId,
      viewedAt: new Date().toISOString()
    };
    views.push(newView);
  }

  writeData(viewsFile, views);
  res.json({ success: true });
});

// 获取Vlog查看记录
app.get('/api/vlogs/:id/views', (req, res) => {
  const { id } = req.params;
  const views = readData(viewsFile);
  const users = readData(usersFile);
  const vlogs = readData(vlogsFile);

  // 获取vlog信息
  const vlog = vlogs.find(v => v.id === id);
  if (!vlog) {
    return res.status(404).json({ message: 'Vlog不存在' });
  }

  // 获取查看记录，排除作者自己
  const vlogViews = views
    .filter(v => v.vlogId === id && v.userId !== vlog.userId)
    .map(v => {
      const viewer = users.find(u => u.id === v.userId);
      if (viewer) {
        const { password, ...viewerWithoutPassword } = viewer;
        return {
          ...v,
          viewer: viewerWithoutPassword
        };
      }
      return null;
    })
    .filter(v => v !== null)
    .sort((a, b) => new Date(b.viewedAt) - new Date(a.viewedAt))
    .slice(0, 50);

  res.json(vlogViews);
});

// 获取Vlog评论
app.get('/api/vlogs/:id/comments', (req, res) => {
  const { id } = req.params;
  const comments = readData(commentsFile);
  const users = readData(usersFile);

  const vlogComments = comments
    .filter(c => c.vlogId === id)
    .map(c => {
      const user = users.find(u => u.id === c.userId);
      if (user) {
        const { password, ...userWithoutPassword } = user;
        return {
          ...c,
          user: userWithoutPassword
        };
      }
      return null;
    })
    .filter(c => c !== null)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json(vlogComments);
});

// 添加评论
app.post('/api/vlogs/:id/comments', (req, res) => {
  const { id } = req.params;
  const { userId, content, parentId } = req.body;
  const comments = readData(commentsFile);

  const newComment = {
    id: Date.now().toString(),
    vlogId: id,
    userId,
    content,
    parentId: parentId || null,
    createdAt: new Date().toISOString()
  };

  comments.push(newComment);
  writeData(commentsFile, comments);

  res.json(newComment);
});

// 删除评论
app.delete('/api/vlogs/:vlogId/comments/:commentId', (req, res) => {
  const { vlogId, commentId } = req.params;
  const { userId } = req.body;
  const comments = readData(commentsFile);
  const vlogs = readData(vlogsFile);

  const commentIndex = comments.findIndex(c => c.id === commentId && c.vlogId === vlogId);
  if (commentIndex === -1) {
    return res.status(404).json({ message: '评论不存在' });
  }

  const vlog = vlogs.find(v => v.id === vlogId);

  // 只有评论作者或Vlog作者可以删除评论
  if (comments[commentIndex].userId !== userId && vlog.userId !== userId) {
    return res.status(403).json({ message: '无权删除此评论' });
  }

  comments.splice(commentIndex, 1);
  writeData(commentsFile, comments);

  res.json({ success: true });
});

// ==================== 好友相关API ====================

// 获取好友列表
app.get('/api/friends/:userId', (req, res) => {
  const { userId } = req.params;
  const friends = readData(friendsFile);
  const users = readData(usersFile);

  const userFriends = friends
    .filter(f => f.userId === userId && f.status === 'accepted')
    .map(f => {
      const friend = users.find(u => u.id === f.friendId);
      if (friend) {
        const { password, ...friendWithoutPassword } = friend;
        return friendWithoutPassword;
      }
      return null;
    })
    .filter(f => f !== null);

  res.json(userFriends);
});

// 获取好友请求
app.get('/api/friends/requests/:userId', (req, res) => {
  const { userId } = req.params;
  const friends = readData(friendsFile);
  const users = readData(usersFile);

  const requests = friends
    .filter(f => f.friendId === userId && f.status === 'pending')
    .map(f => {
      const user = users.find(u => u.id === f.userId);
      if (user) {
        const { password, ...userWithoutPassword } = user;
        return { ...f, user: userWithoutPassword };
      }
      return null;
    })
    .filter(f => f !== null);

  res.json(requests);
});

// 添加好友
app.post('/api/friends', (req, res) => {
  const { userId, friendId } = req.body;
  const friends = readData(friendsFile);

  // 检查是否已经是好友或已发送请求
  const existing = friends.find(f =>
    (f.userId === userId && f.friendId === friendId) ||
    (f.userId === friendId && f.friendId === userId)
  );

  if (existing) {
    return res.status(400).json({ message: '已经是好友或已发送请求' });
  }

  const newFriend = {
    id: Date.now().toString(),
    userId,
    friendId,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  friends.push(newFriend);
  writeData(friendsFile, friends);

  res.json(newFriend);
});

// 接受好友请求
app.patch('/api/friends/:id/accept', (req, res) => {
  const { id } = req.params;
  const friends = readData(friendsFile);

  const friendIndex = friends.findIndex(f => f.id === id);
  if (friendIndex === -1) {
    return res.status(404).json({ message: '请求不存在' });
  }

  friends[friendIndex].status = 'accepted';

  // 创建反向关系
  const reverseFriend = {
    id: Date.now().toString(),
    userId: friends[friendIndex].friendId,
    friendId: friends[friendIndex].userId,
    status: 'accepted',
    createdAt: new Date().toISOString()
  };

  friends.push(reverseFriend);
  writeData(friendsFile, friends);

  res.json(friends[friendIndex]);
});

// ==================== 私信相关API ====================

// 获取消息列表
app.get('/api/messages/:userId', (req, res) => {
  const { userId } = req.params;
  const messages = readData(messagesFile);
  const users = readData(usersFile);

  const userMessages = messages.filter(m =>
    m.senderId === userId || m.receiverId === userId
  );

  // 按对话分组
  const conversations = {};
  userMessages.forEach(msg => {
    const otherId = msg.senderId === userId ? msg.receiverId : msg.senderId;
    if (!conversations[otherId]) {
      conversations[otherId] = [];
    }
    conversations[otherId].push(msg);
  });

  // 转换为数组并附加用户信息
  const result = Object.keys(conversations).map(otherId => {
    const other = users.find(u => u.id === otherId);
    const { password, ...otherWithoutPassword } = other;
    const msgs = conversations[otherId].sort((a, b) =>
      new Date(a.createdAt) - new Date(b.createdAt)
    );
    const unread = msgs.filter(m => m.receiverId === userId && !m.read).length;

    return {
      user: otherWithoutPassword,
      messages: msgs,
      unread,
      lastMessage: msgs[msgs.length - 1]
    };
  });

  res.json(result.sort((a, b) =>
    new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)
  ));
});

// 发送消息
app.post('/api/messages', (req, res) => {
  const { senderId, receiverId, content, type = 'text' } = req.body;
  const messages = readData(messagesFile);
  const friends = readData(friendsFile);

  // 检查是否是好友
  const isFriend = friends.some(f =>
    ((f.userId === senderId && f.friendId === receiverId) ||
     (f.userId === receiverId && f.friendId === senderId)) &&
    f.status === 'accepted'
  );

  // 获取之前的消息记录
  const previousMessages = messages.filter(m =>
    m.senderId === senderId && m.receiverId === receiverId
  );

  // 如果不是好友，限制只能发送一条消息
  if (!isFriend && previousMessages.length >= 1) {
    return res.status(403).json({ message: '非好友只能发送一条消息，请等待对方添加好友后继续聊天' });
  }

  // 检查字数限制（仅对文本消息）
  if (type === 'text') {
    const maxLength = isFriend ? 999 : 99;
    if (content.length > maxLength) {
      return res.status(400).json({
        message: `${isFriend ? '好友' : '非好友'}消息不能超过${maxLength}字`
      });
    }
  }

  const newMessage = {
    id: Date.now().toString(),
    senderId,
    receiverId,
    content,
    type, // 'text', 'image', 'emoji'
    read: false,
    createdAt: new Date().toISOString()
  };

  messages.push(newMessage);
  writeData(messagesFile, messages);

  res.json(newMessage);
});

// 上传消息图片
app.post('/api/messages/upload', upload.single('image'), (req, res) => {
  try {
    if (req.file) {
      res.json({ imageUrl: `/uploads/${req.file.filename}` });
    } else {
      res.status(400).json({ message: '没有上传文件' });
    }
  } catch (error) {
    res.status(500).json({ message: '上传失败', error: error.message });
  }
});

// 标记消息为已读
app.patch('/api/messages/read', (req, res) => {
  const { userId, otherId } = req.body;
  const messages = readData(messagesFile);

  messages.forEach(msg => {
    if (msg.senderId === otherId && msg.receiverId === userId) {
      msg.read = true;
    }
  });

  writeData(messagesFile, messages);
  res.json({ success: true });
});

// ==================== 相册相关API ====================

// 获取用户相册
app.get('/api/albums/:userId', (req, res) => {
  const { userId } = req.params;
  const albums = readData(albumsFile);

  const userAlbums = albums.filter(a => a.userId === userId);
  res.json(userAlbums);
});

// 创建相册
app.post('/api/albums', upload.array('images', 20), async (req, res) => {
  try {
    const { userId, title, description } = req.body;
    const albums = readData(albumsFile);

    const images = req.files.map(file => `/uploads/${file.filename}`);

    const newAlbum = {
      id: Date.now().toString(),
      userId,
      title,
      description: description || '',
      images,
      createdAt: new Date().toISOString()
    };

    albums.push(newAlbum);
    writeData(albumsFile, albums);

    res.json(newAlbum);
  } catch (error) {
    res.status(500).json({ message: '创建相册失败', error: error.message });
  }
});

// 删除相册
app.delete('/api/albums/:id', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  const albums = readData(albumsFile);

  const albumIndex = albums.findIndex(a => a.id === id);
  if (albumIndex === -1) {
    return res.status(404).json({ message: '相册不存在' });
  }

  if (albums[albumIndex].userId !== userId) {
    return res.status(403).json({ message: '无权删除此相册' });
  }

  albums.splice(albumIndex, 1);
  writeData(albumsFile, albums);

  res.json({ success: true });
});

// ==================== 访客相关API ====================

// 记录访客
app.post('/api/visitors', (req, res) => {
  const { userId, visitorId } = req.body;
  const visitors = readData(visitorsFile);

  // 如果是自己访问自己，不记录
  if (userId === visitorId) {
    return res.json({ success: true });
  }

  // 检查今天是否已经访问过
  const today = new Date().toISOString().split('T')[0];
  const existing = visitors.find(v =>
    v.userId === userId &&
    v.visitorId === visitorId &&
    v.visitedAt.startsWith(today)
  );

  if (!existing) {
    const newVisitor = {
      id: Date.now().toString(),
      userId,
      visitorId,
      visitedAt: new Date().toISOString()
    };

    visitors.push(newVisitor);
    writeData(visitorsFile, visitors);
  }

  res.json({ success: true });
});

// 获取访客列表
app.get('/api/visitors/:userId', (req, res) => {
  const { userId } = req.params;
  const visitors = readData(visitorsFile);
  const users = readData(usersFile);

  const userVisitors = visitors
    .filter(v => v.userId === userId)
    .sort((a, b) => new Date(b.visitedAt) - new Date(a.visitedAt))
    .slice(0, 50) // 最近50个访客
    .map(v => {
      const visitor = users.find(u => u.id === v.visitorId);
      if (visitor) {
        const { password, ...visitorWithoutPassword } = visitor;
        return {
          ...v,
          visitor: visitorWithoutPassword
        };
      }
      return null;
    })
    .filter(v => v !== null);

  res.json(userVisitors);
});

// ==================== 推荐系统API ====================

// 获取个性化推荐
app.get('/api/recommendations/:userId', (req, res) => {
  const { userId } = req.params;
  const vlogs = readData(vlogsFile);
  const users = readData(usersFile);
  const friends = readData(friendsFile);
  const views = readData(viewsFile);
  const comments = readData(commentsFile);

  // 获取用户的好友
  const userFriends = friends
    .filter(f => f.userId === userId && f.status === 'accepted')
    .map(f => f.friendId);

  // 获取用户喜欢的Vlog（点赞过的）
  const userLikedVlogs = vlogs.filter(v => v.likedBy && v.likedBy.includes(userId));

  // 获取用户评论过的Vlog
  const userCommentedVlogIds = comments
    .filter(c => c.userId === userId)
    .map(c => c.vlogId);

  // 获取用户查看过的Vlog
  const userViewedVlogIds = views
    .filter(v => v.userId === userId)
    .map(v => v.vlogId);

  // 找到相似用户（点赞了相同Vlog的用户）
  const similarUsers = new Set();
  userLikedVlogs.forEach(vlog => {
    if (vlog.likedBy) {
      vlog.likedBy.forEach(uid => {
        if (uid !== userId && !userFriends.includes(uid)) {
          similarUsers.add(uid);
        }
      });
    }
  });

  // 获取相似用户喜欢的Vlog（但当前用户没看过的）
  const recommendedVlogs = vlogs.filter(vlog => {
    // 排除自己的Vlog
    if (vlog.userId === userId) return false;

    // 排除已经看过的
    if (userViewedVlogIds.includes(vlog.id)) return false;

    // 只推荐公开的或好友的私密Vlog
    if (vlog.privacy === 'private' && !userFriends.includes(vlog.userId)) {
      return false;
    }

    // 检查是否被相似用户喜欢
    if (vlog.likedBy) {
      return Array.from(similarUsers).some(uid => vlog.likedBy.includes(uid));
    }

    return false;
  });

  // 获取热门Vlog（点赞和查看最多的）
  const trendingVlogs = vlogs
    .filter(vlog => {
      if (vlog.userId === userId) return false;
      if (vlog.privacy === 'private' && !userFriends.includes(vlog.userId)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      const scoreA = (a.likes || 0) * 2 + (a.views || 0);
      const scoreB = (b.likes || 0) * 2 + (b.views || 0);
      return scoreB - scoreA;
    })
    .slice(0, 10);

  // 推荐好友（有共同好友的用户）
  const potentialFriends = [];
  userFriends.forEach(friendId => {
    const friendOfFriend = friends
      .filter(f => f.userId === friendId && f.status === 'accepted' && f.friendId !== userId)
      .map(f => f.friendId);

    friendOfFriend.forEach(uid => {
      if (!userFriends.includes(uid) && uid !== userId) {
        const existing = potentialFriends.find(p => p.userId === uid);
        if (existing) {
          existing.mutualFriends++;
        } else {
          const user = users.find(u => u.id === uid);
          if (user) {
            const { password, ...userWithoutPassword } = user;
            potentialFriends.push({
              ...userWithoutPassword,
              userId: uid,
              mutualFriends: 1
            });
          }
        }
      }
    });
  });

  // 按共同好友数排序
  potentialFriends.sort((a, b) => b.mutualFriends - a.mutualFriends);

  res.json({
    personalizedVlogs: recommendedVlogs.slice(0, 10),
    trendingVlogs,
    suggestedUsers: potentialFriends.slice(0, 10)
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
