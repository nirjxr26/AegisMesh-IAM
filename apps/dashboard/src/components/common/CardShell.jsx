import PropTypes from 'prop-types';

export default function CardShell({ children, className = '' }) {
    return (
        <div className={`bg-white border border-[#d0d7e8] rounded-2xl shadow-sm ${className}`}>
            {children}
        </div>
    );
}

CardShell.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
};
