import { NextRequest, NextResponse } from "next/server";
import { demoPapers, inferPaperFromPdfPath, mergeInferredPapers, normalizePaper, type LibraryResponse, type Paper } from "@/lib/library";

export const dynamic = "force-dynamic";

type GitHubContent = { content?: string; encoding?: string; download_url?: string };
type GitTree = { tree?: Array<{ path?: string; type?: string; url?: string }> };

function getConfig(request: NextRequest) {
  const owner = request.nextUrl.searchParams.get("owner") || process.env.GITHUB_OWNER || "dx2331lxz";
  const repo = request.nextUrl.searchParams.get("repo") || process.env.GITHUB_REPO || "paper-library";
  const branch = request.nextUrl.searchParams.get("branch") || process.env.GITHUB_BRANCH || "main";
  return { owner, repo, branch };
}

function headers() {
  return {
    Accept: "application/vnd.github+json",
    ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function githubFetch<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: headers(), next: { revalidate: 0 } });
  if (!response.ok) throw new Error(`GitHub ${response.status}`);
  return response.json() as Promise<T>;
}

// 通过站内 /api/pdf 代理提供 PDF，统一以 application/pdf + inline 响应，
// 避免浏览器把 raw.githubusercontent.com 的 application/octet-stream 当成下载。
function toPdfUrl(owner: string, repo: string, branch: string, path: string) {
  return `/api/pdf?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&branch=${encodeURIComponent(branch)}&path=${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

async function fetchGithubLibrary(owner: string, repo: string, branch: string): Promise<Paper[]> {
  const pdfUrl = (path: string) => toPdfUrl(owner, repo, branch, path);
  try {
    const index = await githubFetch<GitHubContent>(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/library.json?ref=${encodeURIComponent(branch)}`);
    if (index.content && index.encoding === "base64") {
      const parsed: unknown = JSON.parse(Buffer.from(index.content, "base64").toString("utf8"));
      if (Array.isArray(parsed)) {
        return parsed.map((item) => {
          const paper = normalizePaper(item as Partial<Paper>, "paper");
          return normalizePaper({
            ...paper,
            sourceUrl: paper.sourceUrl || (paper.sourcePath ? pdfUrl(paper.sourcePath) : undefined),
            translationUrl: paper.translationUrl || (paper.translationPath ? pdfUrl(paper.translationPath) : undefined),
          }, paper.id);
        });
      }
    }
  } catch {
    // A missing index is expected for repositories that only contain PDFs.
  }

  const tree = await githubFetch<GitTree>(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
  const pdfs = (tree.tree || []).filter((item) => item.type === "blob" && item.path?.toLowerCase().endsWith(".pdf"));
  return mergeInferredPapers(pdfs.map((item) => inferPaperFromPdfPath(item.path || "paper.pdf", pdfUrl)));
}

export async function GET(request: NextRequest) {
  const { owner, repo: name, branch } = getConfig(request);
  const repo = { owner, repo: name, branch };
  try {
    const papers = await fetchGithubLibrary(owner, name, branch);
    const response: LibraryResponse = { papers, source: "github", repo, syncedAt: new Date().toISOString() };
    return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const response: LibraryResponse = {
      papers: demoPapers,
      source: "demo",
      repo,
      syncedAt: new Date().toISOString(),
      message: error instanceof Error ? `GitHub 暂不可用，当前展示示例数据（${error.message}）` : "GitHub 暂不可用，当前展示示例数据",
    };
    return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
  }
}
