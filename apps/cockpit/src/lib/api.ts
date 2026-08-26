import type {
  BriefT,
  DiffFileWithLines,
  DiffLine,
  InlineComment,
  MessageT,
  PrT,
  RepoT,
  ReviewT,
  TaskT,
} from './fixtures';

const DEFAULT_MODE = (import.meta.env.VITE_API_MODE ?? 'mock') as 'mock' | 'live';
const MODE_KEY = 'crux_api_mode';
const TOKEN_KEY = 'crux_token';
const ORG_ID = 'org_crux';

export function getApiMode(): 'mock' | 'live' {
  if (typeof window === 'undefined') return DEFAULT_MODE;
  const stored = localStorage.getItem(MODE_KEY);
  if (stored === 'mock' || stored === 'live') return stored;
  return DEFAULT_MODE;
}

export function setApiMode(mode: 'mock' | 'live'): void {
  localStorage.setItem(MODE_KEY, mode);
  window.dispatchEvent(new CustomEvent('crux:mode_change', { detail: mode }));
}

export const apiMode = getApiMode();

function authHeaders(idempotency = false): Record<string, string> {
  const h: Record<string, string> = {};
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) h.Authorization = `Bearer ${token}`;
  if (idempotency) h['Idempotency-Key'] = crypto.randomUUID();
  return h;
}

export async function ensureDevAuth(): Promise<string> {
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    try {
      const res = await fetch('/api/v1/auth/dev-token?user=sarah');
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        if (typeof data.accessToken === 'string' && data.accessToken) {
          token = data.accessToken;
          localStorage.setItem(TOKEN_KEY, data.accessToken);
          if (data.user) {
            localStorage.setItem('crux_user', JSON.stringify(data.user));
          }
        }
      }
    } catch {
      // Offline fallback
    }
  }
  return token || '';
}

async function live<T>(path: string, init?: RequestInit): Promise<T> {
  await ensureDevAuth();
  const isMutating = init?.method && init.method !== 'GET';
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(Boolean(isMutating)),
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let errMsg = `${res.status} ${path}`;
    try {
      const errJson = await res.json();
      errMsg = errJson.detail || errJson.message || errJson.code || errMsg;
    } catch {}
    throw new Error(errMsg);
  }

  const json = await res.json();
  return (json && typeof json === 'object' && 'data' in json ? json.data : json) as T;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const api = {
  get mode() {
    return getApiMode();
  },

  setMode(mode: 'mock' | 'live') {
    setApiMode(mode);
  },

  async repo(): Promise<RepoT> {
    if (getApiMode() === 'live') {
      try {
        const orgRepos = await live<RepoT[]>(`/orgs/${ORG_ID}/repos`);
        if (Array.isArray(orgRepos) && orgRepos.length > 0) return orgRepos[0];
      } catch {}
    }
    await sleep(100);
    return (await import('./fixtures')).repo;
  },

  async listPrs(repoId = 'repo_crux_core'): Promise<PrT[]> {
    if (getApiMode() === 'live') {
      try {
        const livePrs = await live<PrT[]>(`/repos/${repoId}/prs?limit=50`);
        if (Array.isArray(livePrs) && livePrs.length > 0) return livePrs;
      } catch {
        // If repo_crux_core not found, try fallback repo_segv_crux
        try {
          const fallbackPrs = await live<PrT[]>('/repos/repo_segv_crux/prs?limit=50');
          if (Array.isArray(fallbackPrs) && fallbackPrs.length > 0) return fallbackPrs;
        } catch {}
      }
    }
    await sleep(150);
    return (await import('./fixtures')).prs;
  },

  async getPr(repoId: string, prId: string): Promise<PrT> {
    if (getApiMode() === 'live') {
      try {
        return await live<PrT>(`/repos/${repoId}/prs/${prId}`);
      } catch (err) {
        console.warn('Live getPr failed, falling back to fixtures:', err);
      }
    }
    await sleep(120);
    const all = (await import('./fixtures')).prs;
    const pr = all.find((p) => p.id === prId) || all[0];
    if (!pr) throw new Error('PR not found');
    return pr;
  },

  async reviews(repoId: string, prId: string): Promise<ReviewT[]> {
    if (getApiMode() === 'live') {
      return live<ReviewT[]>(`/repos/${repoId}/prs/${prId}/reviews`).catch(() => []);
    }
    await sleep(150);
    return (await import('./fixtures')).reviews;
  },

  async submitReview(
    repoId: string,
    prId: string,
    body: {
      action: 'approved' | 'changes_requested' | 'comment';
      comment?: string;
      expectedHeadSha: string;
    },
  ): Promise<ReviewT> {
    if (getApiMode() === 'live') {
      return live<ReviewT>(`/repos/${repoId}/prs/${prId}/review`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    }
    await sleep(200);
    return {
      id: `rev_${Math.random().toString(36).slice(2, 8)}`,
      prId,
      reviewerId: 'usr_sarah',
      action: body.action,
      comment: body.comment ?? null,
      isDismissed: false,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  async tasks(repoId: string, prId: string): Promise<TaskT[]> {
    if (getApiMode() === 'live') {
      return live<TaskT[]>(`/repos/${repoId}/prs/${prId}/tasks`).catch(() => []);
    }
    await sleep(140);
    return (await import('./fixtures')).tasks;
  },

  async toggleTask(
    repoId: string,
    prId: string,
    taskId: string,
    done: boolean,
    expectedVersion = 1,
  ): Promise<TaskT> {
    if (getApiMode() === 'live') {
      return live<TaskT>(`/repos/${repoId}/prs/${prId}/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ done, expectedVersion }),
      });
    }
    await sleep(100);
    const all = (await import('./fixtures')).tasks;
    const target = all.find((t) => t.id === taskId);
    return {
      id: taskId,
      prId,
      assigneeId: target?.assigneeId ?? 'usr_sarah',
      linearTaskId: target?.linearTaskId ?? 'CRX-410',
      title: target?.title ?? 'Task',
      done,
      priority: target?.priority ?? 'p1',
      version: expectedVersion + 1,
      linearUrl: target?.linearUrl ?? null,
      createdAt: target?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  async messages(repoId: string, prId: string): Promise<MessageT[]> {
    if (getApiMode() === 'live') {
      return live<MessageT[]>(`/repos/${repoId}/prs/${prId}/messages?limit=100`).catch(() => []);
    }
    await sleep(160);
    return (await import('./fixtures')).messages;
  },

  async sendMessage(repoId: string, prId: string, text: string): Promise<MessageT> {
    if (getApiMode() === 'live') {
      return live<MessageT>(`/repos/${repoId}/prs/${prId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
    }
    await sleep(150);
    return {
      id: `msg_${Math.random().toString(36).slice(2, 8)}`,
      prId,
      userId: 'usr_sarah',
      slackMessageId: `S_${Date.now()}`,
      text,
      version: 1,
      sentAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  async brief(repoId: string, prId: string): Promise<BriefT | null> {
    if (getApiMode() === 'live') {
      return live<BriefT | null>(`/repos/${repoId}/prs/${prId}/brief`).catch(() => null);
    }
    await sleep(200);
    return (await import('./fixtures')).brief;
  },

  async regenerateBrief(repoId: string, prId: string): Promise<BriefT | null> {
    if (getApiMode() === 'live') {
      return live<BriefT | null>(`/repos/${repoId}/prs/${prId}/brief`, {
        method: 'POST',
        body: JSON.stringify({}),
      }).catch(() => null);
    }
    await sleep(400);
    return (await import('./fixtures')).brief;
  },

  async diff(repoId: string, prId: string): Promise<DiffFileWithLines[]> {
    if (getApiMode() === 'live') {
      try {
        const summary = await live<{
          prId: string;
          files: Array<{
            fileIndex: number;
            path: string;
            oldPath?: string | null;
            status: string;
            additions: number;
            deletions: number;
            isBinary: boolean;
          }>;
        }>(`/repos/${repoId}/prs/${prId}/diff`);

        if (summary && Array.isArray(summary.files) && summary.files.length > 0) {
          const filesWithLines = await Promise.all(
            summary.files.map(async (file) => {
              try {
                const ast = await live<{
                  fileIndex: number;
                  path: string;
                  status: string;
                  additions: number;
                  deletions: number;
                  chunks: Array<{
                    header: string;
                    lines: Array<{
                      type: 'context' | 'addition' | 'deletion';
                      oldLineNumber?: number;
                      newLineNumber?: number;
                      content: string;
                    }>;
                  }>;
                }>(`/repos/${repoId}/prs/${prId}/diff/files/${file.fileIndex}`);

                const lines: DiffLine[] = [];
                for (const chunk of ast.chunks ?? []) {
                  if (chunk.header) {
                    lines.push({ type: 'meta', oldLn: null, newLn: null, content: chunk.header });
                  }
                  for (const l of chunk.lines ?? []) {
                    lines.push({
                      type: l.type === 'addition' ? 'add' : l.type === 'deletion' ? 'del' : 'ctx',
                      oldLn: l.oldLineNumber ?? null,
                      newLn: l.newLineNumber ?? null,
                      content: l.content,
                    });
                  }
                }

                return {
                  id: `diff_${file.fileIndex}`,
                  prId,
                  fileIndex: file.fileIndex,
                  path: file.path,
                  oldPath: file.oldPath ?? null,
                  status: file.status as any,
                  additions: file.additions,
                  deletions: file.deletions,
                  isBinary: file.isBinary,
                  createdAt: new Date().toISOString(),
                  lines:
                    lines.length > 0
                      ? lines
                      : ([
                          {
                            type: 'meta' as const,
                            oldLn: null,
                            newLn: null,
                            content: `@@ -1,${file.deletions} +1,${file.additions} @@`,
                          },
                          {
                            type: 'add' as const,
                            oldLn: null,
                            newLn: 1,
                            content: `// File: ${file.path}`,
                          },
                          {
                            type: 'add' as const,
                            oldLn: null,
                            newLn: 2,
                            content: `// Changes: +${file.additions} -${file.deletions}`,
                          },
                        ] as DiffLine[]),
                };
              } catch {
                return {
                  id: `diff_${file.fileIndex}`,
                  prId,
                  fileIndex: file.fileIndex,
                  path: file.path,
                  oldPath: file.oldPath ?? null,
                  status: file.status as any,
                  additions: file.additions,
                  deletions: file.deletions,
                  isBinary: file.isBinary,
                  createdAt: new Date().toISOString(),
                  lines: [
                    {
                      type: 'meta' as const,
                      oldLn: null,
                      newLn: null,
                      content: `@@ -1,1 +1,${file.additions} @@`,
                    },
                    { type: 'add' as const, oldLn: null, newLn: 1, content: `// ${file.path}` },
                  ] as DiffLine[],
                };
              }
            }),
          );
          return filesWithLines;
        }
      } catch (err) {
        console.warn('Live diff failed, falling back to fixtures:', err);
      }
    }

    await sleep(180);
    return (await import('./fixtures')).diffFiles;
  },

  async comments(repoId: string, prId: string): Promise<InlineComment[]> {
    if (getApiMode() === 'live') {
      return live<InlineComment[]>(`/repos/${repoId}/prs/${prId}/comments`).catch(() => []);
    }
    await sleep(120);
    return (await import('./fixtures')).inlineComments;
  },

  async addComment(
    repoId: string,
    prId: string,
    filePath: string,
    lineNumber: number,
    body: string,
  ): Promise<InlineComment> {
    if (getApiMode() === 'live') {
      return live<InlineComment>(`/repos/${repoId}/prs/${prId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ filePath, lineNumber, side: 'RIGHT', body }),
      });
    }
    await sleep(120);
    return {
      id: `cmt_${Math.random().toString(36).slice(2, 8)}`,
      prId,
      filePath,
      lineNumber,
      userId: 'usr_sarah',
      body,
      createdAt: new Date().toISOString(),
    };
  },

  async mergePr(
    repoId: string,
    prId: string,
    body: {
      expectedHeadSha: string;
      expectedVersion: number;
      mergeMethod: 'squash';
      commitTitle?: string;
    },
  ): Promise<{ merged: boolean }> {
    if (getApiMode() === 'live') {
      await live<{ id: string; status: string }>(`/repos/${repoId}/prs/${prId}/merge`, {
        method: 'POST',
        body: JSON.stringify({
          expectedHeadSha: body.expectedHeadSha,
          expectedVersion: body.expectedVersion,
          mergeMethod: body.mergeMethod,
          commitTitle: body.commitTitle || 'Merged PR via Cockpit',
        }),
      });
      return { merged: true };
    }
    await sleep(300);
    return { merged: true };
  },
};
