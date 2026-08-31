# VRCLearn Docs

VRCLearn 的统一文档与文档站仓库，承载主站教程以及 ALCOMD 等 VRCLearn 项目的文档。Markdown 内容和负责展示它们的 Vite + React 网站在同一仓库维护，并部署到 Cloudflare Pages。

生产环境地址：<https://docs.vrclearn.com>

## 仓库结构

- `avatar/`：Avatar 教程源文件
- `world/`：World 教程源文件
- `src/`：文档站前端源码
- `scripts/`：文档数据与站点地图生成脚本
- `public/`：主题和静态资源
- `site.config.json`：VRCLearn 文档站及其所属项目的站点、仓库和统计配置
- `docs-writing-spec.md`：文档编写规范

## 本地开发

```bash
npm clean-install
npm run dev
```

生产构建：

```bash
npm run build
```

`predev` 和 `prebuild` 会读取本仓库的 `avatar/{lang}/` 与 `world/{lang}/`，生成 `public/docs-content/` 和 `src/generated/docs-data.js`。这些目录属于构建产物，不应手动维护或提交。

Vite、React 页面和构建脚本统一读取 `site.config.json`，不需要在部署平台重复配置站点域名。配置中的 `sites` 用于区分同属 VRCLearn 的 `www` 主站与 ALCOMD 等站点。

## 路由

- `/`：文档入口
- `/avatar/{lang}`：Avatar 文档首页
- `/avatar/{lang}/{slug}`：Avatar 文档页
- `/world/{lang}`：World 文档首页
- `/world/{lang}/{slug}`：World 文档页

返回主站的链接指向 <https://www.vrclearn.com>。

## Cloudflare Pages

为本仓库创建独立的 Pages 项目，并配置：

- 构建命令：`npm run build`
- 构建输出目录：`dist`
- 生产分支：`main`
- 自定义域名：`docs.vrclearn.com`

自定义域名必须先在 Pages 项目的 **Custom domains** 中关联，再确认对应的 Cloudflare DNS CNAME 记录已生效。
