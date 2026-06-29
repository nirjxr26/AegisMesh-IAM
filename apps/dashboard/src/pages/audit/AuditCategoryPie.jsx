import PropTypes from 'prop-types';
import { PieChart as PieChartIcon } from 'lucide-react';
import {
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
} from 'recharts';

export default function AuditCategoryPie({ donutData }) {
    return (
        <div className="rounded-2xl border border-[#d0d7e8] bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
                <div className="rounded-lg bg-[#4f46e5]/10 p-2 text-[#4f46e5]">
                    <PieChartIcon size={16} />
                </div>

                <h3 className="text-[15px] font-semibold text-[#0f1623]">
                    Category Breakdown
                </h3>
            </div>

            <div className="h-[240px] w-full">
                <ResponsiveContainer>
                    <PieChart>
                        <Pie
                            data={donutData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={60}
                            outerRadius={90}
                        />

                        <Tooltip
                            contentStyle={{
                                background: '#fff',
                                border: '1px solid #d0d7e8',
                                borderRadius: '12px',
                                fontSize: '12px',
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                {donutData.map((item) => (
                    <div
                        key={item.id}
                        className="flex items-center gap-1.5 text-xs text-[#3a4560]"
                    >
                        <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: item.fill }}
                        />

                        <span>{item.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

AuditCategoryPie.propTypes = {
    donutData: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            name: PropTypes.string,
            value: PropTypes.number,
            fill: PropTypes.string,
        }),
    ),
};
