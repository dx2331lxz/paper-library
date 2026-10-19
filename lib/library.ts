import sampleLibrary from "@/data/sample-library.json";

export type PaperStatus = "translated" | "original-only";

export type Paper = {
  id: string;
  title: string;
  titleZh?: string;
  authors: string[];
  year?: number;
  category: string;
  tags: string[];
  abstract?: string;
  sourceUrl?: string;
  translationUrl?: string;
  sourcePath?: string;
  translationPath?: string;
  status: PaperStatus;
  updatedAt?: string;
};

export const demoPapers = sampleLibrary as Paper[];

export type LibraryResponse = {
  papers: Paper[];
  source: "github" | "demo";
  repo: { owner: string; repo: string; branch: string };
  syncedAt: string;
  message?: string;
};

export function normalizePaper(input: Partial<Paper>, fallbackId: string): Paper {
  const status = input.status === "translated" || input.translationPath || input.translationUrl ? "translated" : "original-only";
  return {
    id: input.id || fallbackId,
    title: input.title || fallbackId.replace(/[-_]/g, " "),
    titleZh: input.titleZh,
    authors: Array.isArray(input.authors) ? input.authors : [],
    year: input.year,
    category: input.category || "未分类",
    tags: Array.isArray(input.tags) ? input.tags : [],
    abstract: input.abstract,
    sourceUrl: input.sourceUrl,
    translationUrl: input.translationUrl,
    sourcePath: input.sourcePath,
    translationPath: input.translationPath,
    status,
    updatedAt: input.updatedAt,
  };
}

export function inferPaperFromPdfPath(path: string, toUrl: (path: string) => string): Paper {
  const parts = path.split("/");
  const filename = parts.at(-1)?.replace(/\.pdf$/i, "") || "paper";
  const folder = parts.length > 1 ? parts.at(-2) || filename : filename;
  const isTranslation = /(^|[-_.])(zh|cn|中文|translated|translation|译文)([-_.]|$)/i.test(filename) || /(^|\/)(zh|中文|translated|translation)(\/|$)/i.test(path);
  const stem = folder.replace(/[-_](zh|cn|中文|translated|translation|译文)$/i, "");
  const title = stem.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  const url = toUrl(path);
  return normalizePaper({
    id: stem.toLowerCase().replace(/[^a-z0-9]+/g, "-") || filename,
    title,
    titleZh: title,
    authors: [],
    category: parts.length > 2 ? parts[1] : "未分类",
    tags: [],
    sourceUrl: isTranslation ? undefined : url,
    translationUrl: isTranslation ? url : undefined,
    sourcePath: isTranslation ? undefined : path,
    translationPath: isTranslation ? path : undefined,
    updatedAt: undefined,
  }, stem);
}

export function mergeInferredPapers(papers: Paper[]): Paper[] {
  const byId = new Map<string, Paper>();
  for (const paper of papers) {
    const current = byId.get(paper.id);
    if (!current) {
      byId.set(paper.id, paper);
      continue;
    }
    byId.set(paper.id, normalizePaper({
      ...current,
      ...paper,
      sourceUrl: current.sourceUrl || paper.sourceUrl,
      translationUrl: current.translationUrl || paper.translationUrl,
      sourcePath: current.sourcePath || paper.sourcePath,
      translationPath: current.translationPath || paper.translationPath,
      status: current.sourceUrl && (current.translationUrl || paper.translationUrl) ? "translated" : paper.status,
    }, current.id));
  }
  return Array.from(byId.values());
}
