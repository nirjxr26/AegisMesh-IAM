import PropTypes from 'prop-types';

export default function PolicyBadge({ effect }) {
    if (effect === 'ALLOW') {
        return (
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-green-500/20 text-green-400 border border-green-500/50">
                ALLOW
            </span>
        );
    }
    return (
        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-red-500/20 text-red-400 border border-red-500/50">
            DENY
        </span>
    );
}

PolicyBadge.propTypes = {
    effect: PropTypes.oneOf(['ALLOW', 'DENY']),
};


