# VRChatAvatarLearn Docs 编写规范

> 本文面向 **VRChatAvatarLearn-Docs** 仓库维护者，说明文档目录、Markdown 写法、目录命名、排序和站点导入规则。

## 1. 目录结构

文档仓库使用 `docs/` 作为文档根目录，按“语言目录 -> 文档文件/子目录”组织。

推荐结构示例：

```text
docs/
    zh-cn/
        index.md
        start/
            index.md
            introduction.md
            install-unity.md
        basics/
            index.md
            unity-basics.md
    en-us/
        index.md
```

说明：

- 语言目录名建议使用全小写且包含地区代号，如 `zh-cn`、`en-us`。
- 每篇文档是一个 `.md` 文件。
- 每个语言目录和子目录都可以放 `index.md`。
- `docs/<lang>/index.md` 是该语言的文档首页来源，对应 `/docs/<lang>`。
- 子目录下的 `index.md` 是该目录分组的落地页来源，对应 `/docs/<lang>/<group>`。
- 各级 `index.md` 同时提供所在目录的 H1 分组名和 H2 同层排序序列。

## 2. 与站点构建联动

站点仓库 `CQMHV/VRChatAvatarLearn-Website` 在 `predev` / `prebuild` 阶段运行 `scripts/fetch-docs.mjs` 拉取本文档仓库。

导入脚本当前行为：

- 通过 `DOCS_REPO_URL` 指定文档仓库地址。
- 通过 `DOCS_REPO_REF` 指定 Git 分支或引用，未设置时默认 `main`。
- 通过 `DOCS_REPO_SUBDIR` 指定文档根目录，未设置时默认 `docs`。
- 扫描 `docs/` 下所有一级目录作为语言集合。
- 复制 `docs/<lang>/` 下所有文件到站点的 `public/docs-content/docs/<lang>/`。
- 生成 `public/docs-content/index.json`，供网页侧边栏、文档首页和文档详情页使用。

因此 docs 仓库侧建议：

- 文档和图片等资源都放在 `docs/<lang>/...` 路径内。
- 图片和附件使用相对路径引用。
- 不要依赖未复制到语言目录内的外部本地资源。

## 3. 标题与导航来源

### 3.1 页面标题

每篇文档标题以该 Markdown 文件中的 `# ` 一级标题为准。

示例：

```md
# 快速开始

这里是正文。
```

这篇文档在网页中的显示标题就是“快速开始”。

规则细节：

- 导入索引时，脚本会读取首个不在代码块内的 H1 作为 `index.json` 标题。
- 网页渲染时，会把正文中的主 H1 抽出作为页面标题，并从正文中移除，避免页面标题重复显示。
- 导入索引支持 ATX 结束井号，但页面渲染会直接使用 H1 文本；建议统一写 `# 快速开始`，不要写 `# 快速开始 #`。
- 标题最长保留 200 个字符。
- 无 H1 时会回退为文件名最后一段，但不推荐依赖回退。
- 不要在文档开头的代码示例中放看起来像 H1 的行，以免影响页面标题提取。

### 3.2 文件夹分组标题

文件夹分组标题来自该文件夹内 `index.md` 的首个 H1。

例如：

- `docs/zh-cn/start/index.md` 的 H1 是 `# 开始`
- 则侧边栏中 `start` 分组显示为“开始”

如果某个目录没有 `index.md` 或 `index.md` 没有 H1，则分组名回退为目录名。

## 4. 目录排序规则

当前导入脚本不再读取 `manifest.json`。目录排序统一由各目录的 `index.md` 中的 H2 序列控制。

注意：H2 排序序列也是 `index.md` 正文内容的一部分，会在文档首页或分组落地页中显示。编写时应让这些 H2 同时具备“章节入口”的阅读意义。

### 4.1 根目录排序

使用 `docs/<lang>/index.md` 的 H2 对语言根目录下的直接文档和直接分组排序。

示例：

```md
# 中文文档

## [开始](start/index.md)

## [基本知识](basics/index.md)
```

上例会让 `start` 分组排在 `basics` 分组之前。`docs/<lang>/index.md` 也会作为文档首页渲染到 `/docs/<lang>`，其中的主 H1
会作为首页标题。

### 4.2 子目录排序

使用该子目录自己的 `index.md` 的 H2 对该目录下的直接文档和直接子分组排序。

示例：

```md
# 开始

## [引言](introduction.md)

## [安装 Unity](install-unity.md)

## [安装 ALCOM](install-alcom.md)
```

上例会排序：

- `docs/zh-cn/start/index.md`，可通过 `/docs/zh-cn/start` 打开
- `docs/zh-cn/start/introduction.md`
- `docs/zh-cn/start/install-unity.md`
- `docs/zh-cn/start/install-alcom.md`

### 4.3 推荐的 H2 写法

排序项推荐使用链接形式，并统一写向 `.md` 文件：

```md
## [显示名](相对路径.md)
```

路径规则：

- 路径相对当前 `index.md` 所在目录。
- 普通文档写 Markdown 文件路径，如 `install-unity.md`。
- 目录分组写该目录的 `index.md`，如 `basics/index.md`。
- 虽然脚本兼容不带 `.md` 的 slug，但规范中应使用 `.md` 后缀；这样更符合 Markdown 链接习惯，也便于本地编辑器跳转。
- 可写 `./install-unity.md`，脚本会自动归一化。
- 路径末尾的 `/index` 会自动归一化为目录落地页或分组路径。
- 不允许空路径、`../`、`.`、连续斜杠等上级跳转或异常路径。

仍兼容纯文本 H2：

```md
## 引言
```

纯文本 H2 会按同层文档标题或分组标题匹配。若同层标题重复，匹配不稳定，因此不推荐。

### 4.4 未排序项目

同层排序规则：

- 已被 H2 序列命中的项目排在前面，按 H2 出现顺序排列。
- 未被 H2 序列命中的项目排在后面。
- 同条件下按显示名使用 `zh-CN` 语言规则排序。

如果 H2 未匹配任何同层文档或分组，站点构建时会输出警告，但不会中断构建。

## 5. manifest.json

`manifest.json` 已不再参与当前站点导入流程。

请不要再为标题、分组名或排序维护 `manifest.json`。如仓库中存在历史 `manifest.json`，当前导入脚本会忽略它。

新规则对应关系：

- 文档标题：来自文档 H1。
- 分组标题：来自目录 `index.md` 的 H1。
- 同层排序：来自目录 `index.md` 的 H2 序列。

## 6. 侧边栏生成规则

网页侧会按 `slug` 的 `/` 分层构建树形目录：

- 叶子节点：具体文档。
- 中间节点：目录分组。
- 目录 `index.md` 不再作为分组下的普通子项显示，而是作为该分组标题链接。
- 第一层分组直接显示为分组块。
- 更深层级分组使用可展开折叠结构。

显示名来源：

- 文档节点：该文档 H1。
- 分组节点：该分组 `index.md` 的 H1；没有时回退目录名。

路由归一化：

- `docs/<lang>/index.md`、`/docs/<lang>/index`、`/docs/<lang>/_home` 都归一化为 `/docs/<lang>`。
- `docs/<lang>/<group>/index.md` 和 `/docs/<lang>/<group>/index` 都归一化为 `/docs/<lang>/<group>`。
- 反斜杠会归一化为正斜杠。

排序来源：

- 文档节点：同目录 `index.md` 的 H2 序列。
- 分组节点：父目录 `index.md` 的 H2 序列。
- 分组自身没有显式 `groupOrders` 时，会使用其 `index.md` 文档项的排序值。

## 7. Markdown 支持

网页使用 `markdown-it` 渲染 Markdown，当前配置为：

- `html: false`：不会渲染原始 HTML。
- `linkify: true`：可自动识别普通链接。
- `breaks: true`：普通换行会转为 `<br>`。

当前建议使用的语法：

- 标题：`#`、`##`、`###`
- 普通段落：直接写文本
- 无序列表：`- 项目`
- 有序列表：`1. 项目`
- 行内代码：`` `code` ``
- 代码块：

    ````md
    ```js
    console.log('hello');
    ```
    ````

- 链接：`[链接文字](https://example.com)` 或站内路径链接
- 图片：`![图片说明](./images/example.png)`
- 加粗：`**加粗**`
- 斜体：`*斜体*`
- 粗斜体：`***粗斜体***`

注意：

- 不要在文档中写原始 HTML，当前渲染器会转义。
- 链接协议仅建议使用 `http:`、`https:`、`mailto:`、站内相对路径或锚点。
- `//example.com` 形式的协议相对链接会被拒绝。

## 8. 链接与资源路径

### 8.1 文档链接

普通 Markdown 链接会在渲染时自动归一化：

```md
[安装 Unity](./install-unity.md)
[返回开始](../start/index.md)
[中文首页](/docs/zh-cn/index.md)
```

渲染后会变成站内文档路由：

- `./install-unity.md` -> `/docs/<lang>/<current-dir>/install-unity`
- `../start/index.md` -> `/docs/<lang>/start`
- `/docs/zh-cn/index.md` -> `/docs/zh-cn`

建议：

- 文档之间优先使用相对路径和 `.md` 后缀，便于本地阅读和站点自动归一化。
- 锚点链接如 `#某个标题` 会原样保留。
- 外部链接使用完整 `https://...`。

### 8.2 非 Markdown 资源链接

如果链接目标带有非 `.md` 扩展名，会按资源处理，指向 `docs-content` 下复制后的文件。

示例：

```md
[下载示例文件](./files/example.zip)
```

渲染后会指向类似：

```text
/docs-content/docs/zh-cn/current-dir/files/example.zip
```

## 9. 图片写法与样式

### 9.1 Markdown 写法

使用标准 Markdown 图片：

```md
![图片说明](./images/example.png)
```

建议：

- 使用相对当前 `.md` 文件的相对路径。
- 图片文件放在同语言目录内，便于与文档一并被构建流程复制。
- 相对图片路径会自动归一化为 `/docs-content/docs/<lang>/...` 下的资源路径。
- `/docs/<lang>/...` 或 `/docs-content/docs/<lang>/...` 开头的图片路径也会被归一化到可访问的 `docs-content` 资源路径。

### 9.2 网页中的默认图片样式

当前网页默认行为：

- 图片最大宽度不超过正文宽度，自适应缩放。
- 图片按块级元素居中显示。
- 保留圆角风格。

## 10. 扩展语法

### 10.1 卡片容器

普通卡片：

```md
:::card
这里是普通卡片内容。
:::
```

重点卡片：

```md
:::card emphasis
这里是重点提示。
:::
```

警告卡片：

```md
:::card warning
这里是警告信息。
:::
```

仅支持 `normal`、`emphasis`、`warning` 三种变体。其中普通卡片写 `:::card` 即可。

### 10.2 按钮组

```md
:::actions

- [立即开始学习](/docs)
- [加入社区](/about)
:::
```

渲染行为：

- 每一条合法 Markdown 链接会渲染为一个按钮。
- 按钮容器横向排列并可自动换行。
- 只有一个按钮时也使用同一语法。
- 非链接行会被忽略。
- 按钮链接同样会按第 8 节规则归一化。

## 11. 推荐维护流程

1. 在 `docs/<lang>/...` 下新增或修改 `.md` 文档，并为每篇文档写首个 H1。
2. 为每个需要命名或排序的目录维护 `index.md`。
3. 在语言根 `index.md` 中编写文档首页内容，并用 H2 链接序列控制根目录排序。
4. 在子目录 `index.md` 中编写分组落地页内容，并用 H2 链接序列控制该目录排序。
5. 不再维护 `manifest.json` 排序。
6. 最后在站点侧运行构建或开发服务，检查导入警告、文档首页、分组链接、侧边栏排序、按钮、卡片与图片展示效果。
