# Paper Shelf

Paper Shelf 是一个部署在 Vercel 上的论文资料库前端，用来集中管理论文原文 PDF 和中文译文 PDF。它从 GitHub 仓库读取资料，因此论文文件只需要维护一份，网站每次同步时会自动更新。

## 本地运行

```bash
npm install
npm run dev
```

打开 <http://localhost:3000>。

## GitHub 仓库结构

在论文仓库根目录放置 `library.json`，并把 PDF 放在仓库内。`library.example.json` 是最小示例：

```text
paper-library/
├── library.json
└── papers/
    └── attention-is-all-you-need/
        ├── original.pdf
        └── zh.pdf
```

`sourcePath` 和 `translationPath` 会自动转换为 GitHub Raw 地址，所以不需要手写 `sourceUrl` / `translationUrl`。如果没有 `library.json`，API 会自动扫描仓库中所有 `.pdf` 文件，并按文件夹合并原文与译文。

## `library.json` 字段

| 字段 | 说明 |
| --- | --- |
| `id` | 稳定的论文 ID |
| `title` | 英文标题 |
| `titleZh` | 中文标题 |
| `authors` | 作者数组 |
| `year` | 发表年份 |
| `category` | 研究领域 |
| `tags` | 标签数组 |
| `abstract` | 摘要或备注 |
| `sourcePath` | 原文 PDF 在仓库内的路径 |
| `translationPath` | 译文 PDF 在仓库内的路径 |
| `status` | `translated` 或 `original-only` |
| `updatedAt` | 最近更新时间，格式建议为 `YYYY-MM-DD` |

## Vercel 部署

把这个项目导入 Vercel 后，配置以下环境变量即可连接仓库：

```text
GITHUB_OWNER=你的 GitHub 用户名
GITHUB_REPO=论文仓库名
GITHUB_BRANCH=main
```

公开仓库不需要 Token。私有仓库需要配置一个有读取权限的 `GITHUB_TOKEN`。部署完成后，页面中的“仓库设置”也可以临时切换到另一份公开仓库，设置会保存在当前浏览器中。
