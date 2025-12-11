# Vlog Life - 生活日常分享网站

一个时尚炫酷的Vlog分享平台，让你轻松记录和分享生活中的精彩瞬间。

## 功能特性

### 用户认证
- 用户注册与登录
- 个性化头像（自动生成或自定义上传）
- IP归属地显示（自动识别，精确到市）
- 个人资料编辑
  - 修改头像
  - 修改用户名
  - 修改个性签名

### Vlog管理
- 创建和发布Vlog
- 两种上传方式
  - 视频链接：输入在线视频URL
  - 本地上传：支持上传本地视频和缩略图
- 支持多种视频格式（MP4, AVI, MOV, WEBM）
- 自动生成精美缩略图或自定义上传
- 视频预览和播放
- 上传进度显示
- 隐私设置（公开/私密）
  - 公开：所有人可见
  - 私密：仅好友可见

### 社交功能
- 好友系统
  - 发送好友请求
  - 接受/拒绝好友请求
  - 查看好友列表
- 私信聊天
  - 实时消息（3秒自动刷新）
  - 未读消息提醒
  - 消息历史记录
- 访客记录
  - 自动记录主页访客
  - 查看访客列表和访问时间

### 界面设计
- 炫酷的渐变色背景
- 毛玻璃效果（Glass Morphism）
- 流畅的动画效果
- 响应式设计，完美支持移动端
- 主页背景音乐播放器
  - 悬浮音乐控制按钮
  - 音量调节
  - 播放/暂停控制
  - 音符动画效果

## 技术栈

### 前端
- React 18
- React Router（路由管理）
- Axios（HTTP请求）
- Tailwind CSS（样式框架）
- Vite（构建工具）

### 后端
- Node.js
- Express（Web框架）
- Multer（文件上传处理）
- JSON文件存储（简化部署）

## 安装运行

### 前置要求
- Node.js 16+
- npm 或 yarn

### 1. 安装前端依赖

```bash
cd vlog-website
npm install
```

### 2. 安装后端依赖

```bash
cd server
npm install
cd ..
```

### 3. 启动后端服务

打开第一个终端窗口：

```bash
cd server
npm start
```

后端服务将在 http://localhost:5000 运行

### 4. 启动前端服务

打开第二个终端窗口：

```bash
npm run dev
```

前端服务将在 http://localhost:3000 运行

### 5. 访问应用

在浏览器中打开 http://localhost:3000

## 使用指南

### 注册新账号

1. 访问登录页面
2. 点击"注册"标签
3. 输入用户名、邮箱和密码
4. 点击"注册"按钮

### 创建Vlog

1. 登录后进入主页
2. 点击右上角"创建Vlog"按钮
3. 填写标题、内容描述
4. 选择上传方式：
   - **视频链接**：输入在线视频URL
   - **上传文件**：从本地上传视频和缩略图
     - 支持MP4、AVI、MOV、WEBM等格式
     - 视频文件最大100MB
     - 可选上传自定义缩略图
     - 实时预览和上传进度显示
5. 选择隐私设置
6. 点击"发布"

### 添加好友

1. 进入"好友"页面
2. 点击"发现新朋友"标签
3. 浏览用户列表
4. 点击"+ 添加好友"按钮
5. 等待对方接受请求

### 发送私信

1. 进入"私信"页面
2. 选择或点击用户头像
3. 在聊天窗口输入消息
4. 点击"发送"按钮

### 查看访客

1. 进入"访客"页面
2. 查看谁访问过你的主页
3. 点击访客可以访问他们的主页

### 隐私设置

在每个Vlog卡片上：
- 点击隐私下拉菜单
- 选择"🌍 公开"或"🔒 私密"
- 自动保存设置

## 项目结构

```
vlog-website/
├── server/                 # 后端服务
│   ├── server.js          # Express服务器
│   ├── data/              # JSON数据存储
│   └── package.json
├── src/                   # 前端源码
│   ├── components/        # React组件
│   │   ├── Navbar.jsx     # 导航栏
│   │   ├── VlogCard.jsx   # Vlog卡片
│   │   └── CreateVlog.jsx # 创建Vlog模态框
│   ├── pages/             # 页面组件
│   │   ├── Login.jsx      # 登录注册页
│   │   ├── Home.jsx       # 主页
│   │   ├── Profile.jsx    # 个人主页
│   │   ├── Friends.jsx    # 好友管理
│   │   ├── Messages.jsx   # 私信
│   │   └── Visitors.jsx   # 访客记录
│   ├── contexts/          # React上下文
│   │   └── AuthContext.jsx # 认证上下文
│   ├── App.jsx            # 主应用组件
│   ├── main.jsx           # 入口文件
│   └── index.css          # 全局样式
├── index.html
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## API接口

### 认证相关
- POST `/api/auth/register` - 注册
- POST `/api/auth/login` - 登录

### 用户相关
- GET `/api/users` - 获取所有用户
- GET `/api/users/:id` - 获取指定用户信息
- PATCH `/api/users/:id` - 更新用户信息
- POST `/api/users/:id/avatar` - 上传头像

### Vlog相关
- POST `/api/upload` - 上传视频和图片文件
- GET `/api/vlogs` - 获取Vlog列表
- GET `/api/vlogs/user/:userId` - 获取用户的Vlog
- POST `/api/vlogs` - 创建Vlog
- PATCH `/api/vlogs/:id/privacy` - 更新隐私设置

### 好友相关
- GET `/api/friends/:userId` - 获取好友列表
- GET `/api/friends/requests/:userId` - 获取好友请求
- POST `/api/friends` - 添加好友
- PATCH `/api/friends/:id/accept` - 接受好友请求

### 私信相关
- GET `/api/messages/:userId` - 获取消息列表
- POST `/api/messages` - 发送消息
- PATCH `/api/messages/read` - 标记为已读

### 访客相关
- GET `/api/visitors/:userId` - 获取访客列表
- POST `/api/visitors` - 记录访客

## 特色亮点

1. 时尚的UI设计
   - 渐变色背景动画
   - 毛玻璃效果
   - 流畅的悬停动画
   - 炫酷的文字渐变
   - 悬浮音乐播放器

2. 完整的社交功能
   - 好友系统
   - 实时私信
   - 访客追踪
   - IP归属地显示

3. 灵活的隐私控制
   - 公开/私密切换
   - 基于好友关系的可见性控制

4. 强大的上传功能
   - 本地视频上传
   - 自定义缩略图
   - 上传进度显示
   - 视频在线播放

5. 完善的个人中心
   - 头像自定义上传
   - 个人资料编辑
   - IP归属地显示
   - Vlog管理

6. 优秀的用户体验
   - 响应式设计
   - 流畅的页面切换
   - 实时数据更新
   - 背景音乐氛围

## 开发说明

### 数据持久化

项目使用JSON文件存储数据，位于 `server/data/` 目录：
- `users.json` - 用户数据
- `vlogs.json` - Vlog数据
- `friends.json` - 好友关系
- `messages.json` - 私信记录
- `visitors.json` - 访客记录

### 自定义样式

Tailwind配置文件 `tailwind.config.js` 中定义了：
- 自定义颜色
- 动画效果
- 主题扩展

全局样式在 `src/index.css` 中定义。

## 注意事项

- 本项目使用JSON文件存储数据，适合演示和小规模使用
- 生产环境建议使用真实数据库（如MongoDB、PostgreSQL）
- 密码未加密，生产环境需要使用bcrypt等加密库
- 消息使用轮询刷新，生产环境建议使用WebSocket

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！

---

开始享受分享生活的乐趣吧！ 🎬✨
