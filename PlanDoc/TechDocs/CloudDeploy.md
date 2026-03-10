**目标架构（纯阿里云承载网站与后端，模型走 SiliconFlow）**
- 静态前端：OSS 静态网站托管（可选加 CDN）
- 极薄后端：函数计算 FC（HTTP 触发器）提供 `POST /api/chat`
- 密钥管理：SiliconFlow API Key 存在 FC 环境变量（不下发到浏览器）
- 调用链路：Browser → `https://你的域名/api/chat` → FC → `https://api.siliconflow.cn/v1/chat/completions` → FC → Browser

---

## **1) 静态站部署（OSS + 可选 CDN）**
- 在 OSS 创建 Bucket，上传前端构建产物（`index.html`、JS/CSS、assets）。
- 开启 OSS “静态网站托管”。该能力只支持 HTML/CSS/JS 等纯静态内容；需要动态能力（比如你这里的 LLM）应结合函数计算实现后端 API 调用。[^oss-static]
- SPA 路由刷新：按 OSS 文档的 SPA 方案配置（典型做法是把 404 页指向 `index.html` 并返回 200，让前端路由接管）。[^oss-static]
- 绑定自定义域名：OSS 文档提示，直接用 Bucket 域名访问 HTML 可能会触发浏览器下载行为；要实现正常浏览通常需绑定自定义域名；若 Bucket 在中国内地，域名涉及 ICP 备案要求。[^oss-static]
- 可选：用阿里云 CDN 以 OSS 为源站做加速（官方有对应配置指引）。[^aliyun-cdn-oss]

---

## **2) Serverless（FC）只做一件事：安全代理 SiliconFlow**
### 2.1 FC 函数与触发方式
- 用函数计算 FC 创建一个 HTTP 触发器函数，让函数像 Web Server 一样接收 HTTP 请求并返回响应。[^fc-http-trigger]
- 对外只暴露一个接口：`POST /api/chat`
  - 前端只需要“回复文本”，后端就只返回你需要的字段（例如 `{ reply: string }`），减少暴露与带宽。

### 2.2 密钥存储（强烈推荐用环境变量）
- 在 FC 控制台为函数配置环境变量，例如：
  - `SILICONFLOW_API_KEY=...`
  - `SILICONFLOW_BASE_URL=https://api.siliconflow.cn/v1`
  - `SILICONFLOW_MODEL=Qwen/Qwen2.5-7B-Instruct`（示例）
- FC 环境变量会以 AES256 加密存储，初始化实例时注入运行环境；也有大小与命名限制（例如总大小 4KB，不能用某些系统保留前缀）。[^fc-env]

---

## **3) SiliconFlow 调用方式（后端转发，前端永不接触 Key）**
SiliconFlow 的 Chat Completions（OpenAI 兼容风格）要点：
- Endpoint：`POST https://api.siliconflow.cn/v1/chat/completions`
- Header：`Authorization: Bearer YOUR_API_KEY`，`Content-Type: application/json`
- Body：`model` + `messages`
- 支持 `stream`（SSE）与 `max_tokens` 等参数；`messages` 数组长度在其文档示例与字段约束中有上限描述。[^sf-chat]

你在 FC 里转发时，建议做“强约束”：
- 强制 `model` 白名单或固定为一个模型（避免被人改成高价模型）
- 强制 `max_tokens` 上限
- 强制 `messages` 最多 5 轮（你项目需求）且最多 N 条（与 SiliconFlow 的数组长度限制对齐）[^sf-chat]

---

## **4) `/api/chat` 的推荐协议（前端最省事、后端最安全）**
**请求**
```json
{
  "messages": [
    { "role": "system", "content": "你是一个文字冒险游戏旁白与裁判。" },
    { "role": "user", "content": "我选择先去打工攒钱。" }
  ]
}
```

**响应（给前端最简）**
```json
{
  "reply": "你找到一份夜班工作……（此处省略）"
}
```

后端从 SiliconFlow 的响应中抽取 `choices[0].message.content` 返回即可。[^sf-chat]

---

## **5) FC 函数实现要点（Node.js 示例，非流式）**
- 只允许 `POST`
- 校验 `Origin`（仅允许你的站点域名）
- 限制 `messages` 条数（≤ 11：system + 5 轮 user/assistant 约 11 条，你也可更严格）
- 转发到 SiliconFlow，并把 `reply` 返回

```js
export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

    const origin = request.headers.get('origin') || '';
    if (env.ALLOWED_ORIGIN && origin !== env.ALLOWED_ORIGIN) {
      return new Response('Forbidden', { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response('Bad Request', { status: 400 });
    }

    const messages = Array.isArray(body.messages) ? body.messages : null;
    if (!messages || messages.length < 1 || messages.length > 11) {
      return new Response(JSON.stringify({ error: 'invalid_messages' }), {
        status: 400,
        headers: { 'content-type': 'application/json' }
      });
    }

    const upstream = await fetch(`${env.SILICONFLOW_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${env.SILICONFLOW_API_KEY}`
      },
      body: JSON.stringify({
        model: env.SILICONFLOW_MODEL,
        messages,
        stream: false,
        max_tokens: Math.min(Number(body.max_tokens || 512), 1024)
      })
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return new Response(JSON.stringify({ error: 'upstream_error', detail: text.slice(0, 2000) }), {
        status: 502,
        headers: { 'content-type': 'application/json' }
      });
    }

    const data = await upstream.json();
    const reply = data?.choices?.[0]?.message?.content ?? '';
    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }
};
```

---

## **6) 防滥用与费用控制（必须做，不然一定被刷）**
- **域名白名单 + CORS**：只允许你的站点 Origin 请求你的 `/api/chat`
- **限速/配额**：最简单可先在网关层做（API 网关/函数触发器侧的限流能力），不依赖你自己持久化存储
- **硬限制参数**：固定/白名单模型、限制 `max_tokens`、限制 `messages` 条数（≤5轮）、拒绝 `tools` 等高风险扩展字段
- **预算兜底**：SiliconFlow 控制台侧设置额度/告警（平台能力各家不同，但这是最有效的“最终保险”）
- 如果你确实要流式输出：SiliconFlow 支持 `stream`（SSE）[^sf-chat]；FC 侧也有关于 SSE/流式响应的说明与约束（按你选择的运行时来落地）。[^fc-sse]

---

## **7) 和你游戏设计的结合点（最少调用次数，仍然“有灵魂”）**
结合你 [1page_draft.md](file:///Users/yanchenyu/Documents/WebApps/illegal_immigration_simulator/illegal_migration_simulator/1page_draft.md) 的结构，最建议只在两处用 LLM（天然 ≤5 轮）：
- 自定义角色 → 生成初始数值（1 次）
- 结算战报 → 把结构化结算数据润色成更“可传播”的文案（1 次）
其余回合事件与数值结算全部纯前端/纯规则引擎完成。

---

[^oss-static]: https://help.aliyun.com/zh/oss/user-guide/hosting-static-websites  
[^aliyun-cdn-oss]: https://help.aliyun.com/zh/cdn/use-cases/accelerate-the-retrieval-of-resources-from-an-oss-bucket-in-the-alibaba-cloud-cdn-console  
[^fc-http-trigger]: https://help.aliyun.com/zh/functioncompute/fc-2-0/user-guide/configure-an-http-trigger-that-invokes-a-function-with-http-requests  
[^fc-env]: https://help.aliyun.com/zh/functioncompute/fc-2-0/user-guide/fc-environment-variables  
[^sf-chat]: https://docs.siliconflow.cn/cn/api-reference/chat-completions/chat-completions  
[^fc-sse]: https://help.aliyun.com/zh/functioncompute/fc-2-0/sse