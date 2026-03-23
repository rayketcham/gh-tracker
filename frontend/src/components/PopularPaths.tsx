import { FileText, ExternalLink } from 'lucide-react';
import { PopularPath } from '../api';

interface PopularPathsProps {
  data: PopularPath[];
  loading?: boolean;
}

export default function PopularPaths({ data, loading = false }: PopularPathsProps) {
  const sorted = [...data].sort((a, b) => b.views - a.views).slice(0, 10);

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
          Popular Pages
        </h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
          Most visited paths in your repository
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton" style={{ width: '100%', height: '44px', borderRadius: '8px' }} />
          ))}
        </div>
      ) : sorted.length === 0 ? (
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
          <FileText size={28} style={{ opacity: 0.4 }} />
          <span>No page data yet</span>
          <span style={{ fontSize: '12px', opacity: 0.6 }}>Configure repos to start collecting</span>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Path', 'Title', 'Views', 'Unique'].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: h === 'Views' || h === 'Unique' ? 'right' : 'left',
                      padding: '8px 12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      borderBottom: '1px solid var(--border-color)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, idx) => (
                <tr
                  key={row.path}
                  style={{
                    borderBottom: idx < sorted.length - 1 ? '1px solid rgba(51,65,85,0.5)' : 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.03)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                  }}
                >
                  <td style={{ padding: '10px 12px', maxWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '4px',
                          background: 'rgba(6,182,212,0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#06b6d4' }}>
                          {idx + 1}
                        </span>
                      </span>
                      <span
                        style={{
                          fontSize: '12px',
                          color: '#22d3ee',
                          fontFamily: 'monospace',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '160px',
                          display: 'block',
                        }}
                        title={row.path}
                      >
                        {row.path}
                      </span>
                      <ExternalLink size={10} style={{ color: '#64748b', flexShrink: 0 }} />
                    </div>
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      maxWidth: '180px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={row.title}
                  >
                    {row.title || '—'}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {row.views.toLocaleString()}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {row.unique_visitors.toLocaleString()}
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
