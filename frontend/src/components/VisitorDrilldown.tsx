import { useQuery } from '@tanstack/react-query';
import { Users, Eye, Download, X, ExternalLink, Calendar } from 'lucide-react';

interface DailyVisitor {
  date: string;
  views: number;
  unique_visitors: number;
  clones: number;
  unique_cloners: number;
}

interface VisitorDrilldownProps {
  repoName: string;
  onClose: () => void;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function VisitorDrilldown({ repoName, onClose }: VisitorDrilldownProps) {
  const [owner, repo] = repoName.split('/');

  const { data = [], isLoading } = useQuery<DailyVisitor[]>({
    queryKey: ['repo-visitors', owner, repo],
    queryFn: () => fetch(`/api/repos/${owner}/${repo}/visitors`).then(r => r.json()),
    enabled: !!owner && !!repo,
  });

  const totalVisitors = data.reduce((s, d) => s + d.unique_visitors, 0);
  const totalViews = data.reduce((s, d) => s + d.views, 0);
  const totalClones = data.reduce((s, d) => s + d.clones, 0);
  const peakDay = data.length > 0
    ? data.reduce((max, d) => d.unique_visitors > max.unique_visitors ? d : max, data[0])
    : null;

  return (
    <div
      className="fade-in-up"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid rgba(6, 182, 212, 0.3)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 0 0 1px rgba(6, 182, 212, 0.1), 0 8px 32px rgba(0,0,0,0.3)',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '20px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Users size={16} style={{ color: '#10b981' }} />
            <h3 style={{
              margin: 0, fontSize: '16px', fontWeight: 700,
              color: 'var(--text-primary)',
            }}>
              Visitor Details
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <a
              href={`https://github.com/${repoName}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '13px',
                color: '#22d3ee',
                fontFamily: 'monospace',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => { (e.target as HTMLAnchorElement).style.textDecoration = 'underline'; }}
              onMouseLeave={(e) => { (e.target as HTMLAnchorElement).style.textDecoration = 'none'; }}
            >
              {repoName}
            </a>
            <ExternalLink size={11} style={{ color: '#64748b' }} />
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(100, 116, 139, 0.1)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244, 63, 94, 0.15)';
            (e.currentTarget as HTMLButtonElement).style.color = '#f43f5e';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(100, 116, 139, 0.1)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Summary mini-cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '20px',
      }}>
        {[
          { label: 'Unique Visitors', value: totalVisitors, icon: <Users size={14} />, color: '#10b981' },
          { label: 'Total Views', value: totalViews, icon: <Eye size={14} />, color: '#06b6d4' },
          { label: 'Total Clones', value: totalClones, icon: <Download size={14} />, color: '#8b5cf6' },
          { label: 'Peak Day', value: peakDay ? `${peakDay.unique_visitors} visitors` : '—', icon: <Calendar size={14} />, color: '#f59e0b', sub: peakDay ? formatDate(peakDay.date) : '' },
        ].map((card) => (
          <div key={card.label} style={{
            background: 'rgba(15, 23, 42, 0.5)',
            borderRadius: '10px',
            padding: '12px',
            border: '1px solid rgba(51, 65, 85, 0.5)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <span style={{ color: card.color }}>{card.icon}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>{card.label}</span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
            </div>
            {card.sub && (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{card.sub}</div>
            )}
          </div>
        ))}
      </div>

      {/* Daily breakdown table */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton" style={{ width: '100%', height: '36px', borderRadius: '6px' }} />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div style={{
          padding: '32px', textAlign: 'center',
          color: 'var(--text-muted)', fontSize: '14px',
        }}>
          No visitor data recorded for this repository yet.
        </div>
      ) : (
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Date', 'Visitors', 'Views', 'Clones', 'Clone Users'].map((h) => (
                  <th key={h} style={{
                    textAlign: h === 'Date' ? 'left' : 'right',
                    padding: '6px 10px',
                    fontSize: '10px',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: '1px solid var(--border-color)',
                    position: 'sticky',
                    top: 0,
                    background: 'var(--bg-card)',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => {
                const maxVisitors = Math.max(...data.map(d => d.unique_visitors));
                const barWidth = maxVisitors > 0 ? (row.unique_visitors / maxVisitors) * 100 : 0;
                return (
                  <tr key={row.date} style={{
                    borderBottom: idx < data.length - 1 ? '1px solid rgba(51,65,85,0.3)' : 'none',
                  }}>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {formatDate(row.date)}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        <div style={{
                          width: '60px',
                          height: '6px',
                          borderRadius: '3px',
                          background: 'rgba(16, 185, 129, 0.1)',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${barWidth}%`,
                            height: '100%',
                            borderRadius: '3px',
                            background: '#10b981',
                            transition: 'width 0.3s ease',
                          }} />
                        </div>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#34d399',
                          minWidth: '28px',
                          textAlign: 'right',
                        }}>
                          {row.unique_visitors}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                        {row.views}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                      <span style={{ fontSize: '13px', color: '#a78bfa' }}>
                        {row.clones}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {row.unique_cloners}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
