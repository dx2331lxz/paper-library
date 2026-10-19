"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Command,
  Copy,
  ExternalLink,
  FileText,
  Filter,
  Github,
  Languages,
  Library,
  LoaderCircle,
  Menu,
  MoreHorizontal,
  PanelRightOpen,
  RefreshCw,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Upload,
  Tag,
  X,
} from "lucide-react";
import type { LibraryResponse, Paper } from "@/lib/library";

type Mode = "all" | "translated" | "original-only";

const initialRepo = {
  owner: process.env.NEXT_PUBLIC_GITHUB_OWNER || "dx2331lxz",
  repo: process.env.NEXT_PUBLIC_GITHUB_REPO || "paper-library",
  branch: process.env.NEXT_PUBLIC_GITHUB_BRANCH || "main",
};

function formatDate(value?: string) {
  if (!value) return "未记录";
  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function fileName(paper: Paper, translated: boolean) {
  const path = translated ? paper.translationPath : paper.sourcePath;
  return path?.split("/").at(-1) || (translated ? "translation.pdf" : "original.pdf");
}

function statLabel(number: number, label: string) {
  return <div className="stat"><strong>{number}</strong><span>{label}</span></div>;
}

export default function Home() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [source, setSource] = useState<LibraryResponse["source"]>("demo");
  const [repo, setRepo] = useState(initialRepo);
  const [syncedAt, setSyncedAt] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>("all");
  const [category, setCategory] = useState("全部领域");
  const [selected, setSelected] = useState<Paper>();
  const [previewLanguage, setPreviewLanguage] = useState<"translation" | "source">("translation");
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  async function sync(nextRepo = repo) {
    setIsLoading(true);
    setMessage(undefined);
    try {
      const params = new URLSearchParams(nextRepo);
      const response = await fetch(`/api/library?${params.toString()}`, { cache: "no-store" });
      const data = (await response.json()) as LibraryResponse;
      setPapers(data.papers);
      setSource(data.source);
      setRepo(data.repo);
      setSyncedAt(data.syncedAt);
      setMessage(data.message);
      if (data.papers.length && !selected) setSelected(data.papers[0]);
    } catch {
      setMessage("同步失败，请检查仓库名称和网络连接");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const saved = window.localStorage.getItem("paper-shelf-repo");
    const nextRepo = saved ? { ...initialRepo, ...JSON.parse(saved) } : initialRepo;
    setRepo(nextRepo);
    sync(nextRepo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = useMemo(() => ["全部领域", ...Array.from(new Set(papers.map((paper) => paper.category).filter(Boolean)))], [papers]);
  const translatedCount = papers.filter((paper) => paper.status === "translated").length;
  const filteredPapers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return papers.filter((paper) => {
      const matchesMode = mode === "all" || paper.status === mode;
      const matchesCategory = category === "全部领域" || paper.category === category;
      const haystack = [paper.title, paper.titleZh, paper.abstract, paper.category, paper.authors.join(" "), paper.tags.join(" ")].filter(Boolean).join(" ").toLowerCase();
      return matchesMode && matchesCategory && (!normalized || haystack.includes(normalized));
    });
  }, [category, mode, papers, query]);

  useEffect(() => {
    if (selected && filteredPapers.some((paper) => paper.id === selected.id)) return;
    setSelected(filteredPapers[0]);
  }, [filteredPapers, selected]);

  function saveRepo(nextRepo: typeof repo) {
    setRepo(nextRepo);
    window.localStorage.setItem("paper-shelf-repo", JSON.stringify(nextRepo));
    setIsSettingsOpen(false);
    sync(nextRepo);
  }

  const selectedUrl = selected ? (previewLanguage === "translation" ? selected.translationUrl || selected.sourceUrl : selected.sourceUrl || selected.translationUrl) : undefined;
  const selectedHasTranslation = Boolean(selected?.translationUrl || selected?.translationPath);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <button className="mobile-menu icon-button" aria-label="打开导航" onClick={() => setIsMobileNavOpen((value) => !value)}><Menu size={20} /></button>
          <a className="brand" href="#top" aria-label="Paper Shelf 首页"><span className="brand-mark"><Library size={17} /></span><span>Paper Shelf</span></a>
          <nav className={`topnav ${isMobileNavOpen ? "is-open" : ""}`}>
            <a className="active" href="#library">我的论文库</a>
            <a href="#recent">最近更新</a>
            <a href="#about">仓库说明</a>
          </nav>
          <div className="topbar-actions">
            <button className="icon-button quiet" aria-label="帮助"><CircleHelp size={18} /></button>
            <button className="profile-button" aria-label="账户菜单"><span>DX</span><ChevronDown size={15} /></button>
          </div>
        </div>
      </header>

      <div className="page" id="top">
        <aside className={`sidebar ${isMobileNavOpen ? "is-open" : ""}`}>
          <div className="sidebar-section repo-card" id="about">
            <div className="repo-card-head"><span className="github-icon"><Github size={16} /></span><span className="eyebrow">GITHUB REPOSITORY</span><button className="icon-button tiny" onClick={() => setIsSettingsOpen(true)} aria-label="配置仓库"><Settings2 size={15} /></button></div>
            <div className="repo-name">{repo.owner} / {repo.repo}</div>
            <div className="repo-meta"><span className="status-dot" />{source === "github" ? "已连接" : "示例数据"}<span className="branch">{repo.branch}</span></div>
            <button className="sync-button" onClick={() => sync()} disabled={isLoading}><RefreshCw size={15} className={isLoading ? "spin" : ""} />{isLoading ? "同步中" : "立即同步"}</button>
          </div>

          <div className="sidebar-section">
            <div className="section-label">资料库</div>
            <button className={`side-link ${mode === "all" ? "selected" : ""}`} onClick={() => setMode("all")}><BookOpen size={16} /><span>全部论文</span><b>{papers.length}</b></button>
            <button className={`side-link ${mode === "translated" ? "selected" : ""}`} onClick={() => setMode("translated")}><Languages size={16} /><span>已有译文</span><b>{translatedCount}</b></button>
            <button className={`side-link ${mode === "original-only" ? "selected" : ""}`} onClick={() => setMode("original-only")}><FileText size={16} /><span>待翻译</span><b>{papers.length - translatedCount}</b></button>
          </div>

          <div className="sidebar-section category-section">
            <div className="section-label"><span>领域</span><button className="icon-button tiny" aria-label="领域筛选"><SlidersHorizontal size={14} /></button></div>
            {categories.map((item) => <button key={item} className={`category-link ${category === item ? "selected" : ""}`} onClick={() => setCategory(item)}><span className="category-dot" />{item}<b>{item === "全部领域" ? papers.length : papers.filter((paper) => paper.category === item).length}</b></button>)}
          </div>

          <div className="sidebar-footer"><div className="storage-label"><span>资料库状态</span><span>{papers.length} 份</span></div><div className="storage-bar"><span style={{ width: `${Math.min(100, Math.max(18, translatedCount / Math.max(papers.length, 1) * 100))}%` }} /></div><div className="storage-note"><Clock3 size={13} />上次同步 {syncedAt ? formatDate(syncedAt) : "--"}</div></div>
        </aside>

        <section className="content" id="library">
          <div className="content-head">
            <div><div className="breadcrumb"><span>工作台</span><span>/</span><strong>我的论文库</strong></div><h1>论文库</h1><p className="subtitle">原文与译文，集中在一个安静的阅读空间。</p></div>
            <div className="head-actions"><button className="secondary-button" onClick={() => setIsUploadOpen(true)}><Upload size={16} />上传论文</button><button className="secondary-button" onClick={() => setIsSettingsOpen(true)}><Settings2 size={16} />仓库设置</button><button className="primary-button" onClick={() => sync()} disabled={isLoading}><RefreshCw size={16} className={isLoading ? "spin" : ""} />同步仓库</button></div>
          </div>

          <div className="stats-row"><div className="stats-block"><div className="stats-icon blue"><FileText size={18} /></div>{statLabel(papers.length, "全部论文")}</div><div className="stats-block"><div className="stats-icon green"><Languages size={18} /></div>{statLabel(translatedCount, "已有译文")}</div><div className="stats-block"><div className="stats-icon amber"><Clock3 size={18} /></div>{statLabel(papers.length - translatedCount, "待翻译")}</div><div className="stats-block"><div className="stats-icon violet"><Sparkles size={18} /></div>{statLabel(categories.length - 1, "研究领域")}</div></div>

          <div className="toolbar"><div className="search-box"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、作者、标签…" aria-label="搜索论文" /><kbd><Command size={11} />K</kbd></div><div className="toolbar-actions"><div className="view-note"><Filter size={15} /><span>{filteredPapers.length} 篇结果</span></div><button className="icon-button bordered" aria-label="更多筛选"><MoreHorizontal size={18} /></button></div></div>

          {message && <div className="notice"><CircleHelp size={16} /><span>{message}</span><button className="icon-button tiny" onClick={() => setMessage(undefined)} aria-label="关闭提示"><X size={15} /></button></div>}

          <div className="paper-layout">
            <div className="paper-list" id="recent">
              <div className="list-head"><span>论文</span><span>年份</span><span>状态</span><span>操作</span></div>
              {isLoading && !papers.length ? <div className="empty-state"><LoaderCircle size={24} className="spin" /><span>正在读取论文库…</span></div> : filteredPapers.length ? filteredPapers.map((paper) => <PaperRow key={paper.id} paper={paper} selected={selected?.id === paper.id} onSelect={() => { setSelected(paper); setPreviewLanguage(paper.translationUrl ? "translation" : "source"); }} />) : <div className="empty-state"><Search size={24} /><strong>没有匹配的论文</strong><span>换一个关键词或筛选条件试试</span></div>}
            </div>

            <aside className="preview-panel" aria-label="论文预览">
              {selected ? <><div className="preview-head"><div><span className="eyebrow">QUICK PREVIEW</span><h2>{selected.titleZh || selected.title}</h2><p>{selected.authors.slice(0, 3).join(", ") || "作者信息未记录"}{selected.authors.length > 3 ? " 等" : ""}</p></div><button className="icon-button bordered" aria-label="关闭预览" onClick={() => setSelected(undefined)}><X size={17} /></button></div><div className="preview-switch"><button className={previewLanguage === "translation" ? "active" : ""} onClick={() => setPreviewLanguage("translation")} disabled={!selectedHasTranslation}><Languages size={14} />译文</button><button className={previewLanguage === "source" ? "active" : ""} onClick={() => setPreviewLanguage("source")}><FileText size={14} />原文</button></div><div className="pdf-frame">{selectedUrl ? <iframe title={`${selected.title} PDF`} src={`${selectedUrl}#view=FitH`} /> : <div className="pdf-empty"><FileText size={28} /><span>这个条目还没有 PDF 地址</span><small>请在 library.json 中补充 sourcePath 或 sourceUrl</small></div>}</div><div className="preview-footer"><div className="file-meta"><span className="pdf-badge">PDF</span><div><strong>{fileName(selected, previewLanguage === "translation")}</strong><span>{previewLanguage === "translation" && selectedHasTranslation ? "中文译文" : "英文原文"} · {selected.year || "年份未知"}</span></div></div><div className="preview-actions">{selectedUrl && <a className="icon-button bordered" href={selectedUrl} target="_blank" rel="noreferrer" aria-label="在新标签页打开"><ExternalLink size={17} /></a>} {selectedUrl && <a className="primary-button compact" href={selectedUrl} download><ArrowDownToLine size={16} />下载</a>}</div></div></> : <div className="preview-placeholder"><PanelRightOpen size={24} /><strong>选择一篇论文</strong><span>预览和下载会显示在这里</span></div>}
            </aside>
          </div>
        </section>
      </div>

      {isSettingsOpen && <RepoModal repo={repo} onClose={() => setIsSettingsOpen(false)} onSave={saveRepo} />}
      {isUploadOpen && <UploadModal papers={papers} repo={repo} onClose={() => setIsUploadOpen(false)} onDone={() => { setIsUploadOpen(false); sync(); }} />}
    </main>
  );
}

function PaperRow({ paper, selected, onSelect }: { paper: Paper; selected: boolean; onSelect: () => void }) {
  return <article className={`paper-row ${selected ? "selected" : ""}`} onClick={onSelect}><div className="paper-info"><div className="paper-icon"><FileText size={18} /></div><div className="paper-copy"><h3>{paper.titleZh || paper.title}</h3><p>{paper.titleZh ? paper.title : paper.authors.join(", ") || "作者未记录"}</p><div className="tag-list">{paper.tags.slice(0, 3).map((tag) => <span key={tag}><Tag size={11} />{tag}</span>)}</div></div></div><div className="paper-year">{paper.year || "--"}</div><div>{paper.status === "translated" ? <span className="pill translated"><Check size={12} />已译</span> : <span className="pill pending">待翻译</span>}</div><button className="row-action" onClick={(event) => { event.stopPropagation(); onSelect(); }} aria-label="预览论文"><PanelRightOpen size={17} /></button></article>;
}

function RepoModal({ repo, onClose, onSave }: { repo: typeof initialRepo; onClose: () => void; onSave: (repo: typeof initialRepo) => void }) {
  const [draft, setDraft] = useState(repo);
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="repo-modal-title"><div className="modal-head"><div><span className="eyebrow">SOURCE SETTINGS</span><h2 id="repo-modal-title">连接 GitHub 仓库</h2></div><button className="icon-button bordered" onClick={onClose} aria-label="关闭"><X size={17} /></button></div><p className="modal-copy">网站会读取仓库里的 <code>library.json</code>；没有索引文件时，会自动扫描所有 PDF。</p><label>Owner<input value={draft.owner} onChange={(event) => setDraft({ ...draft, owner: event.target.value })} placeholder="例如 dx2331lxz" /></label><label>Repository<input value={draft.repo} onChange={(event) => setDraft({ ...draft, repo: event.target.value })} placeholder="例如 paper-library" /></label><label>Branch<input value={draft.branch} onChange={(event) => setDraft({ ...draft, branch: event.target.value })} placeholder="main" /></label><div className="modal-actions"><button className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" onClick={() => onSave(draft)}><Github size={16} />保存并同步</button></div></div></div>;
}

function UploadModal({ papers, repo, onClose, onDone }: { papers: Paper[]; repo: typeof initialRepo; onClose: () => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<"original" | "translation">("translation");
  const [target, setTarget] = useState<string>("__new__");
  const [paperId, setPaperId] = useState("");
  const [title, setTitle] = useState("");
  const [titleZh, setTitleZh] = useState("");
  const [authors, setAuthors] = useState("");
  const [year, setYear] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const isNew = target === "__new__";
  const effectiveId = isNew ? paperId.trim().toLowerCase() : target;

  async function submit() {
    setError(undefined);
    if (!file) { setError("请先选择 PDF 文件"); return; }
    if (!/\.pdf$/i.test(file.name)) { setError("只支持 PDF 文件"); return; }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(effectiveId)) { setError("论文 ID 只能用小写字母、数字和连字符（新建时填写）"); return; }
    if (isNew && !title.trim()) { setError("新建论文请填写英文标题"); return; }
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", kind);
      form.append("paperId", effectiveId);
      if (isNew) {
        form.append("meta", JSON.stringify({
          title: title.trim(),
          titleZh: titleZh.trim() || undefined,
          authors: authors.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
          year: year.trim() || undefined,
          category: category.trim() || undefined,
          tags: tags.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
        }));
      }
      const params = new URLSearchParams(repo);
      const res = await fetch(`/api/upload?${params.toString()}`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "上传失败");
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "上传失败");
    } finally {
      setBusy(false);
    }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="upload-modal-title"><div className="modal-head"><div><span className="eyebrow">UPLOAD PDF</span><h2 id="upload-modal-title">上传论文 PDF</h2></div><button className="icon-button bordered" onClick={onClose} aria-label="关闭"><X size={17} /></button></div><p className="modal-copy">PDF 会写入仓库 <code>papers/{"{id}"}/</code> 目录（原文 → <code>original.pdf</code>，译文 → <code>translation.pdf</code>），并同步更新 <code>library.json</code>。</p><label>PDF 文件<input type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} />{file && <small className="file-hint">{file.name}（{(file.size / 1048576).toFixed(2)} MB）</small>}</label><label>类型<select value={kind} onChange={(event) => setKind(event.target.value as "original" | "translation")}><option value="translation">译文（中文）</option><option value="original">原文（英文）</option></select></label><label>归属论文<select value={target} onChange={(event) => setTarget(event.target.value)}><option value="__new__">新建论文条目…</option>{papers.map((p) => <option key={p.id} value={p.id}>{p.titleZh || p.title}</option>)}</select></label>{isNew && <><label>论文 ID（英文小写，用连字符）<input value={paperId} onChange={(event) => setPaperId(event.target.value)} placeholder="例如 my-paper-2026" /></label><label>英文标题<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Paper title" /></label><label>中文标题<input value={titleZh} onChange={(event) => setTitleZh(event.target.value)} placeholder="选填" /></label><label>作者（逗号分隔）<input value={authors} onChange={(event) => setAuthors(event.target.value)} placeholder="张三, 李四" /></label><div className="form-row"><label>年份<input value={year} onChange={(event) => setYear(event.target.value)} placeholder="2026" /></label><label>领域<input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="例如 大模型推理" /></label></div><label>标签（逗号分隔）<input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="KV缓存, 长上下文" /></label></>}{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button className="secondary-button" onClick={onClose} disabled={busy}>取消</button><button className="primary-button" onClick={submit} disabled={busy}><Upload size={16} />{busy ? "上传中…" : "上传并同步"}</button></div></div></div>;
}
