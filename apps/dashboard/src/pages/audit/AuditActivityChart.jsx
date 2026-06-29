import PropTypes from 'prop-types';
import { BarChart2 } from 'lucide-react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { CardShell } from '../../components/common/CardShell';

export default function AuditActivityChart({ activityData, rangeLabel }) {
    return (
        <CardShell className="p-6 lg:col-span-2">
            <div className="mb-5 flex items-center gap-2">
                <div className="rounded-lg bg-[#4f46e5]/10 p-2 text-[#4f46e5]">
                    <BarChart2 size={16} />
                </div>

                <h3 className="text-[15px] font-semibold text-[#0f1623]">
                    Activity Volume
                </h3>

                <span className="ml-auto text-xs text-[#7a87a8]">
                    {rangeLabel}
                </span>
            </div>

            <div className="h-[280px] w-full">
                <ResponsiveContainer>
                    <AreaChart
                        data={activityData}
                        margin={{
                            top: 10,
                            right: 10,
                            left: -12,
                            bottom: 0,
                        }}
                    >
                        <defs>
                            <linearGradient
                                id="activityFill"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop
                                    offset="5%"
                                    stopColor="rgba(79,70,229,0.15)"
                                    stopOpacity={1}
                                />

                                <stop
                                    offset="95%"
                                    stopColor="rgba(79,70,229,0)"
                                    stopOpacity={1}
                                />
                            </linearGradient>
                        </defs>

                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#f0f2f8"
                        />

                        <XAxis
                            dataKey="label"
                            tick={{
                                fill: '#7a87a8',
                                fontSize: 11,
                            }}
                            axisLine={{ stroke: '#f0f2f8' }}
                            tickLine={false}
                        />

                        <YAxis
                            tick={{
                                fill: '#7a87a8',
                                fontSize: 11,
                            }}
                            axisLine={false}
                            tickLine={false}
                        />

                        <Tooltip
                            contentStyle={{
                                background: '#fff',
                                border: '1px solid #d0d7e8',
                                borderRadius: '12px',
                                fontSize: '12px',
                            }}
                        />

                        <Area
                            type="monotone"
                            dataKey="count"
                            stroke="#4f46e5"
                            strokeWidth={2}
                            fill="url(#activityFill)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </CardShell>
    );
}

AuditActivityChart.propTypes = {
    activityData: PropTypes.arrayOf(
        PropTypes.shape({
            label: PropTypes.string,
            count: PropTypes.number,
        }),
    ),
    rangeLabel: PropTypes.string,
};
