import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// PDF 代理：把 GitHub raw 的 application/octet-stream 转成
// application/pdf + inline，让浏览器内联预览而不是自动下载。
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const owner = params.get("owner") || process.env.GITHUB_OWNER || "dx2331lxz";
  const repo = params.get("repo") || process.env.GITHUB_REPO || "paper-library";
  const branch = params.get("branch") || process.env.GITHUB_BRANCH || "main";
  const path = params.get("path") || "";

  if (!path.toLowerCase().endsWith(".pdf") || path.includes("..")) {
    return NextResponse.json({ error: "仅支持仓库内的 PDF 文件" }, { status: 400 });
  }

  const url = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(branch)}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
  const upstream = await fetch(url, {
    headers: process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {},
  });
  if (!upstream.ok) {
    return NextResponse.json({ error: `上游返回 ${upstream.status}` }, { status: upstream.status });
  }
  const buf = await upstream.arrayBuffer();
  const filename = path.split("/").pop() || "paper.pdf";
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
