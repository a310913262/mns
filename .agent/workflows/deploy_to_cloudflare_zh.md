---
description: 如何将 MNS Core 应用部署到 Cloudflare Pages (中文指南).
---

# 使用 Cloudflare 控制台部署 (推荐 - Git 集成)

这是最简单的方法。

1.  **推送代码**：将您的代码推送到 GitHub 或 GitLab 仓库。
2.  **登录 Cloudflare**：访问 [Cloudflare 控制台](https://dash.cloudflare.com)。
3.  **创建项目**：点击 **Workers & Pages** -> **Create Application** (创建应用) -> **Pages** -> **Connect to Git** (连接 Git)。
4.  **选择仓库**：选择您的仓库和分支（通常是 `main` 或 `master`）。
5.  **构建设置 (Build Settings)**：
    *   **Framework Preset (框架预设)**：选择 `Next.js`。
    *   **Build command (构建命令)**：填入 `npx @cloudflare/next-on-pages` (或者 `npm run pages:build`)。
    *   **Build output directory (构建输出目录)**：填入 `.vercel/output/static`。
    *   **Node.js Version (Node 版本)**：建议设置为 `20` (或者与您本地开发一致的 LTS 版本)。您可以在 **Environment Variables (环境变量)** 中添加 `NODE_VERSION` = `20`。

# 使用 Wrangler 命令行工具部署

如果您更喜欢使用命令行 (CLI)：

1.  **安装 Wrangler**：
    ```bash
    npm install -g wrangler
    ```
2.  **登录账号**：
    ```bash
    wrangler login
    ```
3.  **构建项目**：
    ```bash
    npm run pages:build
    ```
4.  **执行部署**：
    ```bash
    npx wrangler pages deploy .vercel/output/static --project-name mns-core
    ```

# 常见问题排查 (Troubleshooting)

-   **兼容性问题**：确保在 Cloudflare 的项目设置中开启了 `nodejs_compat` 兼容性标志（如果使用了 Node.js 特有的 API）。
-   **Lockfile 错误**：如果部署时出现 `ERR_PNPM_OUTDATED_LOCKFILE` 错误，可以尝试在本地删除 `pnpm-lock.yaml` 或运行 `pnpm install` 更新锁文件后再提交代码。
