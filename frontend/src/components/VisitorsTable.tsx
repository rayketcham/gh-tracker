import { Users } from 'lucide-react';

interface VisitorSummary {
  repo_name: string;
  total_unique_visitors: number;
  total_views: number;
  days_with_traffic: number;
}

interface VisitorsTableProps {
  data: VisitorSummary[];
  loading?: boolean;
  onSelectRepo?: (repo: string) => void;
}

export default function VisitorsTable({ data, loading = false, onSelectRepo }: VisitorsTableProps) {
  return (
    <div
      className="fade-in-up card-glow"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '24px',
      }}
    >
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Unique Visitors by Repository
        </h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
          Aggregated across all tracked days
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton" style={{ width: '100%', height: '44px', borderRadius: '8px' }} />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div
          style={{
            padding: '48px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            fontSize: '14px',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <Users size={28} style={{ opacity: 0.4 }} />
          <span>No visitor data yet</span>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Repository', 'Unique Visitors', 'Total Views', 'Active Days'].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: h === 'Repository' ? 'left' : 'right',
                      padding: '8px 12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      borderBottom: '1px solid var(--border-color)',
                      position: 'sticky',
                      top: 0,
                      background: 'var(--bg-card)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr
                  key={row.repo_name}
                  style={{
                    borderBottom: idx < data.length - 1 ? '1px solid rgba(51,65,85,0.5)' : 'none',
                    cursor: onSelectRepo ? 'pointer' : 'default',
                    transition: 'background 0.15s',
                  }}
                  onClick={() => onSelectRepo?.(row.repo_name)}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.03)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                  }}
                >
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#10b981' }}>
                          {idx + 1}
                        </span>
                      </div>
                      <span style={{
                        fontSize: '13px',
                        color: '#22d3ee',
                        fontFamily: 'monospace',
                      }}>
                        {row.repo_name}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                      <Users size={12} style={{ color: '#10b981' }} />
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#34d399' }}>
                        {row.total_unique_visitors.toLocaleString()}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                      {row.total_views.toLocaleString()}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <span style={{
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                      background: 'rgba(100, 116, 139, 0.1)',
                      padding: '2px 8px',
                      borderRadius: '10px',
                    }}>
                      {row.days_with_traffic}d
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
