import PropTypes from 'prop-types';
import { PieChart, Pie, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CATEGORY_CONFIG } from './auditConfig';

function renderLegendLabel(value) {
    return <span style={{ color: '#94A3B8', fontSize: '11px' }}>{value}</span>;
}

export default function CategoryDonutChart({ data = [] }) {
    const chartData = data.map((entry) => ({
        name: CATEGORY_CONFIG[entry.category]?.label || entry.category,
        value: entry.count,
        fill: CATEGORY_CONFIG[entry.category]?.color || '#6B7280',
    }));

    return (
        <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
                <PieChart>
                    <Pie data={chartData} innerRadius={65} outerRadius={100} paddingAngle={2} dataKey="value" />
                    <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px', color: '#F1F5F9' }} />
                    <Legend
                        formatter={renderLegendLabel}
                        iconSize={8}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

CategoryDonutChart.propTypes = {
    data: PropTypes.arrayOf(PropTypes.shape({
        category: PropTypes.string,
        count: PropTypes.number,
    })),
};


