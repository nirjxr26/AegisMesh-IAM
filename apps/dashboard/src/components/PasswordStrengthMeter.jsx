import { useMemo } from 'react';
import PropTypes from 'prop-types';

const strengthLevels = [
    { label: 'Very Weak', color: 'bg-red-500', textColor: 'text-red-400', minScore: 0 },
    { label: 'Weak', color: 'bg-orange-500', textColor: 'text-[#4f46e5]', minScore: 1 },
    { label: 'Fair', color: 'bg-yellow-500', textColor: 'text-yellow-400', minScore: 2 },
    { label: 'Strong', color: 'bg-green-500', textColor: 'text-green-400', minScore: 3 },
    { label: 'Very Strong', color: 'bg-emerald-500', textColor: 'text-emerald-400', minScore: 4 },
];

export default function PasswordStrengthMeter({ password = '' }) {
    const { score, checks } = useMemo(() => {
        const checks = {
            minLength: password.length >= 8,
            hasUpper: /[A-Z]/.test(password),
            hasLower: /[a-z]/.test(password),
            hasNumber: /\d/.test(password),
            hasSpecial: /[@$!%*?&]/.test(password),
        };

        const score = Object.values(checks).filter(Boolean).length;
        return { score, checks };
    }, [password]);

    if (!password) return null;

    const level = strengthLevels[Math.min(score, 4) - 1] || strengthLevels[0];
    const percentage = (score / 5) * 100;

    return (
        <div className="space-y-3 animate-fade-in-up" style={{ animationDuration: '0.3s' }}>
            {/* Strength Bar */}
            <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                    <span className="text-xs text-aws-text-dim">Password Strength</span>
                    <span className={`text-xs font-medium ${level.textColor}`}>{level.label}</span>
                </div>
                <div className="h-1.5 bg-aws-input rounded-full overflow-hidden">
                    <div
                        className={`h-full ${level.color} rounded-full transition-all duration-500 ease-out`}
                        style={{ width: `${percentage}%` }}
                    ></div>
                </div>
            </div>

            {/* Requirements Checklist */}
            <div className="grid grid-cols-2 gap-1.5">
                {[
                    { key: 'minLength', label: '8+ characters' },
                    { key: 'hasUpper', label: 'Uppercase letter' },
                    { key: 'hasLower', label: 'Lowercase letter' },
                    { key: 'hasNumber', label: 'Number' },
                    { key: 'hasSpecial', label: 'Special char (@$!%*?&)' },
                ].map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-1.5">
                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all duration-300 ${checks[key]
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-aws-input text-aws-text-dim/40'
                            }`}>
                            {checks[key] ? (
                                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <div className="w-1 h-1 rounded-full bg-current"></div>
                            )}
                        </div>
                        <span className={`text-[11px] transition-colors ${checks[key] ? 'text-green-400' : 'text-aws-text-dim/60'}`}>
                            {label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

PasswordStrengthMeter.propTypes = {
    password: PropTypes.string,
};


