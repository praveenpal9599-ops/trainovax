import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import { chartColors } from '../../theme/theme';
import './charts.css';

/** Vertical or horizontal bar chart. series: [{ key, label, color?, stackId? }] */
export default function BarChartView({ data, xKey, series, layout = 'horizontal', xFormatter, yFormatter, unit = '', colorByValue, height = '100%', showLegend }) {
  const vertical = layout === 'vertical';
  return (
    <ResponsiveContainer width="100%" height={height} className="chart">
      <BarChart data={data} layout={layout} margin={{ top: 8, right: 12, left: vertical ? 8 : -8, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid strokeDasharray="3 3" vertical={vertical} horizontal={!vertical} />
        {vertical ? (
          <>
            <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={yFormatter} />
            <YAxis type="category" dataKey={xKey} tickLine={false} axisLine={false} width={110} tickFormatter={xFormatter} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} tickLine={false} tickFormatter={xFormatter} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} tickFormatter={yFormatter} />
          </>
        )}
        <Tooltip labelFormatter={xFormatter} formatter={(v, n) => [`${v}${unit ? ` ${unit}` : ''}`, n]} />
        {(showLegend ?? series.length > 1) && <Legend iconType="circle" iconSize={8} />}
        {series.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} stackId={s.stackId} fill={s.color || chartColors[i]} radius={s.stackId ? 0 : vertical ? [0, 6, 6, 0] : [6, 6, 0, 0]} maxBarSize={36}>
            {colorByValue && data.map((d) => <Cell key={d[xKey]} fill={colorByValue(d[s.key], d)} />)}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
