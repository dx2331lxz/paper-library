import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 网页端上传 PDF：写入 GitHub 仓库 papers/{id}/{original|translation}.pdf，
// 并同步更新 library.json。需要 Vercel 环境变量 GITHUB_TOKEN
//（对该仓库有 contents 读写权限的 fine-grained PAT）。
const MAX_BYTES = 4 * 1024 * 1024; // Vercel serverless 请求体上限约 4.5MB，留余量

type PaperEntry = {
  id: string;
  title: string;
  titleZh?: string;
  authors: string[];
  year?: number;
  category: string;
  tags: string[];
  abstract?: string;
  sourceUrl?: string;
  sourcePath?: string;
  translationPath?: string;
  status: "translated" | "original-only";
  updatedAt?: string;
};

function ghHeaders() {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  };
}

async function putFile(owner: string, repo: string, branch: string, path: string, base64: string, message: string) {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encoded}?ref=${encodeURIComponent(branch)}`, {
    headers: ghHeaders(),
  });
  let sha: string | undefined;
  if (getRes.ok) {
    const data = await getRes.json();
    sha = data.sha;
  } else if (getRes.status !== 404) {
    throw new Error(`读取 GitHub 文件状态失败 (${getRes.status})`);
  }
  const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encoded}`, {
    method: "PUT",
    headers: { ...ghHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ message, content: base64, branch, ...(sha ? { sha } : {}) }),
  });
  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`GitHub 写入失败 (${putRes.status})：${err.slice(0, 200)}`);
  }
}

export async function POST(request: NextRequest) {
  if (!process.env.GITHUB_TOKEN) {
    return NextResponse.json(
      { error: "未配置 GITHUB_TOKEN，无法写入 GitHub。请在 Vercel 环境变量中添加对该仓库有 contents 读写权限的 token。" },
      { status: 500 }
    );
  }
  const params = request.nextUrl.searchParams;
  const owner = params.get("owner") || process.env.GITHUB_OWNER || "dx2331lxz";
  const repo = params.get("repo") || process.env.GITHUB_REPO || "paper-library";
  const branch = params.get("branch") || process.env.GITHUB_BRANCH || "main";

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "无法解析上传内容" }, { status: 400 });
  }

  const file = form.get("file");
  const kind = form.get("kind");
  const paperId = String(form.get("paperId") || "").trim();
  const metaRaw = form.get("meta");

  if (!(file instanceof File)) return NextResponse.json({ error: "请选择 PDF 文件" }, { status: 400 });
  if (!/\.pdf$/i.test(file.name)) return NextResponse.json({ error: "只支持 PDF 文件" }, { status: 400 });
  if (file.size > MAX_BYTES)
    return NextResponse.json({ error: `文件过大（${(file.size / 1048576).toFixed(1)}MB），单次上传限制 4MB` }, { status: 400 });
  if (kind !== "original" && kind !== "translation")
    return NextResponse.json({ error: "kind 必须为 original（原文）或 translation（译文）" }, { status: 400 });
  if (!/^[a-z0-9][a-z0-9-]*$/.test(paperId))
    return NextResponse.json({ error: "论文 ID 只能用小写字母、数字和连字符" }, { status: 400 });

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const pdfPath = `papers/${paperId}/${kind === "original" ? "original.pdf" : "translation.pdf"}`;

  try {
    await putFile(owner, repo, branch, pdfPath, base64, `上传 ${paperId} 的${kind === "original" ? "原文" : "译文"} PDF`);

    const libRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/library.json?ref=${encodeURIComponent(branch)}`,
      { headers: ghHeaders() }
    );
    let library: PaperEntry[] = [];
    let libSha: string | undefined;
    if (libRes.ok) {
      const data = await libRes.json();
      libSha = data.sha;
      const parsed: unknown = JSON.parse(Buffer.from(data.content, "base64").toString("utf8"));
      if (Array.isArray(parsed)) library = parsed as PaperEntry[];
    } else if (libRes.status !== 404) {
      throw new Error(`读取 library.json 失败 (${libRes.status})`);
    }

    const today = new Date().toISOString().slice(0, 10);
    const idx = library.findIndex((p) => p.id === paperId);
    if (idx >= 0) {
      const entry = { ...library[idx] };
      if (kind === "original") entry.sourcePath = pdfPath;
      else entry.translationPath = pdfPath;
      entry.status = entry.translationPath ? "translated" : "original-only";
      entry.updatedAt = today;
      library[idx] = entry;
    } else {
      let meta: Record<string, unknown> = {};
      try {
        meta = JSON.parse(String(metaRaw || "{}"));
      } catch {
        /* 用默认值 */
      }
      const asStr = (v: unknown) => (typeof v === "string" ? v : "");
      const asArr = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);
      library.push({
        id: paperId,
        title: asStr(meta.title) || paperId,
        titleZh: asStr(meta.titleZh) || undefined,
        authors: asArr(meta.authors),
        year: Number(meta.year) || undefined,
        category: asStr(meta.category) || "未分类",
        tags: asArr(meta.tags),
        abstract: asStr(meta.abstract) || undefined,
        sourceUrl: asStr(meta.sourceUrl) || undefined,
        sourcePath: kind === "original" ? pdfPath : undefined,
        translationPath: kind === "translation" ? pdfPath : undefined,
        status: kind === "translation" ? "translated" : "original-only",
        updatedAt: today,
      });
    }

    const libContent = Buffer.from(JSON.stringify(library, null, 2) + "\n").toString("base64");
    const putLib = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/library.json`, {
      method: "PUT",
      headers: { ...ghHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `更新 library.json（${paperId} ${kind}）`,
        content: libContent,
        branch,
        ...(libSha ? { sha: libSha } : {}),
      }),
    });
    if (!putLib.ok) {
      const err = await putLib.text();
      throw new Error(`library.json 更新失败 (${putLib.status})：${err.slice(0, 200)}`);
    }

    return NextResponse.json({ ok: true, path: pdfPath, paperId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "上传失败" }, { status: 500 });
  }
}
