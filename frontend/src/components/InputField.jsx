import { forwardRef, useState } from 'react';

const InputField = forwardRef(({
    label,
    type = 'text',
    error,
    icon: Icon,
    className = '',
    id,
    name,
    required,
    ...props
}, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    let inputType = type;

    if (isPassword) {
        inputType = showPassword ? 'text' : 'password';
    }
    const inputId = id || name || `field-${(label || 'input').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const errorId = `${inputId}-error`;

    return (
        <div className={`space-y-1.5 ${className}`}>
            {label && (
                <label htmlFor={inputId} className="block text-sm font-medium text-aws-text-dim">
                    {label}
                    {required ? (
                        <span aria-hidden="true" className="text-red-500 ml-1">*</span>
                    ) : null}
                </label>
            )}
            <div className="relative group">
                {Icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-aws-text-dim group-focus-within:text-aws-orange transition-colors">
                        <Icon size={18} />
                    </div>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    name={name}
                    type={inputType}
                    aria-describedby={error ? errorId : undefined}
                    aria-invalid={Boolean(error)}
                    aria-required={Boolean(required)}
                    required={required}
                    className={`w-full bg-aws-input border rounded-lg px-4 py-3 text-[#0f1623] placeholder:text-aws-text-dim/50 text-sm
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-aws-orange/30 focus:border-aws-orange
            hover:border-aws-text-dim/40
            ${Icon ? 'pl-10' : ''}
            ${isPassword ? 'pr-10' : ''}
            ${error ? 'border-aws-red/50 focus:ring-aws-red/30 focus:border-aws-red' : 'border-aws-input-border'}
          `}
                    {...props}
                />
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-aws-text-dim hover:text-aws-orange transition-colors"
                        tabIndex={-1}
                    >
                        {showPassword ? (
                            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                            </svg>
                        ) : (
                            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        )}
                    </button>
                )}
            </div>
            {error && (
                <p
                    id={errorId}
                    role="alert"
                    aria-live="polite"
                    className="text-aws-red text-xs flex items-center gap-1 animate-fade-in-up"
                    style={{ animationDuration: '0.2s' }}
                >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {error}
                </p>
            )}
        </div>
    );
});

InputField.displayName = 'InputField';

export default InputField;


