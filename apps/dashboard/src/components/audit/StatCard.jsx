import PropTypes from 'prop-types';
import { formatNumber } from './auditHelpers';
import { CardShell } from '../../components/common/CardShell';

export default function StatCard({
    icon, iconBg, label, value, valueClass,
}) {
    return (
        <CardShell className="flex items-center gap-3 px-5 py-4">
            <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}
            >
                {icon}
            </div>

            <div>
                <p className={`text-2xl font-bold ${valueClass}`}>
                    {formatNumber(value)}
                </p>

                <p className="mt-0.5 text-xs text-[#7a87a8]">
                    {label}
                </p>
            </div>
        </CardShell>
    );
}

StatCard.propTypes = {
    icon: PropTypes.node.isRequired,
    iconBg: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    value: PropTypes.number.isRequired,
    valueClass: PropTypes.string,
};

StatCard.defaultProps = {
    valueClass: 'text-[#0f1623]',
};
