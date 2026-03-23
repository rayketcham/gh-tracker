import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: number; // percentage change, positive = up
  icon: ReactNode;
  color: 'emerald' | 'cyan' | 'violet' | 'rose' | 'amber';
  loading?: boolean;
  animClass?: string;
}

const colorMap = {
  emerald: {
    bg: 'rgba(16, 185, 129, 0.1)',
    border: 'rgba(16, 185, 129, 0.2)',
    icon: '#10b981',
    text: '#34d399',
  },
  cyan: {
    bg: 'rgba(6, 182, 212, 0.1)',
    border: 'rgba(6, 182, 212, 0.2)',
    icon: '#06b6d4',
    text: '#22d3ee',
  },
  violet: {
    bg: 'rgba(139, 92, 246, 0.1)',
    border: 'rgba(139, 92, 246, 0.2)',
    icon: '#8b5cf6',
    text: '#a78bfa',
  },
  rose: {
    bg: 'rgba(244, 63, 94, 0.1)',
    border: 'rgba(244, 63, 94, 0.2)',
    icon: '#f43f5e',
    text: '#fb7185',
  },
  amber: {
    bg: 'rgba(245, 158, 11, 0.1)',
    border: 'rgba(245, 158, 11, 0.2)',
    icon: '#f59e0b',
    text: '#fbbf24',
  },
};

function formatNumber(n: number | string): string {
  if (typeof n === 'string') return n;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function KpiCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  color,
  loading = false,
  animClass = 'fade-in-up',
}: KpiCardProps) {
  const c = colorMap[color];

  const TrendIcon =
    trend === undefined || trend === 0
      ? Minus
      : trend > 0
      ? TrendingUp
      : TrendingDown;
  const trendColor =
    trend === undefined || trend === 0
      ? '#64748b'
      : trend > 0
      ? '#10b981'
      : '#f43f5e';

  return (
    <div
      className={`card-glow ${animClass}`}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background accent */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: c.bg,
          transform: 'translate(30%, -30%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: c.bg,
            border: `1px solid ${c.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: c.icon,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>

        {trend !== undefined && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontWeight: 600,
              color: trendColor,
              background: `${trendColor}18`,
              padding: '4px 8px',
              borderRadius: '20px',
            }}
          >
            <TrendIcon size={12} />
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>

      {loading ? (
        <>
          <div className="skeleton" style={{ width: '80px', height: '32px', marginBottom: '8px' }} />
          <div className="skeleton" style={{ width: '120px', height: '14px' }} />
        </>
      ) : (
        <>
          <div
            style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.5px',
              lineHeight: 1.1,
              marginBottom: '6px',
            }}
          >
            {formatNumber(value)}
          </div>
          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {subtitle}
            </div>
          )}
        </>
      )}
    </div>
  );
}
