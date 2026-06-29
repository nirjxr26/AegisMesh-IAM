import PropTypes from 'prop-types';

export default function WizardStep({ title, subtitle, icon: Icon, color, children }) {
    const colors = color || {
        bg: 'bg-indigo-50',
        icon: 'text-indigo-600',
    };

    return (
        <div className="space-y-5 px-6 py-5">
            {(title || subtitle) && (
                <div className="flex items-center gap-3">
                    {Icon && (
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors.bg}`}>
                            <Icon size={18} className={colors.icon} />
                        </div>
                    )}

                    <div>
                        {title && <p className="text-lg font-bold text-slate-900">{title}</p>}
                        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
                    </div>
                </div>
            )}

            {children}
        </div>
    );
}

WizardStep.propTypes = {
    title: PropTypes.string,
    subtitle: PropTypes.string,
    icon: PropTypes.elementType,
    color: PropTypes.shape({
        bg: PropTypes.string,
        icon: PropTypes.string,
    }),
    children: PropTypes.node,
};
