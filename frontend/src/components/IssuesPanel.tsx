import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle, GitPullRequest, ExternalLink } from 'lucide-react';

interface Issue {
  number: number;
  title: string;
  state: string;
  author: string;
  labels: string;
  created_at: string;
  closed_at: string | null;
  is_pr: number;
}

interface IssueSummary {
  open_issues: number;
  closed_issues: number;
  open_prs: number;
  closed_prs: number;
  total: number;
}

interface IssuesPanelProps {
  repoName: string;
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      background: `${color}12`, padding: '6px 12px',
      borderRadius: '8px', border: `1px solid ${color}25`,
    }}>
      <span style={{ fontSize: '16px', fontWeight: 700, color }}>{value}</span>
      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{label}</span>
    </div>
  );
}

export default function IssuesPanel({ repoName }: IssuesPanelProps) {
  const [owner, repo] = repoName.split('/');

  const { data: summary } = useQuery<IssueSummary>({
    queryKey: ['issues-summary', owner, repo],
    queryFn: () => fetch(`/api/repos/${owner}/${repo}/issues/summary`).then(r => r.json()),
    enabled: !!owner,
  });

  const { data: issues = [], isLoading } = useQuery<Issue[]>({
    queryKey: ['issues', owner, repo],
    queryFn: () => fetch(`/api/repos/${owner}/${repo}/issues`).then(r => r.json()),
    enabled: !!owner,
  });

  return (
    <div className="fade-in-up card-glow" style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: '16px',
      padding: '24px',
    }}>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Issues & Pull Requests
        </h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
          {repoName}
        </p>
      </div>

      {/* Summary badges */}
      {summary && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <StatBadge label="open issues" value={summary.open_issues} color="#f59e0b" />
          <StatBadge label="closed" value={summary.closed_issues} color="#10b981" />
          <StatBadge label="open PRs" value={summary.open_prs} color="#8b5cf6" />
          <StatBadge label="merged" value={summary.closed_prs} color="#06b6d4" />
        </div>
      )}

      {/* Issues list */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ width: '100%', height: '40px', borderRadius: '6px' }} />
          ))}
        </div>
      ) : issues.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
          No issues or PRs tracked yet
        </div>
      ) : (
        <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
          {issues.map((issue) => {
            const isOpen = issue.state === 'open';
            const isPR = issue.is_pr === 1;
            return (
              <a
                key={issue.number}
                href={`https://github.com/${repoName}/${isPR ? 'pull' : 'issues'}/${issue.number}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  transition: 'background 0.15s',
                  marginBottom: '2px',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.03)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}
              >
                {/* Icon */}
                <div style={{ paddingTop: '2px', flexShrink: 0 }}>
                  {isPR ? (
                    <GitPullRequest size={14} style={{ color: isOpen ? '#8b5cf6' : '#06b6d4' }} />
                  ) : isOpen ? (
                    <AlertCircle size={14} style={{ color: '#f59e0b' }} />
                  ) : (
                    <CheckCircle size={14} style={{ color: '#10b981' }} />
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {issue.title}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '2px',
                  }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      #{issue.number}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      by {issue.author}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {timeAgo(issue.created_at)}
                    </span>
                    {issue.labels && issue.labels.split(',').filter(Boolean).map(label => (
                      <span key={label} style={{
                        fontSize: '10px',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        background: 'rgba(139, 92, 246, 0.1)',
                        color: '#a78bfa',
                        border: '1px solid rgba(139, 92, 246, 0.2)',
                      }}>
                        {label}
                      </span>
                    ))}
                  </div>
                </div>

                <ExternalLink size={11} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '3px' }} />
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
