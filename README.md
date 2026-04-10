# Gmail MCP Server

Gmail MCP server，通过 Streamable HTTP transport 提供 Gmail 操作能力。

## 功能

| Tool | 描述 |
|------|------|
| `gmail_search` | 搜索邮件（支持 Gmail 搜索语法） |
| `gmail_read_message` | 读取单条邮件完整内容 |
| `gmail_read_thread` | 读取整个邮件会话 |
| `gmail_send` | 发送新邮件 |
| `gmail_reply` | 回复邮件 |
| `gmail_create_draft` | 创建草稿 |
| `gmail_list_drafts` | 列出草稿 |
| `gmail_list_labels` | 列出所有标签 |
| `gmail_modify_labels` | 修改邮件标签 |
| `gmail_get_profile` | 获取用户信息 |
| `gmail_trash` | 将邮件移到回收站 |
| `gmail_mark_spam` | 标记为垃圾邮件 |

## 前置条件

- Node.js >= 20
- Docker（可选，用于容器化部署）

## 1. Google Cloud 项目配置

### 1.1 创建项目

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 点击顶部的项目选择器，选择 **新建项目**
3. 输入项目名称，点击 **创建**

### 1.2 启用 Gmail API

1. 在项目中，前往 **API 和服务** → **库**
2. 搜索 **Gmail API**
3. 点击 **启用**

### 1.3 创建 OAuth 2.0 凭据

1. 前往 **API 和服务** → **凭据**
2. 点击 **创建凭据** → **OAuth 客户端 ID**
3. 如果尚未配置同意屏幕，先完成 **OAuth 同意屏幕** 配置：
   - 选择 **外部** 用户类型（或 **内部** 如果是 Workspace 组织）
   - 填写应用名称和联系信息
   - 添加范围：`gmail.readonly`、`gmail.send`、`gmail.compose`、`gmail.modify`
   - 添加测试用户（你的 Gmail 地址）
4. 回到凭据页面，创建 OAuth 客户端 ID：
   - 应用类型选择 **桌面应用** 或 **Web 应用程序**
   - 如果选择 Web 应用程序，添加重定向 URI：`urn:ietf:wg:oauth:2.0:oob`
5. 下载或记录 **Client ID** 和 **Client Secret**

## 2. Token 申请与管理

### 2.1 获取 Token

设置环境变量后运行授权脚本：

```bash
export GOOGLE_CLIENT_ID="your-client-id"
export GOOGLE_CLIENT_SECRET="your-client-secret"

npm run authorize
```

脚本会输出一个授权 URL，在浏览器中打开并完成授权。授权成功后浏览器会自动回调到本地服务（`http://localhost:3456/oauth2callback`），无需手动粘贴 code。

Token 会拆分保存为两个文件：
- `refresh_token.json` — 长期有效的刷新令牌
- `access_token.json` — 短期访问令牌（自动刷新）

### 2.2 Token 存储

- 默认存储在当前工作目录
- 可通过环境变量 `GMAIL_DATA_DIR` 自定义存储目录
- Docker 环境下通过 bind mount 挂载本地 `./data/` 目录

### 2.3 Token 刷新

- 服务器启动时加载 `refresh_token.json` 和 `access_token.json`
- `access_token` 过期时自动使用 `refresh_token` 刷新，并保存到 `access_token.json`
- 如果 `refresh_token` 失效（如用户撤销授权），需要重新运行 `npm run authorize`

### 2.4 安全注意事项

- **不要** 将 token 文件提交到 Git（已在 `.gitignore` 中排除）
- **不要** 将 Client Secret 硬编码到代码中
- Docker 环境下 `refresh_token.json` 以只读（`:ro`）方式挂载，防止容器被入侵后篡改
- 建议在生产环境中使用 Secret Manager 管理凭据
- 定期检查 Google Cloud Console 中的已授权访问

## 3. 本地运行

```bash
npm install
npm run build

export GOOGLE_CLIENT_ID="your-client-id"
export GOOGLE_CLIENT_SECRET="your-client-secret"

npm start
```

服务器默认监听 `0.0.0.0:3000`，MCP endpoint 为 `/mcp`。

可通过环境变量调整：

| 变量 | 默认值 | 描述 |
|------|--------|------|
| `MCP_PORT` | `3000` | 监听端口 |
| `MCP_HOST` | `0.0.0.0` | 监听地址 |
| `GOOGLE_CLIENT_ID` | — | OAuth Client ID（必填） |
| `GOOGLE_CLIENT_SECRET` | — | OAuth Client Secret（必填） |
| `GMAIL_DATA_DIR` | `.`（当前目录） | Token 文件存储目录 |

## 4. Docker 部署

### 4.1 首次获取 Token

Docker 环境下，需要先在本地获取 token：

```bash
# 1. 本地获取 token
npm run authorize

# 2. 创建 data 目录并移动 token 文件
mkdir -p data
mv refresh_token.json access_token.json data/
```

### 4.2 使用 docker-compose

创建 `.env` 文件：

```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
MCP_PORT=3000
```

启动服务：

```bash
docker compose up -d
```

Token 挂载方式：
- `./data/refresh_token.json` → 容器内 `/data/refresh_token.json`（**只读**）
- `./data/access_token.json` → 容器内 `/data/access_token.json`（可写，用于自动刷新）

### 4.3 直接使用 Docker

```bash
docker build -t gmail-mcp .

docker run -d \
  --name gmail-mcp \
  -p 3000:3000 \
  -e GOOGLE_CLIENT_ID="your-client-id" \
  -e GOOGLE_CLIENT_SECRET="your-client-secret" \
  -e GMAIL_DATA_DIR="/data" \
  -v ./data/refresh_token.json:/data/refresh_token.json:ro \
  -v ./data/access_token.json:/data/access_token.json \
  gmail-mcp
```

### 4.4 接入 Astrbot 网络

使用专用的 compose 文件，无需暴露端口：

```bash
docker compose -f docker-compose.astrbot.yml up -d
```

在 `.env` 中配置网络名（默认 `astrbot_default`）：

```env
ASTRBOT_NETWORK=astrbot_default
```

Astrbot 内部访问地址：`http://gmail-mcp:3000/mcp`

查看 astrbot 实际网络名：

```bash
docker network ls | grep astrbot
```

## 5. MCP 客户端配置

MCP endpoint: `http://<host>:3000/mcp`

Transport: Streamable HTTP

配置示例（以 JSON 格式为例）：

```json
{
  "mcpServers": {
    "gmail": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

## License

MIT
