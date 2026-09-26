'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, TouchSensor, useDroppable, useSensor, useSensors,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertTriangle, ArrowLeft, Bold, BookOpen, Bookmark, Briefcase, Check, ChevronDown,
  ChevronRight, Code, Code2, Columns2, Copy, Download, Eye, FileDown, FileText, FileType,
  FlaskConical, Folder, FolderPlus, Heading2, Heart, ImagePlus, Italic, Lightbulb, Link2,
  List, Menu, MoreHorizontal, Pencil, Pin, Plus, Quote, RotateCcw, Search, Star, Target,
  Trash2, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { gruvboxDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import 'katex/dist/katex.min.css';
import '@/styles/markdown.css';
import { NotesMark } from '@/components/NotesMark';
import { Button } from '@/components/ui/button';
import { noteApi, noteFolderApi, noteTrashApi } from '@/lib/api';
import { exportDocx, exportMarkdown } from '@/lib/export';
import { imageMarkdown, uploadNoteImage } from '@/lib/image';
import { Note, NoteFolder } from '@/types';

const MARKDOWN_PLUGINS = [remarkGfm, remarkMath];
const REHYPE_PLUGINS = [[rehypeKatex, { strict: false, throwOnError: false }]] as never;

function CodeBlock({ className, children, node }: { className?: string; children?: React.ReactNode; node?: unknown }) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const position = (node as { position?: { start: { line: number }; end: { line: number } } })?.position;
  const isBlock = position?.start.line !== position?.end.line;
  const text = String(children).replace(/\n$/, '');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  if (match || isBlock) {
    return (
      <div className="highlighted-block group/code relative">
        <button
          type="button"
          onClick={copy}
          className="absolute right-2 top-2 z-10 flex h-8 items-center gap-1.5 rounded-md bg-white/10 px-2.5 text-xs font-medium text-white/90 opacity-0 transition-opacity hover:bg-white/20 focus:opacity-100 group-hover/code:opacity-100 sm:opacity-0"
          title="Copy code"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <SyntaxHighlighter
          style={gruvboxDark}
          language={match ? match[1] : 'text'}
          PreTag="div"
          showLineNumbers
          customStyle={{ borderRadius: '10px', fontSize: '0.85em', margin: 0, padding: '1.25em' }}
        >
          {text}
        </SyntaxHighlighter>
      </div>
    );
  }

  return (
    <code className="rounded-sm bg-canvas px-1.5 py-0.5 font-mono text-sm text-ink">
      {children}
    </code>
  );
}

const OPEN_TABS_KEY = 'notes-open-tabs';

const FOLDER_ICONS: { key: string; Icon: LucideIcon; label: string }[] = [
  { key: 'folder', Icon: Folder, label: 'Folder' },
  { key: 'note', Icon: FileText, label: 'Note' },
  { key: 'star', Icon: Star, label: 'Star' },
  { key: 'pin', Icon: Pin, label: 'Pin' },
  { key: 'bookmark', Icon: Bookmark, label: 'Bookmark' },
  { key: 'idea', Icon: Lightbulb, label: 'Idea' },
  { key: 'lab', Icon: FlaskConical, label: 'Lab' },
  { key: 'book', Icon: BookOpen, label: 'Book' },
  { key: 'target', Icon: Target, label: 'Target' },
  { key: 'work', Icon: Briefcase, label: 'Work' },
  { key: 'heart', Icon: Heart, label: 'Heart' },
  { key: 'code', Icon: Code2, label: 'Code' },
];

const FOLDER_ICON_MAP: Record<string, LucideIcon> =
  Object.fromEntries(FOLDER_ICONS.map(i => [i.key, i.Icon]));

function folderIcon(key?: string | null): LucideIcon {
  return (key && FOLDER_ICON_MAP[key]) || Folder;
}

function FolderGlyph({
  icon,
  size,
  className,
  style,
}: {
  icon?: string | null;
  size: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return React.createElement(folderIcon(icon), { size, className, style });
}

const FOLDER_COLORS: Record<string, string> = {
  red: 'var(--folder-red)',
  orange: 'var(--folder-orange)',
  amber: 'var(--folder-amber)',
  yellow: 'var(--folder-yellow)',
  lime: 'var(--folder-lime)',
  green: 'var(--folder-green)',
  teal: 'var(--folder-teal)',
  cyan: 'var(--folder-cyan)',
  blue: 'var(--folder-blue)',
  indigo: 'var(--folder-indigo)',
  violet: 'var(--folder-violet)',
  fuchsia: 'var(--folder-fuchsia)',
  pink: 'var(--folder-pink)',
};

const LEGACY_FOLDER_COLORS: Record<string, string> = {
  clay: 'red', sage: 'green', rose: 'pink', stone: 'indigo',
  emerald: 'green', sky: 'cyan', purple: 'violet', slate: 'indigo',
};

function folderColorKey(key?: string | null) {
  if (!key) return null;
  if (key in FOLDER_COLORS) return key;
  const legacy = LEGACY_FOLDER_COLORS[key];
  return legacy && legacy in FOLDER_COLORS ? legacy : null;
}

function SortableNote({
  note,
  isSelected,
  onSelect,
  formatDate,
  query,
  inkColor,
}: {
  note: Note;
  isSelected: boolean;
  onSelect: () => void;
  formatDate: (d: string) => string;
  query?: string;
  inkColor?: string | null;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: note.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const snippet = useMemo(() => {
    if (!query) return null;
    const haystack = note.content.toLowerCase();
    const at = haystack.indexOf(query.toLowerCase());
    if (at === -1) return null;
    const from = Math.max(0, at - 24);
    return (from > 0 ? '…' : '') + note.content.slice(from, at + query.length + 40).replace(/\n/g, ' ');
  }, [note.content, query]);

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-draggable">
      <button
        onClick={onSelect}
        className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors md:py-2 ${
          isSelected
            ? 'bg-accent text-accent-ink shadow-xs'
            : 'text-ink hover:bg-muted'
        }`}
      >
        <div
          className="truncate text-sm font-medium"
          style={!isSelected && inkColor ? { color: inkColor } : undefined}
        >
          {note.title || 'Untitled'}
        </div>
        {snippet ? (
          <div className={`mt-0.5 truncate text-xs ${isSelected ? 'text-accent-ink' : 'text-ink-muted'}`}>
            {snippet}
          </div>
        ) : (
          <div className={`mt-0.5 text-xs ${isSelected ? 'text-accent-ink' : 'text-ink-muted'}`}>
            {formatDate(note.updated_at)}
          </div>
        )}
      </button>
    </div>
  );
}

function UnfiledNotes({
  notes,
  selectedNoteId,
  onSelectNote,
  formatDate,
  dragging,
}: {
  notes: Note[];
  selectedNoteId: number | undefined;
  onSelectNote: (note: Note) => void;
  formatDate: (d: string) => string;
  dragging: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: '' });

  return (
    <div
      ref={setNodeRef}
      className={`mt-1 rounded-lg px-2 py-1 transition-colors ${isOver ? 'bg-accent-soft ring-1 ring-accent' : ''}`}
    >
      <SortableContext items={notes.map(n => n.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-1">
          {notes.map(note => (
            <SortableNote
              key={note.id}
              note={note}
              isSelected={note.id === selectedNoteId}
              onSelect={() => onSelectNote(note)}
              formatDate={formatDate}
            />
          ))}
        </div>
      </SortableContext>

      {notes.length === 0 && dragging && (
        <p className="rounded-md border border-dashed border-line-strong px-2 py-3 text-center text-xs text-ink-muted">
          Drop here to remove from its folder
        </p>
      )}
    </div>
  );
}

function DroppableFolderSection({
  droppableId,
  displayName,
  folderNotes,
  selectedNoteId,
  onSelectNote,
  onAddNote,
  onDeleteFolder,
  isCollapsed,
  onToggle,
  formatDate,
  color,
  icon,
  onFolderMenu,
  onRename,
}: {
  droppableId: string;
  displayName: string;
  folderNotes: Note[];
  selectedNoteId: number | undefined;
  onSelectNote: (note: Note) => void;
  onAddNote: () => void;
  onDeleteFolder?: () => void;
  isCollapsed: boolean;
  onToggle: () => void;
  formatDate: (d: string) => string;
  color?: string | null;
  icon?: string | null;
  onFolderMenu?: (changes: { color?: string | null; icon?: string | null }) => void;
  onRename?: (name: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const colorKey = folderColorKey(color);
  const swatch = colorKey ? FOLDER_COLORS[colorKey] : null;
  const inkColor = colorKey ? `var(--folder-${colorKey}-ink)` : null;

  const tint = (pct: number) => `color-mix(in srgb, ${swatch} ${pct}%, transparent)`;
  const chipVars = {
    '--chip-bg': swatch ? tint(12) : 'transparent',
    '--chip-bg-hover': swatch ? tint(22) : 'var(--muted)',
    '--chip-border': swatch ? tint(35) : 'transparent',
    '--chip-badge': swatch ? tint(22) : 'var(--muted)',
    '--chip-action-hover': swatch ? tint(32) : 'var(--line)',
  } as React.CSSProperties;

  const commitRename = (value: string) => {
    const next = value.trim();
    setRenaming(false);
    if (next && next !== displayName && onRename) onRename(next);
  };

  return (
    <div
      ref={setNodeRef}
      className={`mb-1.5 rounded-lg transition-colors ${isOver ? 'ring-1 ring-accent' : ''}`}
    >
      <div className="relative px-2" style={chipVars}>
        <div
          className={`folder-chip flex items-center rounded-lg border pr-1 transition-colors ${
            isOver ? 'border-accent bg-accent-soft' : ''
          } ${renaming ? 'border-accent ring-1 ring-accent' : ''}`}
        >
        {renaming ? (
          <input
            autoFocus
            defaultValue={displayName}
            onKeyDown={event => {
              if (event.key === 'Enter') commitRename((event.target as HTMLInputElement).value);
              if (event.key === 'Escape') setRenaming(false);
            }}
            onBlur={event => commitRename(event.target.value)}
            className="h-[38px] min-w-0 flex-1 bg-transparent px-2 text-[15px] font-semibold text-ink outline-hidden"
          />
        ) : (
        <button
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-1.5 rounded-l-lg px-2 py-2 text-left"
        >
          {isCollapsed
            ? <ChevronRight size={15} className="shrink-0 text-ink-muted" />
            : <ChevronDown size={15} className="shrink-0 text-ink-muted" />}

          <FolderGlyph
            icon={icon}
            size={16}
            className={`shrink-0 transition-colors ${isOver ? 'text-accent' : inkColor ? '' : 'text-ink-muted'}`}
            style={!isOver && inkColor ? { color: inkColor } : undefined}
          />

          <span
            className={`ml-0.5 truncate text-[15px] font-semibold transition-colors ${
              isOver ? 'text-accent' : 'text-ink'
            }`}
            style={!isOver && inkColor ? { color: inkColor } : undefined}
          >
            {displayName}
          </span>
          <span
            className="ml-auto shrink-0 rounded-full px-1.5 text-[11px] font-medium text-ink-muted"
            style={{ backgroundColor: isOver ? undefined : 'var(--chip-badge)' }}
          >
            {folderNotes.length}
          </span>
        </button>
        )}

        {onFolderMenu && (
          <div className="shrink-0">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="folder-chip-action flex h-7 w-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:text-ink"
              title={`Options for ${displayName}`}
              aria-label={`Options for ${displayName}`}
            >
              <MoreHorizontal size={16} />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute left-2 right-2 top-full z-20 mt-1 rounded-xl border border-line bg-surface p-3 shadow-xl">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Color</p>
                  <div className="mb-3 grid grid-cols-7 justify-items-center gap-1.5">
                    {Object.entries(FOLDER_COLORS).map(([name, value]) => (
                      <button
                        key={name}
                        onClick={() => onFolderMenu({ color: name })}
                        title={name}
                        aria-label={name}
                        className="h-6 w-6 rounded-full transition-transform hover:scale-110"
                        style={{ backgroundColor: value, boxShadow: colorKey === name ? `0 0 0 2px var(--surface), 0 0 0 4px ${value}` : undefined }}
                      />
                    ))}
                    <button
                      onClick={() => onFolderMenu({ color: null })}
                      title="No color"
                      aria-label="No color"
                      className="flex h-6 w-6 items-center justify-center rounded-full border border-line-strong text-ink-muted transition-colors hover:bg-muted"
                    >
                      <X size={11} />
                    </button>
                  </div>

                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Icon</p>
                  <div className="mb-3 grid grid-cols-6 gap-1">
                    {FOLDER_ICONS.map(({ key, Icon, label }) => {
                      const active = key === 'folder' ? !icon || icon === 'folder' : icon === key;
                      return (
                        <button
                          key={key}
                          onClick={() => onFolderMenu({ icon: key === 'folder' ? null : key })}
                          title={label}
                          aria-label={label}
                          className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-muted ${
                            active ? 'bg-muted text-accent ring-1 ring-accent' : 'text-ink-muted hover:text-ink'
                          }`}
                        >
                          <Icon size={15} />
                        </button>
                      );
                    })}
                  </div>

                  <div className="border-t border-line pt-2">
                    <button
                      onClick={() => { setMenuOpen(false); onAddNote(); }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-ink-muted transition-colors hover:bg-muted hover:text-ink"
                    >
                      <Plus size={15} />
                      New note here
                    </button>
                    {onRename && (
                      <button
                        onClick={() => { setMenuOpen(false); setRenaming(true); }}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-ink-muted transition-colors hover:bg-muted hover:text-ink"
                      >
                        <Pencil size={15} />
                        Rename
                      </button>
                    )}
                    {onDeleteFolder && (
                      <button
                        onClick={() => { setMenuOpen(false); onDeleteFolder(); }}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-danger transition-colors hover:bg-danger-soft"
                      >
                        <Trash2 size={15} />
                        Delete folder
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
        </div>
      </div>

      {!isCollapsed && (
        <div
          className="ml-4 mt-1.5 flex flex-col gap-1 border-l pl-2 pr-2"
          style={{ borderColor: swatch ? tint(35) : 'var(--line)' }}
        >
          <SortableContext items={folderNotes.map(n => n.id)} strategy={verticalListSortingStrategy}>
            {folderNotes.map(note => (
              <SortableNote
                key={note.id}
                note={note}
                isSelected={note.id === selectedNoteId}
                onSelect={() => onSelectNote(note)}
                formatDate={formatDate}
                inkColor={inkColor}
              />
            ))}
          </SortableContext>
          {folderNotes.length === 0 && (
            <p className="py-1 pl-3 text-xs italic text-ink-muted">Empty</p>
          )}
        </div>
      )}
    </div>
  );
}

type Wrap =
  | { kind: 'inline'; before: string; after: string }
  | { kind: 'prefix'; marker: string }
  | { kind: 'heading' };

const TOOLBAR: { icon: typeof Bold; title: string; shortcut?: string; wrap: Wrap }[] = [
  { icon: Bold, title: 'Bold', shortcut: '⌘B', wrap: { kind: 'inline', before: '**', after: '**' } },
  { icon: Italic, title: 'Italic', shortcut: '⌘I', wrap: { kind: 'inline', before: '_', after: '_' } },
  { icon: Code2, title: 'Code', wrap: { kind: 'inline', before: '`', after: '`' } },
  { icon: Link2, title: 'Link', shortcut: '⌘K', wrap: { kind: 'inline', before: '[', after: '](url)' } },
  { icon: Heading2, title: 'Heading', wrap: { kind: 'heading' } },
  { icon: List, title: 'List', wrap: { kind: 'prefix', marker: '- ' } },
  { icon: Quote, title: 'Quote', wrap: { kind: 'prefix', marker: '> ' } },
];

const escapeRe = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function Notes({ headerActions }: { headerActions?: React.ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [folder, setFolder] = useState('');
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [folderError, setFolderError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(0);
  const [dragDepth, setDragDepth] = useState(0);
  const [dragCount, setDragCount] = useState(0);
  const [draggingTab, setDraggingTab] = useState<number | null>(null);
  const [tabDropTarget, setTabDropTarget] = useState<{ id: number; after: boolean } | null>(null);
  const tabStripRef = useRef<HTMLDivElement>(null);
  const tabsRestoredRef = useRef(false);
  const [showTrash, setShowTrash] = useState(false);
  const [trash, setTrash] = useState<Note[]>([]);
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);
  const [openNoteIds, setOpenNoteIds] = useState<number[]>([]);
  const [printing, setPrinting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'editor' | 'preview'>('split');
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [newFolderMode, setNewFolderMode] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [activeDragId, setActiveDragId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<{ id: number; title: string; content: string; folder: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const pendingCursorRef = useRef<number | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retriesRef = useRef(0);
  const creatingFolderRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingSelectionRef = useRef<{ start: number; end: number } | null>(null);

  const fontSize = isNarrow ? 16 : 13;
  const lineHeight = isNarrow ? 26 : 21;
  const PADDING_TOP = 20;
  const CURSOR_MARGIN_LINES = 4;
  const metricsRef = useRef({ lineHeight, PADDING_TOP });
  useEffect(() => {
    metricsRef.current = { lineHeight, PADDING_TOP };
  }, [lineHeight]);

  const lineCount = useMemo(() => content.split('\n').length, [content]);

  const gutterWidth = Math.round(Math.max(2, String(lineCount).length) * fontSize * 0.6) + 18;

  const effectiveView = isNarrow && viewMode === 'split' ? 'editor' : viewMode;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsNarrow(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!tabsRestoredRef.current) return;
    try {
      localStorage.setItem(OPEN_TABS_KEY, JSON.stringify(openNoteIds));
    } catch {}
  }, [openNoteIds]);

  const keepCursorMargin = useCallback(() => {
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      const { lineHeight: lh, PADDING_TOP: pad } = metricsRef.current;
      const cursorLine = ta.value.substring(0, ta.selectionEnd).split('\n').length - 1;
      const cursorBottom = pad + (cursorLine + 1) * lh;
      const margin = CURSOR_MARGIN_LINES * lh;
      const desiredScrollTop = cursorBottom + margin - ta.clientHeight;
      if (desiredScrollTop > ta.scrollTop) {
        ta.scrollTop = desiredScrollTop;
        if (gutterRef.current) gutterRef.current.scrollTop = desiredScrollTop;
      }
    });
  }, []);

  useLayoutEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    if (pendingSelectionRef.current) {
      ta.selectionStart = pendingSelectionRef.current.start;
      ta.selectionEnd = pendingSelectionRef.current.end;
      pendingSelectionRef.current = null;
      ta.focus();
    } else if (pendingCursorRef.current !== null) {
      ta.selectionStart = ta.selectionEnd = pendingCursorRef.current;
      pendingCursorRef.current = null;
    }
  });

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (pendingRef.current) event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  useEffect(() => () => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
  }, []);

  useEffect(() => {
    const before = () => flushSync(() => setPrinting(true));
    const after = () => setPrinting(false);
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, []);

  useEffect(() => {
    if (!folderError) return;
    const timer = setTimeout(() => setFolderError(null), 5000);
    return () => clearTimeout(timer);
  }, [folderError]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [fetchedNotes, fetchedFolders] = await Promise.all([noteApi.getAll(), noteFolderApi.getAll()]);
      setNotes(fetchedNotes);
      setFolders(fetchedFolders);

      try {
        const stored = JSON.parse(localStorage.getItem(OPEN_TABS_KEY) || '[]') as number[];
        const alive = stored.filter(id => fetchedNotes.some(n => n.id === id));
        if (alive.length > 0) {
          setOpenNoteIds(alive);
          const first = fetchedNotes.find(n => n.id === alive[0]);
          if (first) {
            setSelectedNote(first);
            setTitle(first.title);
            setContent(first.content);
            setFolder(first.folder);
          }
        }
      } catch {}
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      tabsRestoredRef.current = true;
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);


  const saveNoteRef = useRef<(id: number, t: string, c: string, f: string) => void>(() => {});

  const saveNote = useCallback(async (id: number, t: string, c: string, f: string) => {
    setSaveState('saving');
    try {
      const updated = await noteApi.update(id, { title: t, content: c, folder: f });
      setNotes(prev => prev.map(n => n.id === id ? updated : n));
      pendingRef.current = null;
      retriesRef.current = 0;
      setSaveState('saved');
    } catch (error) {
      console.error('Failed to save note:', error);
      setSaveState('error');

      const attempt = retriesRef.current + 1;
      retriesRef.current = attempt;
      const delay = attempt <= 3 ? 2000 * 2 ** (attempt - 1) : 15000;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => {
        const pending = pendingRef.current;
        if (pending) saveNoteRef.current(pending.id, pending.title, pending.content, pending.folder);
      }, delay);
    }
  }, []);

  useEffect(() => {
    saveNoteRef.current = saveNote;
  }, [saveNote]);

  const scheduleSave = useCallback((id: number, t: string, c: string, f: string) => {
    setSaveState(prev => (prev === 'error' ? 'error' : 'saving'));
    pendingRef.current = { id, title: t, content: c, folder: f };
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveNote(id, t, c, f), 1200);
  }, [saveNote]);

  const flushSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    retriesRef.current = 0;
    if (pendingRef.current) {
      const { id, title: t, content: c, folder: f } = pendingRef.current;
      saveNote(id, t, c, f);
    }
  }, [saveNote]);

  const applyContent = useCallback((next: string) => {
    setContent(next);
    if (selectedNote) scheduleSave(selectedNote.id, title, next, folder);
  }, [selectedNote, title, folder, scheduleSave]);

  const replaceRange = useCallback(
    (from: number, to: number, text: string, selStart: number, selEnd: number) => {
      const ta = textareaRef.current;
      if (!ta) return;

      ta.focus();
      ta.setSelectionRange(from, to);

      let applied = false;
      try {
        applied = document.execCommand('insertText', false, text);
      } catch {
        applied = false;
      }

      if (!applied) {
        pendingSelectionRef.current = { start: selStart, end: selEnd };
        applyContent(ta.value.slice(0, from) + text + ta.value.slice(to));
        return;
      }
      ta.setSelectionRange(selStart, selEnd);
    },
    [applyContent],
  );

  const applyWrap = useCallback(
    (tool: Wrap) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const value = ta.value;
      let start = ta.selectionStart;
      let end = ta.selectionEnd;

      if (tool.kind === 'inline') {
        const { before, after } = tool;

        if (start === end) {
          let wordStart = start;
          let wordEnd = end;
          while (wordStart > 0 && /\S/.test(value[wordStart - 1])) wordStart--;
          while (wordEnd < value.length && /\S/.test(value[wordEnd])) wordEnd++;
          if (wordEnd > wordStart) {
            start = wordStart;
            end = wordEnd;
          }
        }

        const selected = value.slice(start, end);

        if (
          selected.length >= before.length + after.length &&
          selected.startsWith(before) &&
          selected.endsWith(after)
        ) {
          const inner = selected.slice(before.length, selected.length - after.length);
          replaceRange(start, end, inner, start, start + inner.length);
          return;
        }

        const outerStart = start - before.length;
        const outerEnd = end + after.length;
        if (
          outerStart >= 0 &&
          outerEnd <= value.length &&
          value.slice(outerStart, start) === before &&
          value.slice(end, outerEnd) === after
        ) {
          replaceRange(outerStart, outerEnd, selected, outerStart, outerStart + selected.length);
          return;
        }

        replaceRange(
          start,
          end,
          before + selected + after,
          start + before.length,
          start + before.length + selected.length,
        );
        return;
      }

      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const searchFrom = end > start && value[end - 1] === '\n' ? end - 1 : end;
      const lineEnd = value.indexOf('\n', searchFrom) === -1 ? value.length : value.indexOf('\n', searchFrom);
      const lines = value.slice(lineStart, lineEnd).split('\n');

      let next: string[];
      if (tool.kind === 'heading') {
        const level = /^(#{1,6})\s/.exec(lines[0])?.[1].length ?? 0;
        const nextLevel = level >= 3 ? 0 : level + 1;
        const marker = nextLevel > 0 ? `${'#'.repeat(nextLevel)} ` : '';
        next = lines.map(line => marker + line.replace(/^#{1,6}\s+/, ''));
      } else {
        const { marker } = tool;
        const filled = lines.filter(line => line.trim() !== '');
        const allMarked =
          filled.length > 0 && filled.every(line => line.trimStart().startsWith(marker));
        const strip = new RegExp(`^(\\s*)${escapeRe(marker)}`);
        next = lines.map(line =>
          line.trim() === '' ? line : allMarked ? line.replace(strip, '$1') : marker + line,
        );
      }

      const text = next.join('\n');
      const firstDelta = next[0].length - lines[0].length;
      const [selStart, selEnd] =
        start === end
          ? [Math.max(lineStart, start + firstDelta), Math.max(lineStart, start + firstDelta)]
          : [lineStart, lineStart + text.length];

      replaceRange(lineStart, lineEnd, text, selStart, selEnd);
    },
    [replaceRange],
  );

  const insertImages = useCallback(
    async (files: File[]) => {
      const images = files.filter(f => f.type.startsWith('image/'));
      if (images.length === 0) return;

      setUploading(n => n + images.length);
      for (const file of images) {
        try {
          const uploaded = await uploadNoteImage(file);
          const ta = textareaRef.current;
          const at = ta ? ta.selectionStart : content.length;
          const markdown = imageMarkdown(file, uploaded);
          const text = `\n\n${markdown}\n\n`;
          replaceRange(at, ta ? ta.selectionEnd : at, text, at + text.length, at + text.length);
        } catch (error) {
          console.error('Image upload failed:', error);
          setFolderError(error instanceof Error ? error.message : 'Could not upload the image');
        } finally {
          setUploading(n => n - 1);
        }
      }
    },
    [content.length, replaceRange],
  );

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const files = Array.from(event.clipboardData.files);
      if (files.some(f => f.type.startsWith('image/'))) {
        event.preventDefault();
        insertImages(files);
      }
    },
    [insertImages],
  );

  const isFileDrag = (event: React.DragEvent) =>
    Array.from(event.dataTransfer.types).includes('Files');

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      setDragDepth(0);
      const files = Array.from(event.dataTransfer.files);
      if (files.some(f => f.type.startsWith('image/'))) {
        event.preventDefault();
        insertImages(files);
      }
    },
    [insertImages],
  );

  const handleDragEnter = useCallback((event: React.DragEvent) => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    setDragCount(Array.from(event.dataTransfer.items).filter(i => i.kind === 'file').length);
    setDragDepth(depth => depth + 1);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    if (!isFileDrag(event)) return;
    setDragDepth(depth => Math.max(0, depth - 1));
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod) {
      const key = e.key.toLowerCase();
      const shortcut = key === 'b' ? TOOLBAR[0].wrap : key === 'i' ? TOOLBAR[1].wrap : key === 'k' ? TOOLBAR[3].wrap : null;
      if (shortcut) {
        e.preventDefault();
        applyWrap(shortcut);
        return;
      }
      if (key === 's') {
        e.preventDefault();
        flushSave();
        return;
      }
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newValue = ta.value.substring(0, start) + '  ' + ta.value.substring(end);
      pendingCursorRef.current = start + 2;
      setContent(newValue);
      if (selectedNote) scheduleSave(selectedNote.id, title, newValue, folder);
      return;
    }
    keepCursorMargin();
  }, [keepCursorMargin, selectedNote, title, folder, scheduleSave, applyWrap, flushSave]);

  const openInTab = (id: number) => {
    setOpenNoteIds(prev => (prev.includes(id) ? prev : [...prev, id]));
  };

  const tabDropIndex = (clientX: number) => {
    if (draggingTab === null) return null;
    const others = openNoteIds.filter(id => id !== draggingTab);
    let index = others.length;
    for (let i = 0; i < others.length; i++) {
      const el = tabStripRef.current?.querySelector(`[data-tab-id="${others[i]}"]`);
      if (!el) continue;
      const box = el.getBoundingClientRect();
      if (clientX < box.left + box.width / 2) {
        index = i;
        break;
      }
    }
    return index === openNoteIds.indexOf(draggingTab) ? null : index;
  };

  const showTabDropTarget = (clientX: number) => {
    const index = tabDropIndex(clientX);
    const others = openNoteIds.filter(id => id !== draggingTab);
    const next =
      index === null ? null
      : index < others.length ? { id: others[index], after: false }
      : { id: others[others.length - 1], after: true };
    setTabDropTarget(current =>
      current?.id === next?.id && current?.after === next?.after ? current : next,
    );
  };

  const moveTab = (from: number, index: number) => {
    setOpenNoteIds(ids => {
      const without = ids.filter(id => id !== from);
      without.splice(index, 0, from);
      return without;
    });
  };

  const closeTab = (id: number) => {
    setOpenNoteIds(prev => {
      const next = prev.filter(openId => openId !== id);
      if (selectedNote?.id === id) {
        const index = prev.indexOf(id);
        const fallbackId = next[index - 1] ?? next[index] ?? null;
        const fallback = fallbackId === null ? null : notes.find(n => n.id === fallbackId) ?? null;
        flushSave();
        setSelectedNote(fallback);
        setTitle(fallback?.title ?? '');
        setContent(fallback?.content ?? '');
        setFolder(fallback?.folder ?? '');
        setSaveState('saved');
      }
      return next;
    });
  };

  const selectNote = (note: Note) => {
    flushSave();
    openInTab(note.id);
    setSelectedNote(note);
    setTitle(note.title);
    setContent(note.content);
    setFolder(note.folder);
    setSaveState('saved');
    setConfirmDelete(false);
    setDrawerOpen(false);
  };

  const handleCreateNote = async (inFolder = '') => {
    flushSave();
    try {
      const newNote = await noteApi.create({ title: 'Untitled', content: '', folder: inFolder });
      setNotes(prev => [...prev, newNote]);
      openInTab(newNote.id);
      setSelectedNote(newNote);
      setTitle(newNote.title);
      setContent(newNote.content);
      setFolder(newNote.folder);
      setSaveState('saved');
      setDrawerOpen(false);
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    setNewFolderMode(false);
    setNewFolderName('');
    if (!name) return;

    if (creatingFolderRef.current === name) return;
    creatingFolderRef.current = name;

    try {
      const newFolder = await noteFolderApi.create(name);
      setFolders(prev => [...prev, newFolder].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Failed to create folder:', error);
    } finally {
      creatingFolderRef.current = null;
    }
  };

  const handleFolderMenu = async (folderId: number, changes: { color?: string | null; icon?: string | null }) => {
    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, ...changes } : f));
    try {
      await noteFolderApi.update(folderId, changes);
    } catch (error) {
      console.error('Failed to update folder:', error);
    }
  };

  const handleRenameFolder = async (folderId: number, oldName: string, newName: string) => {
    if (folders.some(f => f.id !== folderId && f.name === newName)) {
      setFolderError(`A folder called “${newName}” already exists`);
      return;
    }
    setFolders(prev => prev.map(f => (f.id === folderId ? { ...f, name: newName } : f)));
    setNotes(prev => prev.map(n => (n.folder === oldName ? { ...n, folder: newName } : n)));
    setCollapsedFolders(prev => {
      if (!prev.has(oldName)) return prev;
      const next = new Set(prev);
      next.delete(oldName);
      next.add(newName);
      return next;
    });
    if (selectedNote?.folder === oldName) {
      setFolder(newName);
      setSelectedNote(prev => (prev ? { ...prev, folder: newName } : prev));
      if (pendingRef.current?.folder === oldName) pendingRef.current.folder = newName;
    }
    try {
      await noteFolderApi.update(folderId, { name: newName });
    } catch (error) {
      console.error('Failed to rename folder:', error);
      setFolderError(error instanceof Error ? error.message : 'Failed to rename folder');
      loadAll();
    }
  };

  const handleDeleteFolder = async (folderId: number, folderName: string) => {
    try {
      await noteFolderApi.delete(folderId);
      setFolders(prev => prev.filter(f => f.id !== folderId));
      setNotes(prev => prev.map(n => n.folder === folderName ? { ...n, folder: '' } : n));
      if (selectedNote?.folder === folderName) {
        setFolder('');
        if (pendingRef.current?.id === selectedNote.id) pendingRef.current.folder = '';
      }
    } catch (error) {
      console.error('Failed to delete folder:', error);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    if (selectedNote) scheduleSave(selectedNote.id, val, content, folder);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    if (selectedNote) scheduleSave(selectedNote.id, title, val, folder);
    keepCursorMargin();
  };

  const openTrash = async () => {
    setShowTrash(true);
    setConfirmEmptyTrash(false);
    try {
      setTrash(await noteTrashApi.list());
    } catch (error) {
      console.error('Failed to load trash:', error);
    }
  };

  const handleRestore = async (id: number) => {
    try {
      const restored = await noteTrashApi.restore(id);
      setTrash(prev => prev.filter(n => n.id !== id));
      setNotes(prev => [...prev, restored]);
    } catch (error) {
      console.error('Failed to restore note:', error);
    }
  };

  const handleDeleteForever = async (id: number) => {
    try {
      await noteApi.delete(id, true);
      setTrash(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const handleEmptyTrash = async () => {
    try {
      await noteTrashApi.empty();
      setTrash([]);
      setConfirmEmptyTrash(false);
    } catch (error) {
      console.error('Failed to empty trash:', error);
    }
  };

  const handleDeleteNote = async (id: number) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    pendingRef.current = null;
    try {
      await noteApi.delete(id);
      const remaining = notes.filter(n => n.id !== id);
      setNotes(remaining);
      setOpenNoteIds(prev => prev.filter(openId => openId !== id));
      if (selectedNote?.id === id) {
        const next = remaining[0] || null;
        setSelectedNote(next);
        setTitle(next?.title || '');
        setContent(next?.content || '');
        setFolder(next?.folder || '');
        setSaveState('saved');
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const noteId = active.id as number;
    const draggedNote = notes.find(n => n.id === noteId);
    if (!draggedNote) return;

    const overId = over.id;
    const overNote = typeof overId === 'number' ? notes.find(n => n.id === overId) : null;
    const targetFolder = overNote ? overNote.folder : (overId as string);

    if (overNote && overNote.folder === draggedNote.folder) {
      const folderNotes = notes
        .filter(n => n.folder === draggedNote.folder)
        .sort((a, b) => a.position - b.position);
      const oldIndex = folderNotes.findIndex(n => n.id === noteId);
      const newIndex = folderNotes.findIndex(n => n.id === overNote.id);
      if (oldIndex === newIndex) return;

      const reordered = arrayMove(folderNotes, oldIndex, newIndex);
      const updates = reordered.map((n, i) => ({ id: n.id, position: i }));

      setNotes(prev => {
        const others = prev.filter(n => n.folder !== draggedNote.folder);
        return [...others, ...reordered.map((n, i) => ({ ...n, position: i }))];
      });

      try {
        await noteApi.reorder(updates);
      } catch (error) {
        console.error('Failed to reorder:', error);
      }
    } else if (targetFolder !== draggedNote.folder) {
      if (pendingRef.current?.id === noteId) pendingRef.current.folder = targetFolder;
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, folder: targetFolder } : n));
      if (selectedNote?.id === noteId) setFolder(targetFolder);

      try {
        await noteApi.update(noteId, { folder: targetFolder });
      } catch (error) {
        console.error('Failed to move note:', error);
        setNotes(prev => prev.map(n => n.id === noteId ? { ...n, folder: draggedNote.folder } : n));
      }
    }
  };

  const toggleFolder = (key: string) => {
    setCollapsedFolders(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  const notesByFolder: Record<string, Note[]> = { '': [] };
  for (const f of folders) notesByFolder[f.name] = [];
  for (const note of notes) {
    const key = note.folder || '';
    if (!notesByFolder[key]) notesByFolder[key] = [];
    notesByFolder[key].push(note);
  }
  for (const key of Object.keys(notesByFolder)) {
    notesByFolder[key].sort((a, b) => a.position - b.position);
  }

  const trimmedQuery = query.trim();
  const searchResults = useMemo(() => {
    if (!trimmedQuery) return null;
    const needle = trimmedQuery.toLowerCase();
    return notes
      .filter(n => n.title.toLowerCase().includes(needle) || n.content.toLowerCase().includes(needle))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [notes, trimmedQuery]);

  const activeDragNote = activeDragId ? notes.find(n => n.id === activeDragId) : null;

  const wordCount = useMemo(() => content.trim().split(/\s+/).filter(Boolean).length, [content]);
  const readingMinutes = Math.max(1, Math.round(wordCount / 200));

  const sidebar = (
    <>
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-3">
        <div className="flex items-center gap-2">
          <NotesMark size={22} />
          <span className="text-[15px] font-bold tracking-tight text-ink">Notes</span>
        </div>
        <div className="flex items-center gap-0.5">
          <div className="flex items-center gap-0.5 md:hidden">{headerActions}</div>
          <button
            onClick={() => { setNewFolderMode(true); setNewFolderName(''); }}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-muted hover:text-ink"
            title="New folder"
            aria-label="New folder"
          >
            <FolderPlus size={16} />
          </button>
          <button
            onClick={() => handleCreateNote()}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-muted hover:text-ink"
            title="New note"
            aria-label="New note"
          >
            <Plus size={18} />
          </button>
          <button
            onClick={() => setDrawerOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-muted md:hidden"
            aria-label="Close note list"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {showTrash ? (
        <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-2">
          <button
            onClick={() => setShowTrash(false)}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:bg-muted hover:text-ink"
          >
            <ArrowLeft size={15} />
            Back to notes
          </button>
          {trash.length > 0 && (
            confirmEmptyTrash ? (
              <span className="flex items-center gap-1.5">
                <button
                  onClick={handleEmptyTrash}
                  className="rounded-md bg-danger px-2 py-1 text-[11px] font-semibold text-accent-ink"
                >
                  Delete {trash.length}
                </button>
                <button
                  onClick={() => setConfirmEmptyTrash(false)}
                  className="text-[11px] font-medium text-ink-muted hover:text-ink"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmEmptyTrash(true)}
                className="rounded-md px-2 py-1 text-[11px] font-semibold text-danger transition-colors hover:bg-danger-soft"
              >
                Empty trash
              </button>
            )
          )}
        </div>
      ) : (
      <div className="shrink-0 px-3 py-2">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search notes…"
            className="h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-8 text-base text-ink outline-hidden transition-colors placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent/25 md:h-9 md:text-sm"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-sm text-ink-faint hover:text-ink-muted"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      )}

      {folderError && (
        <div className="mx-2 mb-1 flex items-start gap-1.5 rounded-md border border-danger bg-danger-soft px-2 py-1.5 text-[11px] font-medium text-danger">
          <AlertTriangle size={13} className="mt-px shrink-0" />
          <span className="min-w-0 flex-1">{folderError}</span>
          <button onClick={() => setFolderError(null)} aria-label="Dismiss"><X size={12} /></button>
        </div>
      )}

      <div className="themed-scroll flex-1 overflow-y-auto overscroll-contain px-1 pb-3">
        {showTrash ? (
          <div className="flex flex-col gap-1 px-2 pt-1">
            {trash.length === 0 && (
              <p className="px-1 py-6 text-center text-xs text-ink-muted">The trash is empty</p>
            )}
            {trash.map(note => (
              <div key={note.id} className="rounded-lg border border-line bg-surface px-3 py-2">
                <div className="truncate text-sm font-medium text-ink">{note.title || 'Untitled'}</div>
                <div className="mt-0.5 text-xs text-ink-muted">
                  Deleted {note.deleted_at ? formatDate(note.deleted_at) : ''}
                </div>
                <div className="mt-2 flex items-center gap-1">
                  <button
                    onClick={() => handleRestore(note.id)}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-ink-muted transition-colors hover:bg-muted hover:text-ink"
                  >
                    <RotateCcw size={12} />
                    Restore
                  </button>
                  <button
                    onClick={() => handleDeleteForever(note.id)}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-danger transition-colors hover:bg-danger-soft"
                  >
                    <Trash2 size={12} />
                    Delete forever
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
        <>
        {newFolderMode && (
          <div className="mb-1 flex items-center gap-1.5 px-2 py-1">
            <Folder size={16} className="shrink-0 text-ink-muted" />
            <input
              autoFocus
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') { setNewFolderMode(false); setNewFolderName(''); }
              }}
              onBlur={handleCreateFolder}
              placeholder="Folder name…"
              className="h-9 w-full min-w-0 flex-1 rounded-md border border-accent bg-raised px-2 text-base font-semibold text-ink outline-hidden md:text-[15px]"
            />
          </div>
        )}

        {searchResults ? (
          <div className="flex flex-col gap-0.5 px-2">
            <p className="px-1 pb-1 pt-2 text-xs font-medium text-ink-muted">
              {searchResults.length} {searchResults.length === 1 ? 'match' : 'matches'} for “{trimmedQuery}”
            </p>
            {searchResults.map(note => (
              <SortableNote
                key={note.id}
                note={note}
                isSelected={note.id === selectedNote?.id}
                onSelect={() => selectNote(note)}
                formatDate={formatDate}
                query={trimmedQuery}
              />
            ))}
            {searchResults.length === 0 && (
              <p className="px-1 py-4 text-center text-xs text-ink-faint">Nothing found</p>
            )}
          </div>
        ) : (
          <>
            {notes.length === 0 && folders.length === 0 && !loading && (
              <p className="mt-4 text-center text-xs text-ink-faint">No notes yet</p>
            )}

            <DndContext
              sensors={sensors}
              onDragStart={(event: DragStartEvent) => setActiveDragId(event.active.id as number)}
              onDragEnd={handleDragEnd}
              onDragCancel={() => setActiveDragId(null)}
            >
              {folders.map(f => (
                <DroppableFolderSection
                  key={f.id}
                  droppableId={f.name}
                  displayName={f.name}
                  folderNotes={notesByFolder[f.name] ?? []}
                  selectedNoteId={selectedNote?.id}
                  onSelectNote={selectNote}
                  onAddNote={() => handleCreateNote(f.name)}
                  onDeleteFolder={() => handleDeleteFolder(f.id, f.name)}
                  isCollapsed={collapsedFolders.has(f.name)}
                  onToggle={() => toggleFolder(f.name)}
                  formatDate={formatDate}
                  color={f.color}
                  icon={f.icon}
                  onFolderMenu={changes => handleFolderMenu(f.id, changes)}
                  onRename={name => handleRenameFolder(f.id, f.name, name)}
                />
              ))}

              <UnfiledNotes
                notes={notesByFolder[''] ?? []}
                selectedNoteId={selectedNote?.id}
                onSelectNote={selectNote}
                formatDate={formatDate}
                dragging={activeDragId !== null}
              />

              <DragOverlay>
                {activeDragNote && (
                  <div className="w-44 rounded-lg border border-accent bg-surface px-3 py-2 opacity-90 shadow-lg">
                    <div className="truncate text-sm font-semibold text-ink">
                      {activeDragNote.title || 'Untitled'}
                    </div>
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          </>
        )}
        </>
        )}
      </div>

      {!showTrash && (
        <button
          onClick={openTrash}
          className="flex h-9 shrink-0 items-center gap-2 border-t border-line px-4 text-sm font-medium text-ink-muted transition-colors hover:bg-muted hover:text-ink"
        >
          <Trash2 size={15} />
          Trash
        </button>
      )}
    </>
  );

  return (
    <div className="flex h-full bg-canvas">
      <aside className="print-hidden hidden w-64 shrink-0 flex-col border-r border-line bg-surface md:flex">
        {sidebar}
      </aside>

      <div className={`print-hidden fixed inset-0 z-40 md:hidden ${drawerOpen ? '' : 'pointer-events-none'}`}>
        <div
          onClick={() => setDrawerOpen(false)}
          className={`absolute inset-0 bg-overlay/40 dark:bg-overlay/60 transition-opacity duration-300 ${drawerOpen ? 'opacity-100' : 'opacity-0'}`}
        />
        <div
          role="dialog"
          aria-label="Notes"
          className={`absolute inset-y-0 left-0 flex w-[84%] max-w-[320px] flex-col bg-surface shadow-2xl transition-[transform,visibility] duration-300 ease-out ${
            drawerOpen ? 'visible translate-x-0' : 'invisible -translate-x-full'
          }`}
        >
          {sidebar}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="print-hidden flex h-14 shrink-0 items-center gap-1 border-b border-line bg-surface px-2 sm:px-4">
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-canvas md:hidden"
            aria-label="Show notes"
          >
            <Menu size={20} />
          </button>

          {selectedNote ? (
            <>
              <input
                value={title}
                onChange={handleTitleChange}
                className="min-w-0 flex-1 border-none bg-transparent text-base font-bold text-ink outline-hidden placeholder:text-ink-faint sm:text-lg"
                placeholder="Note title…"
              />

              <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                <div className="flex items-center gap-0.5 rounded-lg bg-canvas p-0.5">
                  {([
                    { mode: 'editor', icon: Code, label: 'Editor' },
                    { mode: 'split', icon: Columns2, label: 'Split' },
                    { mode: 'preview', icon: Eye, label: 'Preview' },
                  ] as const).map(({ mode, icon: Icon, label }) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      title={label}
                      aria-label={label}
                      className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                        mode === 'split' ? 'hidden md:flex' : ''
                      } ${
                        effectiveView === mode
                          ? 'bg-surface text-accent shadow-xs'
                          : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      <Icon size={15} />
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <button
                    onClick={() => setExportOpen(v => !v)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
                    title="Export"
                    aria-label="Export note"
                  >
                    <Download size={17} />
                  </button>
                  {exportOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
                      <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-xl">
                        {[
                          { icon: FileText, label: 'Markdown (.md)', run: () => exportMarkdown(title, content) },
                          {
                            icon: FileDown,
                            label: 'PDF (via print)',
                            run: () => {
                              setPrinting(true);
                              setTimeout(() => window.print(), 50);
                            },
                          },
                          { icon: FileType, label: 'Word (.docx)', run: () => exportDocx(title, content) },
                        ].map(({ icon: Icon, label, run }) => (
                          <button
                            key={label}
                            onClick={() => { setExportOpen(false); run(); }}
                            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-ink-muted transition-colors hover:bg-canvas"
                          >
                            <Icon size={15} className="text-ink-faint" />
                            {label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {confirmDelete ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => { handleDeleteNote(selectedNote.id); setConfirmDelete(false); }}
                      className="rounded-lg bg-danger px-2.5 py-1.5 text-xs font-semibold text-accent-ink transition-colors hover:bg-danger"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-lg px-2 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger"
                    title="Delete note"
                    aria-label="Delete note"
                  >
                    <Trash2 size={17} />
                  </button>
                )}
              </div>
            </>
          ) : (
            <span className="flex-1" />
          )}

          <div className="hidden shrink-0 items-center gap-1 md:flex">{headerActions}</div>
        </div>

        {openNoteIds.length > 1 && (
          <div
            ref={tabStripRef}
            onDragOver={event => {
              if (draggingTab === null) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              showTabDropTarget(event.clientX);
            }}
            onDragLeave={event => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setTabDropTarget(null);
            }}
            onDrop={event => {
              event.preventDefault();
              const index = tabDropIndex(event.clientX);
              if (draggingTab !== null && index !== null) moveTab(draggingTab, index);
              setDraggingTab(null);
              setTabDropTarget(null);
            }}
            className="themed-scroll print-hidden flex h-9 shrink-0 items-stretch gap-0.5 overflow-x-auto overflow-y-hidden bg-canvas px-1 shadow-[inset_0_-1px_0_var(--line)]"
          >
            {openNoteIds.map(id => {
              const note = notes.find(n => n.id === id);
              if (!note) return null;
              const active = selectedNote?.id === id;
              const label = (active ? title : note.title) || 'Untitled';
              return (
                <div
                  key={id}
                  data-tab-id={id}
                  draggable
                  onDragStart={event => {
                    setDraggingTab(id);
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', String(id));
                  }}
                  onDragEnd={() => {
                    setDraggingTab(null);
                    setTabDropTarget(null);
                  }}
                  className={`group/tab relative flex min-w-0 max-w-[180px] shrink-0 items-center gap-1 rounded-t-md px-2 transition-colors ${
                    active
                      ? 'border-x border-t border-line bg-surface text-ink shadow-[inset_0_-2px_0_var(--accent)]'
                      : 'mb-px border-x border-t border-transparent text-ink-faint hover:bg-surface/60 hover:text-ink-muted'
                  } ${draggingTab === id ? 'opacity-40' : ''}`}
                >
                  {tabDropTarget?.id === id && (
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute inset-y-1 w-0.5 rounded-full bg-accent ${
                        tabDropTarget.after ? '-right-px' : '-left-px'
                      }`}
                    />
                  )}

                  <button
                    onClick={() => selectNote(note)}
                    onAuxClick={event => {
                      if (event.button !== 1) return;
                      event.preventDefault();
                      closeTab(id);
                    }}
                    className={`min-w-0 flex-1 cursor-grab truncate py-1 text-left text-xs active:cursor-grabbing ${
                      active ? 'font-semibold' : 'font-medium'
                    }`}
                    title={`${label} — drag to reorder, middle click to close`}
                  >
                    {label}
                  </button>
                  <button
                    onClick={() => closeTab(id)}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-ink-faint transition-colors hover:bg-muted hover:text-ink"
                    aria-label={`Close ${label}`}
                    title="Close tab"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {selectedNote ? (
          <>
            <div className="print-hidden flex min-h-0 flex-1">
              {effectiveView !== 'preview' && (
                <div
                  className={`relative flex min-w-0 flex-col border-line ${effectiveView === 'editor' ? 'flex-1' : 'w-1/2 border-r'}`}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={e => {
                    if (isFileDrag(e)) e.preventDefault();
                  }}
                  onDrop={handleDrop}
                >
                  <div
                    className="themed-scroll flex h-11 shrink-0 items-center gap-0.5 overflow-x-auto border-b border-line bg-surface pl-2 pr-2"
                    style={{ paddingLeft: `${Math.max(8, gutterWidth)}px` }}
                  >
                    {TOOLBAR.map(({ icon: Icon, title: label, shortcut, wrap }, index) => {
                      return (
                        <React.Fragment key={label}>
                          {index === 4 && <span className="mx-1.5 h-5 w-px shrink-0 bg-line" aria-hidden="true" />}
                          <button
                            type="button"
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => applyWrap(wrap)}
                            title={shortcut ? `${label} (${shortcut})` : label}
                            aria-label={label}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-muted hover:text-ink"
                          >
                            <Icon size={15} />
                          </button>
                        </React.Fragment>
                      );
                    })}

                    <span className="mx-1.5 h-5 w-px shrink-0 bg-line" aria-hidden="true" />
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => fileInputRef.current?.click()}
                      title="Insert image - or just paste or drop one"
                      aria-label="Insert image"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-muted hover:text-ink"
                    >
                      <ImagePlus size={15} />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      hidden
                      onChange={e => {
                        insertImages(Array.from(e.target.files ?? []));
                        e.target.value = '';
                      }}
                    />

                    {uploading > 0 && (
                      <span className="ml-1 flex shrink-0 items-center gap-1.5 text-xs font-medium text-ink-muted">
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-line border-t-accent" />
                        {uploading === 1 ? 'Uploading…' : `Uploading ${uploading}…`}
                      </span>
                    )}
                  </div>

                  <div className="flex min-h-0 flex-1">
                    <div
                      ref={gutterRef}
                      className="hidden shrink-0 select-none overflow-hidden border-r border-line bg-surface pr-2 text-right font-mono text-ink-faint sm:block"
                      style={{
                        width: `${gutterWidth}px`,
                        fontSize: `${fontSize}px`,
                        paddingTop: `${PADDING_TOP}px`,
                      }}
                    >
                      {Array.from({ length: lineCount }, (_, i) => (
                        <div key={i} style={{ height: `${lineHeight}px`, lineHeight: `${lineHeight}px` }}>{i + 1}</div>
                      ))}
                      <div style={{ height: '84px' }} />
                    </div>
                    <textarea
                      ref={textareaRef}
                      value={content}
                      onChange={handleContentChange}
                      onScroll={() => {
                        if (gutterRef.current && textareaRef.current) {
                          gutterRef.current.scrollTop = textareaRef.current.scrollTop;
                        }
                      }}
                      onKeyDown={handleKeyDown}
                      onPaste={handlePaste}
                      placeholder="Write in markdown…"
                      spellCheck={false}
                      className="themed-scroll flex-1 resize-none border-none bg-raised font-mono text-ink outline-hidden placeholder:text-ink-faint"
                      style={{
                        fontSize: `${fontSize}px`,
                        lineHeight: `${lineHeight}px`,
                        padding: `${PADDING_TOP}px 24px 84px 16px`,
                      }}
                    />
                  </div>

                  {dragDepth > 0 && (
                    <div className="drop-target pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-4">
                      <span className="flex items-center gap-2.5 rounded-xl border border-accent bg-surface px-4 py-3 text-[15px] font-semibold text-accent shadow-lg">
                        <ImagePlus size={18} />
                        {dragCount > 1 ? `Drop ${dragCount} images here` : 'Drop image here'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {effectiveView !== 'editor' && (
                <div className={`flex min-w-0 flex-col ${effectiveView === 'preview' ? 'flex-1' : 'w-1/2'}`}>
                  <div className="flex h-11 shrink-0 items-center justify-between border-b border-line bg-surface px-4">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Preview</span>
                    <span className="text-[11px] tabular-nums text-ink-faint">{readingMinutes} min</span>
                  </div>
                  <div className="themed-scroll flex-1 overflow-y-auto overscroll-contain bg-raised">
                    {content ? (
                      <div className={`markdown-body ${effectiveView === 'preview' ? 'mx-auto max-w-3xl px-5 py-6 sm:px-10 sm:py-8' : 'px-6 py-5'}`}>
                        <ReactMarkdown
                          remarkPlugins={MARKDOWN_PLUGINS}
                          rehypePlugins={REHYPE_PLUGINS}
                          components={{ code: CodeBlock }}
                        >{content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className={`text-sm italic text-ink-faint ${effectiveView === 'preview' ? 'mx-auto max-w-3xl px-5 py-6 sm:px-10 sm:py-8' : 'px-6 py-5'}`}>
                        Preview will appear here…
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="print-hidden flex h-9 shrink-0 items-center justify-between border-t border-line bg-surface px-3 text-xs text-ink-muted">
              {saveState === 'error' ? (
                <span className="flex items-center gap-1.5 font-medium text-danger">
                  <AlertTriangle size={12} />
                  Not saved - retrying
                  <button
                    onClick={flushSave}
                    className="ml-1 rounded-sm px-1.5 py-0.5 text-[11px] font-semibold underline underline-offset-2 hover:bg-danger-soft"
                  >
                    Retry now
                  </button>
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  {saveState === 'saved' ? <><Check size={12} /> Saved</> : <>Saving…</>}
                </span>
              )}
              <span className="tabular-nums">
                {wordCount} {wordCount === 1 ? 'word' : 'words'} · {readingMinutes} min read
              </span>
            </div>

            {printing &&
              createPortal(
                <div className="print-target hidden print:block">
                  <div className="markdown-body">
                    <ReactMarkdown remarkPlugins={MARKDOWN_PLUGINS} rehypePlugins={REHYPE_PLUGINS}>
                      {content}
                    </ReactMarkdown>
                  </div>
                </div>,
                document.body,
              )}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-canvas">
                <FileText size={28} className="text-ink-faint" />
              </div>
              <h3 className="mb-1 text-lg font-semibold text-ink">No note selected</h3>
              <p className="mb-5 text-sm text-ink-muted">
                Pick a note from the list, or start a new one
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button onClick={() => handleCreateNote()} className="h-11 text-base sm:h-10 sm:text-sm">
                  <Plus size={16} className="mr-2" />
                  New note
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDrawerOpen(true)}
                  className="h-11 text-base sm:hidden"
                >
                  Browse
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
