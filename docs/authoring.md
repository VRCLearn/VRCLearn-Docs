# VRCLearn Docs 编写规范

> 本文面向 `VRCLearn-Docs` 维护者，说明文档目录、Markdown 写法、排序和文档站生成规则。

## 1. 仓库与站点边界

本仓库同时保存 Markdown 文档和文档站源码，并独立部署到 <https://docs.vrclearn.com>。

- 文档源文件位于 `content/`，按受众、主题和语言分层。
- 文档站源码位于 `src/`、`public/` 与 `scripts/`。
- `npm run dev` 和 `npm run build` 会直接读取本仓库文档，不会克隆远程仓库。
- `VRCLearn-Website` 只负责 <https://www.vrclearn.com> 主站，不编译文档。

## 2. 目录结构

文档按“文档类型 -> 语言 -> 一级分组 -> 页面”组织：

```text
content/
    creator/
        avatar/
            zh-cn/
                index.md
                start/
                    index.md
                    introduction.md
                    install-unity.md
                basics/
                    index.md
                    unity-basics.md
        world/
            zh-cn/
                index.md
    player/
        vrchat/
            zh-cn/
                index.md
```

当前声明的文档集为 `creator/avatar`、`creator/world` 和 `player/vrchat`。语言目录建议使用全小写语言标签，例如 `zh-cn`、`en-us`。

支持的 Markdown 路径层级：

- `content/{audience}/{topic}/{lang}/index.md`：该文档集和语言的首页。
- `content/{audience}/{topic}/{lang}/{group}/index.md`：一级分组首页。
- `content/{audience}/{topic}/{lang}/{group}/{page}.md`：一级分组内的普通文档。

语言根目录除 `index.md` 外不应放普通文档，也不支持更深的文档分组。生成脚本会忽略不符合上述结构的 Markdown 并输出警告。

## 3. 路由映射

- `content/creator/avatar/zh-cn/index.md` -> `/zh-cn/creator/avatar`
- `content/creator/avatar/zh-cn/start/index.md` -> `/zh-cn/creator/avatar/start`
- `content/creator/avatar/zh-cn/start/install-unity.md` -> `/zh-cn/creator/avatar/start/install-unity`
- `content/creator/world/zh-cn/index.md` -> `/zh-cn/creator/world`
- `content/player/vrchat/zh-cn/index.md` -> `/zh-cn/player/vrchat`

文档站根路径 `/` 是文档集入口，发布 `/{lang}/{audience}/{topic}` 与 `/{lang}/{audience}/{topic}/{slug}` 路由。旧版 `/avatar/{lang}` 与 `/world/{lang}` 路由不保留且不重定向。

## 4. 构建生成流程

`predev` 与 `prebuild` 会运行：

```bash
node scripts/generate-docs.mjs
```

脚本会：

1. 根据 `site.config.json` 中的 `docs.collections` 扫描 `content/{audience}/{topic}/{lang}/`。
2. 复制文档和同目录资源到 `public/docs-content/{audience}/{topic}/{lang}/`。
3. 读取 Markdown 标题和目录排序信息。
4. 生成 `public/docs-content/index.json`。
5. 生成供 React 使用的 `src/generated/docs-data.js`。

`public/docs-content/` 与 `src/generated/docs-data.js` 都是构建产物，不得手动修改或提交。

## 5. 标题与目录名称

### 5.1 页面标题

每篇文档的首个、不在代码块中的 H1 是页面标题：

```md
# 快速开始

这里是正文。
```

渲染时主 H1 会作为页面标题显示，并从正文中移除，避免重复。标题最长保留 200 个字符；缺少 H1 时会回退到文件名，但不建议依赖回退。

### 5.2 分组标题

一级分组名称来自该分组 `index.md` 的 H1。例如 `content/creator/avatar/zh-cn/start/index.md` 的 H1 为 `# 开始`，侧边栏就显示“开始”。缺少分组首页或 H1 时会回退到目录名，并在适用时输出构建警告。

## 6. 排序规则

目录排序由相应 `index.md` 的 H2 顺序控制，不使用 `manifest.json`。

语言首页控制一级分组顺序：

```md
# Avatar 中文文档

## [开始](start/index.md)

## [基本知识](basics/index.md)
```

分组首页控制组内文档顺序：

```md
# 开始

## [引言](introduction.md)

## [安装 Unity](install-unity.md)

## [安装 ALCOM](install-alcom.md)
```

排序链接应相对当前 `index.md`，并保留 `.md` 后缀，方便本地编辑器跳转。已匹配项目按 H2 出现顺序排列；未匹配项目随后按 `zh-CN` 显示名排序。无法匹配或重复匹配时，构建会输出警告但不中断。

虽然生成器能按同层标题匹配纯文本 H2，但标题重复时结果不稳定，因此应优先使用链接形式。

## 7. Markdown 支持

站点使用 `markdown-it`，主要配置为：

- `html: false`：原始 HTML 会被转义。
- `linkify: true`：自动识别普通链接。
- `breaks: true`：普通换行转换为 `<br>`。

推荐使用标准标题、段落、列表、代码、链接、图片、加粗和斜体语法。链接协议应使用 `http:`、`https:`、`mailto:`、站内相对路径或锚点；不要使用协议相对链接。

## 8. 文档链接

文档间优先使用相对路径和 `.md` 后缀：

```md
[安装 Unity](./install-unity.md)
[返回分组首页](./index.md)
[Avatar 中文首页](/zh-cn/creator/avatar/index.md)
```

生成后分别归一化为：

- `./install-unity.md` -> 当前分组的 `/install-unity` 页面。
- `./index.md` -> 当前分组首页。
- `/zh-cn/creator/avatar/index.md` -> `/zh-cn/creator/avatar`。

锚点链接会保留。外部链接使用完整 `https://...` 地址。

## 9. 图片与附件

图片和附件应放在对应语言目录内，并使用相对当前 Markdown 文件的路径：

```md
![Unity 安装界面](./images/install-unity.png)
[下载示例文件](./files/example.zip)
```

构建时资源会复制到：

```text
/docs-content/{audience}/{topic}/{lang}/...
```

相对图片和非 Markdown 附件链接会自动改写到该公开资源路径。不要依赖语言目录之外的本地文件。

网页默认限制图片不超过正文宽度、居中显示并使用 MD3 圆角。

## 10. 扩展语法

### 10.1 卡片

```md
:::card
普通卡片内容。
:::

:::card emphasis
重点内容。
:::

:::card warning
警告内容。
:::
```

仅支持 `normal`、`emphasis` 与 `warning`；普通卡片可省略 `normal`。

### 10.2 按钮组

```md
:::actions

- [Avatar 文档](/zh-cn/creator/avatar)
- [返回主站](https://www.vrclearn.com/)
:::
```

每条合法 Markdown 链接会渲染为一个按钮，按钮可横向排列并自动换行。非链接行会被忽略。

## 11. 推荐维护流程

1. 在 `content/{audience}/{topic}/{lang}/` 的受支持层级中新增或修改文档。
2. 为每篇文档写唯一、清晰的首个 H1。
3. 为每个一级分组维护 `index.md`，并用 H2 链接排列组内文档。
4. 在语言根 `index.md` 中编写首页内容，并用 H2 链接排列一级分组。
5. 将图片和附件放在对应语言目录内，使用相对路径引用。
6. 运行 `npm run build`，处理生成警告并检查首页、侧边栏、链接、卡片和资源展示。
