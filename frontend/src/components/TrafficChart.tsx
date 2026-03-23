import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrafficDay } from '../api';

interface TrafficChartProps {
  data: TrafficDay[];
  loading?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '12px',
        padding: '12px 16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      <p style={{ color: '#94a3b8', fontSize: '12px', margin: '0 0 8px 0' }}>
        {label}
      </p>
      {payload.map((entry) => (
        <div
          key={entry.name}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '24px',
            alignItems: 'center',
            marginBottom: '4px',
          }}
        >
          <span style={{ color: entry.color, fontSize: '12px', fontWeight: 500 }}>
            {entry.name}
          </span>
          <span style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: 700 }}>
            {entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function TrafficChart({ data, loading = false }: TrafficChartProps) {
  const chartData = data.map((d) => ({
    date: formatDate(d.date),
    Views: d.views,
    'Unique Visitors': d.unique_visitors,
    Clones: d.clones,
    'Unique Cloners': d.unique_cloners,
  }));

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
          Traffic Over Time
        </h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
          Daily views, clones, and unique visitors
        </p>
      </div>

      {loading ? (
        <div className="skeleton" style={{ width: '100%', height: '260px', borderRadius: '8px' }} />
      ) : data.length === 0 ? (
        <div
          style={{
            height: '260px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            fontSize: '14px',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '32px' }}>📊</span>
          <span>No traffic data yet</span>
          <span style={{ fontSize: '12px', opacity: 0.7 }}>Configure repos to start collecting</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="visitorsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="clonesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#1e293b"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '12px', color: '#94a3b8' }}
            />
            <Area
              type="monotone"
              dataKey="Views"
              stroke="#06b6d4"
              strokeWidth={2}
              fill="url(#viewsGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#06b6d4', strokeWidth: 0 }}
            />
            <Area
              type="monotone"
              dataKey="Unique Visitors"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#visitorsGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
            />
            <Area
              type="monotone"
              dataKey="Clones"
              stroke="#8b5cf6"
              strokeWidth={2}
              fill="url(#clonesGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#8b5cf6', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
