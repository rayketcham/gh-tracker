import { useQuery } from '@tanstack/react-query';
import { Star, Eye, GitFork, Users, ExternalLink, Code } from 'lucide-react';

interface PeopleSummary {
  repo_name: string;
  stargazers_count: number;
  watchers_count: number;
  forkers_count: number;
  contributors_count: number;
  recent_stargazers: Array<{ username: string; starred_at: string }>;
  recent_forkers: Array<{ username: string; fork_repo: string; forked_at: string }>;
  top_contributors: Array<{ username: string; commits: number; additions: number; deletions: number }>;
}

interface PeoplePanelProps {
  repoName: string;
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const now = new Date();
  const then = new Date(dateStr);
  const diff = now.getTime() - then.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function UserLink({ username }: { username: string }) {
  return (
    <a
      href={`https://github.com/${username}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        color: '#22d3ee',
        textDecoration: 'none',
        fontSize: '13px',
        fontWeight: 500,
      }}
      onMouseEnter={(e) => { (e.target as HTMLAnchorElement).style.textDecoration = 'underline'; }}
      onMouseLeave={(e) => { (e.target as HTMLAnchorElement).style.textDecoration = 'none'; }}
    >
      <img
        src={`https://github.com/${username}.png?size=20`}
        alt=""
        style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid var(--border-color)' }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
      {username}
    </a>
  );
}

function Section({ title, icon, color, count, children }: {
  title: string;
  icon: React.ReactNode;
  color: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.5)',
      borderRadius: '12px',
      border: '1px solid rgba(51, 65, 85, 0.5)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color }}>{icon}</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>
        </div>
        <span style={{
          fontSize: '12px',
          fontWeight: 700,
          color,
          background: `${color}18`,
          padding: '2px 10px',
          borderRadius: '10px',
        }}>
          {count}
        </span>
      </div>
      <div style={{ padding: '8px 0', maxHeight: '200px', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  );
}

function PersonRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '6px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
    >
      {children}
    </div>
  );
}

export default function PeoplePanel({ repoName }: PeoplePanelProps) {
  const [owner, repo] = repoName.split('/');

  const { data, isLoading } = useQuery<PeopleSummary>({
    queryKey: ['people', owner, repo],
    queryFn: () => fetch(`/api/repos/${owner}/${repo}/people`).then(r => r.json()),
    enabled: !!owner && !!repo,
  });

  if (isLoading) {
    return (
      <div className="fade-in-up card-glow" style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '24px',
      }}>
        <div className="skeleton" style={{ width: '100%', height: '300px', borderRadius: '8px' }} />
      </div>
    );
  }

  if (!data) return null;

  const totalPeople = new Set([
    ...data.recent_stargazers.map(s => s.username),
    ...(data.top_contributors || []).map(c => c.username),
    ...data.recent_forkers.map(f => f.username),
  ]).size;

  return (
    <div className="fade-in-up card-glow" style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: '16px',
      padding: '24px',
    }}>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <Users size={16} style={{ color: '#10b981' }} />
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
            People — Who's Engaging
          </h3>
        </div>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
          {totalPeople} unique people across stars, forks, and contributions
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '12px',
      }}>
        {/* Stargazers */}
        <Section title="Stargazers" icon={<Star size={14} />} color="#f59e0b" count={data.stargazers_count}>
          {data.recent_stargazers.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              No stargazers yet
            </div>
          ) : (
            data.recent_stargazers.map((s) => (
              <PersonRow key={s.username}>
                <UserLink username={s.username} />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {timeAgo(s.starred_at)}
                </span>
              </PersonRow>
            ))
          )}
        </Section>

        {/* Contributors */}
        <Section title="Contributors" icon={<Code size={14} />} color="#06b6d4" count={data.contributors_count}>
          {(data.top_contributors || []).length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              No contributor data yet
            </div>
          ) : (
            (data.top_contributors || []).map((c) => (
              <PersonRow key={c.username}>
                <UserLink username={c.username} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {c.commits} commits
                  </span>
                  <span style={{ fontSize: '11px', color: '#10b981' }}>+{c.additions.toLocaleString()}</span>
                  <span style={{ fontSize: '11px', color: '#f43f5e' }}>-{c.deletions.toLocaleString()}</span>
                </div>
              </PersonRow>
            ))
          )}
        </Section>

        {/* Forkers */}
        <Section title="Forkers" icon={<GitFork size={14} />} color="#8b5cf6" count={data.forkers_count}>
          {data.recent_forkers.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              No forks yet
            </div>
          ) : (
            data.recent_forkers.map((f) => (
              <PersonRow key={f.username}>
                <UserLink username={f.username} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <a
                    href={`https://github.com/${f.fork_repo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--text-muted)', display: 'flex' }}
                    title={f.fork_repo}
                  >
                    <ExternalLink size={11} />
                  </a>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {timeAgo(f.forked_at)}
                  </span>
                </div>
              </PersonRow>
            ))
          )}
        </Section>

        {/* Watchers */}
        <Section title="Watchers" icon={<Eye size={14} />} color="#10b981" count={data.watchers_count}>
          {data.watchers_count === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              No watchers yet
            </div>
          ) : (
            <div style={{ padding: '8px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
              {data.watchers_count} people watching for notifications
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
