import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { chartColors } from '../../theme/theme';
import './charts.css';

/** Donut with a side legend. data: [{ name, value, color? }] */
export default function DonutChart({ data, centerLabel, centerValue, height = 220 }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  const colorOf = (d, i) => d.color || chartColors[i % chartColors.length];
  return (
    <div className="donut">
      <div className="donut__chart" style={{ '--donut-size': `${height}px` }}>
        <ResponsiveContainer className="chart">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none">
              {data.map((d, i) => <Cell key={d.name} fill={colorOf(d, i)} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut__center">
          <div>
            <div className="donut__center-value">{centerValue ?? total}</div>
            <div className="donut__center-label">{centerLabel}</div>
          </div>
        </div>
      </div>
      <ul className="donut__legend">
        {data.map((d, i) => (
          <li key={d.name} className="donut__item">
            <span className="donut__dot" style={{ '--dot-color': colorOf(d, i) }} />
            <span className="donut__name">{d.name}</span>
            <span className="donut__value">{d.value}</span>
            <span className="donut__pct">{total ? Math.round((100 * d.value) / total) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
