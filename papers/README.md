# PDF 文件目录

每篇论文建议使用一个文件夹，同时放入原文和译文：

```text
papers/
└── attention-is-all-you-need/
    ├── original.pdf
    └── zh.pdf
```

然后在根目录的 `library.json` 里填入对应的 `sourcePath` 和 `translationPath`。文件名中的 `zh`、`中文`、`translated` 或 `translation` 也会被无索引扫描模式识别为译文。
