# VRCLearn Docs 开发规范

## 技术栈与部署

- 构建工具：Vite
- 包管理器：npm
- 前端框架：React
- 编程语言：JavaScript / JSX
- 部署平台：Cloudflare Pages
- 生产域名：`https://docs.vrclearn.com`

## 仓库边界

- `avatar/` 与 `world/` 保存文档源文件。
- `src/`、`public/` 与 `scripts/` 保存文档站实现。
- 文档站构建必须直接读取本仓库文档，不得从远程仓库再次克隆自身。
- VRCLearn 是包含主站与 ALCOMD 等项目的整体；本仓库的文档站不是 `www.vrclearn.com` 的专属文档站。
- VRCLearn 主站部署到 `https://www.vrclearn.com`，ALCOMD 站点部署到 `https://alcomd.vrclearn.com`，两者的文档统一由 `https://docs.vrclearn.com` 承载。
- 文档站名称、规范域名、仓库地址、所属项目入口和统计 ID 等稳定信息统一维护在根目录的 `site.config.json`，不得通过部署环境变量或业务代码重复配置。

## Material Design 3

- Material Web 的实现、样式覆写、token 与交互行为以 <https://material-web.dev/> 为首要依据。
- `public/theme/` 来自 Material Theme Builder，禁止手动修改。
- 可见 UI 主题颜色必须使用主题文件提供的 CSS 变量；静态品牌资源、透明色和遮罩除外。
- `public/` 下的主题文件只能在 HTML 中通过 `<link>` 引入，不得在 JS 或 CSS 中 `import` 或 `@import`。
- 页面布局采用无可见边框的 MD3 风格。

## 本地化与资源

- 主要语言为简体中文（zh-CN）。
- 仅需支持 Chrome。
- 字体和静态资源必须本地托管，不得使用外部 CDN。

## 代码格式

- 除包管理器自动维护的 JSON 文件外，统一使用 4 个半角空格缩进。
- 修改前先定位相关调用和生成流程；修改后至少执行生产构建。
- 不提交临时测试构件、生成的文档数据或构建产物。
