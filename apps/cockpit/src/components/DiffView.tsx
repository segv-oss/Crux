import { api } from '@/lib/api';
import { type DiffFileWithLines, type InlineComment, userById } from '@/lib/fixtures';
import { cn, timeAgo } from '@/lib/utils';
import { ChatCircle, FileCode, PaperPlaneRight, X } from '@phosphor-icons/react';
import { useState } from 'react';
import { Avatar, MonoLabel } from './ui';

interface Props {
  files: DiffFileWithLines[];
  comments: InlineComment[];
  onAddComment: (c: InlineComment) => void;
  repoId: string;
  prId: string;
}

export function DiffView({ files, comments, onAddComment, repoId, prId }: Props) {
  const [active, setActive] = useState(0);
  const [composer, setComposer] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const file = files[active];
  if (!file) return null;

  const fileComments = comments.filter((c) => c.filePath === file.path);

  const submit = async (lineNumber: number) => {
    const body = draft.trim();
    if (!body) return;
    const created = await api.addComment(repoId, prId, file.path, lineNumber, body);
    onAddComment(created);
    setDraft('');
    setComposer(null);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-line px-3 py-2 scroll-thin">
        {files.map((f, i) => (
          <button
            type="button"
            key={f.path}
            onClick={() => setActive(i)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[11px] transition-colors',
              i === active
                ? 'border-line-strong bg-surface-2 text-ink'
                : 'border-transparent text-ink-faint hover:text-ink-muted',
            )}
          >
            <FileCode size={11} />
            {f.path.split('/').pop()}
            <span className="text-ok">+{f.additions}</span>
            <span className="text-err">−{f.deletions}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
        <p className="truncate font-mono text-[11px] text-ink-muted">{file.path}</p>
        <p className="ml-3 shrink-0 font-mono text-[10px]">
          <span className="text-ok">+{file.additions}</span>{' '}
          <span className="text-err">−{file.deletions}</span>
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-auto scroll-thin p-1.5">
        <div className="font-mono text-[11.5px] leading-[1.65]">
          {(file.lines ?? []).map((ln, i) => {
            const lineComments = ln.newLn
              ? fileComments.filter((c) => c.lineNumber === ln.newLn)
              : [];
            const clickable = ln.type === 'add' || ln.type === 'ctx';
            return (
              <div key={`${i}-${ln.newLn ?? ln.oldLn ?? 'm'}`}>
                <div
                  className={cn(
                    'group flex gap-0 rounded px-1',
                    ln.type === 'add' && 'bg-ok/10',
                    ln.type === 'del' && 'bg-err/10',
                    ln.type === 'meta' && 'mt-2 bg-surface-2/70 text-ink-faint',
                    clickable && 'cursor-pointer hover:bg-surface-2/60',
                  )}
                  onClick={() => clickable && setComposer(composer === i ? null : i)}
                  onKeyDown={(e) => {
                    if (clickable && (e.key === 'Enter' || e.key === ' ')) {
                      setComposer(composer === i ? null : i);
                    }
                  }}
                  tabIndex={clickable ? 0 : -1}
                  role={clickable ? 'button' : undefined}
                >
                  <span className="w-10 shrink-0 select-none pr-2 text-right text-[10px] text-ink-faint/60">
                    {ln.oldLn ?? ''}
                  </span>
                  <span
                    className={cn(
                      'w-10 shrink-0 select-none pr-2 text-right text-[10px]',
                      clickable ? 'text-ink-faint group-hover:text-accent' : 'text-ink-faint/60',
                    )}
                  >
                    {ln.newLn ?? ''}
                  </span>
                  <span
                    className={cn(
                      'whitespace-pre-wrap break-all pr-2',
                      ln.type === 'add' && 'text-ok',
                      ln.type === 'del' && 'text-err',
                      ln.type === 'ctx' && 'text-ink-muted',
                    )}
                  >
                    {ln.type === 'add'
                      ? '+ '
                      : ln.type === 'del'
                        ? '- '
                        : ln.type === 'meta'
                          ? ''
                          : '  '}
                    {ln.content}
                  </span>
                  {lineComments.length > 0 && (
                    <span className="ml-auto flex shrink-0 items-center gap-1 pr-1 text-[10px] text-accent">
                      <ChatCircle size={11} weight="fill" />
                      {lineComments.length}
                    </span>
                  )}
                </div>
                {lineComments.map((c) => {
                  const u = userById(c.userId);
                  return (
                    <div
                      key={c.id}
                      className="my-1 ml-10 rounded-lg border border-line bg-surface p-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar user={u} size={4.5} />
                        <p className="text-[11px] font-medium text-ink">{u.name}</p>
                        <span className="font-mono text-[9px] text-ink-faint">
                          line {c.lineNumber}
                        </span>
                        <span className="ml-auto font-mono text-[9px] text-ink-faint">
                          {timeAgo(c.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-[11.5px] leading-relaxed text-ink-muted">{c.body}</p>
                    </div>
                  );
                })}
                {composer === i && clickable && (
                  <div className="my-1 ml-10 rounded-lg border border-accent/40 bg-surface p-2.5">
                    <div className="flex items-center justify-between">
                      <MonoLabel>Comment · line {ln.newLn}</MonoLabel>
                      <button
                        type="button"
                        onClick={() => setComposer(null)}
                        className="text-ink-faint hover:text-ink"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <div className="mt-2 flex items-start gap-2">
                      <textarea
                        // biome-ignore lint/a11y/noAutofocus: composer opens on explicit user click
                        autoFocus
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && ln.newLn !== null) {
                            void submit(ln.newLn);
                          }
                        }}
                        placeholder="Leave an inline comment…"
                        rows={2}
                        className="min-w-0 flex-1 resize-none rounded-md border border-line bg-bg px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-faint focus:border-accent/50 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (ln.newLn !== null) void submit(ln.newLn);
                        }}
                        disabled={!draft.trim()}
                        className="mt-0.5 flex h-7 items-center gap-1 rounded-md bg-ink px-2.5 text-[11px] font-medium text-bg transition-transform active:scale-[0.98] disabled:opacity-40"
                      >
                        <PaperPlaneRight size={12} weight="fill" />
                        Send
                      </button>
                    </div>
                    <p className="mt-1.5 font-mono text-[9px] text-ink-faint">
                      ⌘↵ to post · syncs to GitHub
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
