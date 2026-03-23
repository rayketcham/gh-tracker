import { useQuery } from '@tanstack/react-query';
import { Star, GitFork, Eye, AlertCircle, GitCommit, Tag, HardDrive, ExternalLink } from 'lucide-react';

interface RepoMetadata {
  repo_name: string;
  description: string;
  language: string;
  topics: string;
  stars: number;
  forks: number;
  watchers_count: number;
  open_issues_count: number;
  size_kb: number;
  license: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  default_branch: string;
  homepage: string;
  total_commits: number;
  releases_count: number;
  languages_json: string;
  collected_at: string;
}

// Language colors — a curated subset of the most common languages
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Rust: '#dea584',
  Go: '#00ADD8',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Shell: '#89e051',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Dockerfile: '#384d54',
  Makefile: '#427819',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  Haskell: '#5e5086',
  Elixir: '#6e4a7e',
  Scala: '#c22d40',
  Clojure: '#db5855',
  R: '#198CE7',
  Lua: '#000080',
  Nix: '#7e7eff',
};

function getLanguageColor(lang: string): string {
  return LANGUAGE_COLORS[lang] ?? '#6b7280';
}

function formatSize(sizeKb: number): string {
  if (sizeKb < 1024) return `${sizeKb} KB`;
  return `${(sizeKb / 1024).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

interface StatPillProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: string;
}

function StatPill({ icon, label, value, color = '#06b6d4' }: StatPillProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      background: `${color}12`,
      border: `1px solid ${color}25`,
      borderRadius: '8px',
      padding: '6px 12px',
      fontSize: '12px',
    }}>
      <span style={{ color }}>{icon}</span>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{value}</span>
    </div>
  );
}

interface LanguageBarProps {
  languagesJson: string;
}

function LanguageBar({ languagesJson }: LanguageBarProps) {
  let langs: Record<string, number> = {};
  try {
    langs = JSON.parse(languagesJson);
  } catch {
    return null;
  }

  const entries = Object.entries(langs);
  if (entries.length === 0) return null;

  const total = entries.reduce((s, [, v]) => s + v, 0);
  const sorted = [...entries].sort(([, a], [, b]) => b - a);

  return (
    <div style={{ marginTop: '12px' }}>
      {/* Bar */}
      <div style={{
        display: 'flex',
        height: '6px',
        borderRadius: '4px',
        overflow: 'hidden',
        gap: '2px',
        marginBottom: '8px',
      }}>
        {sorted.map(([lang, bytes]) => (
          <div
            key={lang}
            title={`${lang}: ${((bytes / total) * 100).toFixed(1)}%`}
            style={{
              flex: bytes,
              background: getLanguageColor(lang),
              borderRadius: '2px',
            }}
          />
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        {sorted.slice(0, 6).map(([lang, bytes]) => (
          <div key={lang} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: getLanguageColor(lang),
              flexShrink: 0,
            }} />
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              {lang}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {((bytes / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface RepoHeaderProps {
  repoName: string;
}

export default function RepoHeader({ repoName }: RepoHeaderProps) {
  const [owner, repo] = repoName.split('/');

  const { data: meta, isLoading } = useQuery<RepoMetadata>({
    queryKey: ['metadata', owner, repo],
    queryFn: () => fetch(`/api/repos/${owner}/${repo}/metadata`).then(r => r.json()),
    enabled: !!owner && !!repo,
  });

  if (isLoading) {
    return (
      <div className="fade-in-up card-glow" style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '16px',
      }}>
        <div className="skeleton" style={{ width: '60%', height: '20px', borderRadius: '6px', marginBottom: '10px' }} />
        <div className="skeleton" style={{ width: '100%', height: '14px', borderRadius: '4px', marginBottom: '6px' }} />
        <div className="skeleton" style={{ width: '80%', height: '14px', borderRadius: '4px' }} />
      </div>
    );
  }

  if (!meta) return null;

  const topics = meta.topics ? meta.topics.split(',').filter(Boolean) : [];
  const hasLanguages = meta.languages_json && meta.languages_json !== '{}';
  const githubUrl = `https://github.com/${repoName}`;

  return (
    <div className="fade-in-up card-glow" style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '16px',
    }}>
      {/* Top row: title + GitHub link */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <h2 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.3px',
          }}>
            {repoName}
          </h2>
          {meta.license && (
            <span style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.1)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              fontWeight: 500,
            }}>
              {meta.license}
            </span>
          )}
          {meta.default_branch && (
            <span style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '10px',
              background: 'rgba(6, 182, 212, 0.08)',
              color: '#22d3ee',
              border: '1px solid rgba(6, 182, 212, 0.15)',
              fontWeight: 500,
            }}>
              {meta.default_branch}
            </span>
          )}
        </div>

        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            color: 'var(--text-muted)',
            fontSize: '12px',
            textDecoration: 'none',
            flexShrink: 0,
            padding: '4px 10px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(6, 182, 212, 0.4)';
            (e.currentTarget as HTMLAnchorElement).style.color = '#22d3ee';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border-color)';
            (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-muted)';
          }}
        >
          <ExternalLink size={12} />
          GitHub
        </a>
      </div>

      {/* Description */}
      {meta.description && (
        <p style={{
          margin: '0 0 12px 0',
          fontSize: '13px',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          maxWidth: '800px',
        }}>
          {meta.description}
        </p>
      )}

      {/* Homepage link */}
      {meta.homepage && (
        <a
          href={meta.homepage.startsWith('http') ? meta.homepage : `https://${meta.homepage}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            fontSize: '12px',
            color: '#22d3ee',
            textDecoration: 'none',
            marginBottom: '12px',
          }}
        >
          {meta.homepage}
        </a>
      )}

      {/* Topics */}
      {topics.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
          {topics.map(topic => (
            <span key={topic} style={{
              fontSize: '11px',
              padding: '3px 10px',
              borderRadius: '12px',
              background: 'rgba(99, 102, 241, 0.1)',
              color: '#a5b4fc',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              fontWeight: 500,
            }}>
              {topic}
            </span>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: hasLanguages ? '0' : '0' }}>
        <StatPill icon={<Star size={12} />} label="stars" value={meta.stars.toLocaleString()} color="#f59e0b" />
        <StatPill icon={<GitFork size={12} />} label="forks" value={meta.forks.toLocaleString()} color="#8b5cf6" />
        <StatPill icon={<Eye size={12} />} label="watchers" value={meta.watchers_count.toLocaleString()} color="#10b981" />
        <StatPill icon={<AlertCircle size={12} />} label="open issues" value={meta.open_issues_count.toLocaleString()} color="#f43f5e" />
        {meta.total_commits > 0 && (
          <StatPill icon={<GitCommit size={12} />} label="commits" value={meta.total_commits.toLocaleString()} color="#06b6d4" />
        )}
        {meta.releases_count > 0 && (
          <StatPill icon={<Tag size={12} />} label="releases" value={meta.releases_count.toLocaleString()} color="#10b981" />
        )}
        {meta.size_kb > 0 && (
          <StatPill icon={<HardDrive size={12} />} label="size" value={formatSize(meta.size_kb)} color="#94a3b8" />
        )}
        {meta.pushed_at && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            fontSize: '12px',
            color: 'var(--text-muted)',
          }}>
            <span>Last pushed</span>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }} title={formatDate(meta.pushed_at)}>
              {timeAgo(meta.pushed_at)}
            </span>
          </div>
        )}
      </div>

      {/* Language bar */}
      {hasLanguages && (
        <LanguageBar languagesJson={meta.languages_json} />
      )}
    </div>
  );
}
