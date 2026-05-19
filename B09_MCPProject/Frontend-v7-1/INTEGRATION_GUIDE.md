# 前后端对接指南 (Frontend-Backend Integration Guide)

## 1. 整体架构

```
浏览器 (localhost:5173)
  │
  ├── /api/user/*  ──→  Vite Proxy ──→  Gateway (8.134.126.87:8080) ──→ User-Service (:8081)
  ├── /api/org/*   ──→  Vite Proxy ──→  Gateway (8.134.126.87:8080) ──→ Organizational-Service
  └── 其他页面     ──→  本地 Vue 开发服务器
```

Vite 开发服务器通过 `proxy` 配置将所有 `/api` 开头的请求转发到后端网关，解决跨域问题。

## 2. 后端可用的 API 端点

### 2.1 登录（不需要 Token）
```
GET /api/user/login?username=xxx&password=xxx

响应示例:
{
  "code": 200,
  "message": "Login successfully",
  "data": "eyJhbGciOiJIUzI1NiJ9..."   ← 这就是 JWT Token
}
```

### 2.2 获取用户信息（需要 Token）
```
GET /api/user/userInfo?username=xxx
Header: Authorization: Bearer <token>

响应示例:
{
  "code": 200,
  "message": "get info successfully",
  "data": {
    "user": { "id": "xxx", "username": "...", "email": "...", ... },
    "roles": ["MENTOR"],
    "permissions": ["user:update"],
    "orgUnits": [
      { "id": "org_dcs", "name": "计算机科学系 (DCS)", "type": "DEPARTMENT", "parentId": "org_fst" }
    ]
  }
}
```

### 2.3 获取部门下属导师列表（需要 Token）
```
GET /api/org/mentors/{orgId}
Header: Authorization: Bearer <token>

orgId 示例:
  org_dcs  → 计算机科学系 (DCS)
  org_fst  → 理工科技学院 (FST)

响应示例:
{
  "code": 200,
  "message": "获取成功",
  "data": [
    {
      "mentorId": "81d60f255a73...",
      "mentorName": "tjx",
      "email": "t330026143@mail.bnbu.edu.cn",
      "office": "T1-102",
      "departmentName": "计算机科学系 (DCS)"
    }
  ]
}
```

### 2.4 尚未实现的 API（Mentoring-Service 为空）
- 搜索学生信息 ← 后端暂无此 API，前端保持 mock 数据
- 面谈记录 CRUD ← 后端暂无此 API，前端保持 mock 数据

## 3. 对接步骤

### 步骤 1: 安装依赖并启动
```bash
cd mentor-caring-frontend
npm install
npm run dev
```
浏览器打开 http://localhost:5173

### 步骤 2: 测试真实登录
1. 关闭 "Mock Mode" 复选框
2. 输入 BNBU 邮箱账号和密码
3. 点击 Login
4. 如果后端服务器在线，会自动获取 JWT Token 和用户角色
5. 如果后端离线，会提示错误，可以切换到 Mock Mode 继续测试

### 步骤 3: 测试导师搜索（真实 API）
登录后，如果 userInfo 中有 orgUnits 信息，SearchMentorView 可以调用
`GET /api/org/mentors/{orgId}` 获取真实导师数据。

### 步骤 4: Token 过期处理
后端同学提醒：Token 会过期，需要重新登录刷新。
前端的 request.ts 已经处理了 401 响应，会自动跳转到登录页。

## 4. 新增文件说明

| 文件 | 作用 |
|------|------|
| `src/api/request.ts` | HTTP 请求封装，自动附加 JWT Token，处理 401 |
| `src/api/user.ts` | 登录、获取用户信息、角色映射 |
| `src/api/org.ts` | 组织服务 API（获取导师列表） |
| `vite.config.ts` | 新增 proxy 配置，将 `/api` 转发到后端 |
| `src/views/LoginView.vue` | 支持真实 API 登录 + Mock 模式切换 |

## 5. 重要提醒（来自后端同学）

1. **Token**: 保存在 localStorage，每次请求通过 `Authorization: Bearer <token>` 传递
2. **orgId**: 就是单位代码（如 org_dcs），请求导师列表时路径里要带上
3. **Faculty Consultant**: 搜索范围是整个院系（如 org_fst）
4. **Coordinator**: 搜索范围是所在部门（如 org_dcs）
5. **服务器性能有限**: 1核服务器跑3个服务，偶尔响应慢是正常的

## 6. 简单对接测试清单

| 测试项 | 操作 | 预期结果 |
|--------|------|----------|
| 登录成功 | 输入正确的 BNBU 账号密码 | 跳转到 Dashboard，显示正确角色 |
| 登录失败 | 输入错误密码 | 显示 "Invalid username or password" |
| Token 传递 | 登录后查看 localStorage | token 存在且不是 "mock-token" |
| 用户信息 | 登录后查看 localStorage('userInfo') | 包含 roles 和 orgUnits |
| 导师搜索 | 登录后访问 Search Mentor | 能获取到真实导师数据 |
| Token 过期 | 等待 Token 过期后操作 | 自动跳回登录页 |
| Mock 模式 | 勾选 Mock Mode 登录 | 使用本地假数据正常工作 |
