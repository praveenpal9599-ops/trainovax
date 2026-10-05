import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts';
import { chartColors } from '../../theme/theme';
import './charts.css';

const niceTick = (v) => (Number.isInteger(v) ? v : Number(v).toFixed(1));

/**
 * Line / area trend chart.
 * series: [{ key, label, color?, unit? }]
 */
export default function TrendChart({ data, xKey = 'date', series, area = true, xFormatter, yFormatter, height = '100%', unit = '', referenceY, domain = ['auto', 'auto'], showLegend }) {
  const Chart = area && series.length === 1 ? AreaChart : LineChart;
  return (
    <ResponsiveContainer width="100%" height={height} className="chart">
      <Chart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color || chartColors[i]} stopOpacity={0.22} />
              <stop offset="100%" stopColor={s.color || chartColors[i]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} tickFormatter={xFormatter} tickLine={false} minTickGap={16} />
        <YAxis domain={domain} tickFormatter={yFormatter || niceTick} tickLine={false} axisLine={false} width={48} />
        <Tooltip labelFormatter={xFormatter} formatter={(v, n) => [`${v}${unit ? ` ${unit}` : ''}`, n]} />
        {(showLegend ?? series.length > 1) && <Legend iconType="circle" iconSize={8} />}
        {referenceY != null && <ReferenceLine y={referenceY} className="chart-reference" strokeDasharray="4 4" />}
        {series.map((s, i) => (area && series.length === 1
          ? <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color || chartColors[i]} strokeWidth={2.5} fill={`url(#grad-${s.key})`} dot={{ r: 3, strokeWidth: 0, fill: s.color || chartColors[i] }} activeDot={{ r: 5 }} connectNulls />
          : <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color || chartColors[i]} strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0, fill: s.color || chartColors[i] }} activeDot={{ r: 5 }} connectNulls />))}
      </Chart>
    </ResponsiveContainer>
  );
}
