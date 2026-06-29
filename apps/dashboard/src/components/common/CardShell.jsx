import PropTypes from 'prop-types';

export function CardShell({ children, className = '' }) {
    return (
        <div className={`bg-white border border-[#d0d7e8] rounded-2xl shadow-sm overflow-hidden ${className}`}>
            {children}
        </div>
    );
}

CardShell.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
};

export function CardHeader({ icon: Icon, title, right = null }) {
    return (
        <div className="px-6 py-4 border-b border-[#f0f2f8] flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#4f46e5]/10 text-[#4f46e5] flex items-center justify-center">
                {Icon ? <Icon size={16} /> : null}
            </div>
            <h3 className="text-[15px] font-semibold text-[#0f1623]">{title}</h3>
            <div className="ml-auto">{right}</div>
        </div>
    );
}

CardHeader.propTypes = {
    icon: PropTypes.elementType,
    title: PropTypes.string.isRequired,
    right: PropTypes.node,
};

export default CardShell;
