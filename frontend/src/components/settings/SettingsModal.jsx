import PropTypes from 'prop-types';
import { Eye, EyeOff } from 'lucide-react';

export function classNames(...values) {
    return values.filter(Boolean).join(' ');
}

export function Field({
    id,
    label,
    error,
    children,
    required = false,
}) {
    return (
        <div className="space-y-1.5">
            {label ? (
                <label
                    htmlFor={id}
                    className="text-sm font-medium text-[#0f1623]"
                >
                    {label}
                    {required ? ' *' : ''}
                </label>
            ) : null}

            {children}

            {error ? (
                <p className="text-xs text-[#dc2626]">
                    {error}
                </p>
            ) : null}
        </div>
    );
}

Field.propTypes = {
    id: PropTypes.string,
    label: PropTypes.string,
    error: PropTypes.string,
    required: PropTypes.bool,
    children: PropTypes.node.isRequired,
};

export function Toggle({
    id,
    checked,
    onChange,
    label,
}) {
    return (
        <div className="flex items-center justify-between gap-3">
            {label ? (
                <label
                    htmlFor={id}
                    className="text-sm text-[#0f1623]"
                >
                    {label}
                </label>
            ) : null}

            <div className="relative">
                <input
                    id={id}
                    type="checkbox"
                    checked={checked}
                    onChange={onChange}
                    className="sr-only"
                />

                <button
                    type="button"
                    role="switch"
                    aria-checked={checked}
                    aria-label={label || 'Toggle'}
                    onClick={onChange}
                    className={classNames(
                        'relative inline-flex h-6 w-11 rounded-full transition-colors duration-200',
                        checked
                            ? 'bg-[#4f46e5]'
                            : 'bg-[#d0d7e8]'
                    )}
                >
                    <span
                        className={classNames(
                            'inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 mt-0.5',
                            checked
                                ? 'translate-x-5'
                                : 'translate-x-0.5'
                        )}
                    />
                </button>
            </div>
        </div>
    );
}

Toggle.propTypes = {
    id: PropTypes.string.isRequired,
    checked: PropTypes.bool.isRequired,
    onChange: PropTypes.func.isRequired,
    label: PropTypes.string,
};

export function PasswordField({
    id,
    label,
    value,
    onChange,
    visible,
    onToggle,
    error,
    required = false,
}) {
    return (
        <Field
            id={id}
            label={label}
            error={error}
            required={required}
        >
            <div className="relative">
                <input
                    id={id}
                    type={visible ? 'text' : 'password'}
                    value={value}
                    onChange={(event) => {
                        onChange(event.target.value);
                    }}
                    className={classNames(
                        'w-full rounded-xl border px-4 py-2.5 text-sm',
                        'focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25',
                        error
                            ? 'border-[#dc2626]'
                            : 'border-[#d0d7e8]'
                    )}
                />

                <button
                    type="button"
                    onClick={onToggle}
                    aria-label={
                        visible
                            ? 'Hide password'
                            : 'Show password'
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a87a8] hover:text-[#0f1623]"
                >
                    {visible ? (
                        <EyeOff size={16} />
                    ) : (
                        <Eye size={16} />
                    )}
                </button>
            </div>
        </Field>
    );
}

PasswordField.propTypes = {
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    visible: PropTypes.bool.isRequired,
    onToggle: PropTypes.func.isRequired,
    error: PropTypes.string,
    required: PropTypes.bool,
};

export function Modal({
    title,
    icon: Icon,
    children,
    onClose,
}) {
    return (
        <dialog
            open
            className="fixed inset-0 z-[70] bg-transparent"
        >
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />

            <div className="fixed inset-0 flex items-center justify-center p-4">
                <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[#d0d7e8] bg-white shadow-2xl">
                    <div className="flex items-center justify-between border-b border-[#f0f2f8] px-6 py-4">
                        <div className="flex items-center gap-3">
                            {Icon ? (
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4f46e5]/10 text-[#4f46e5]">
                                    <Icon size={16} />
                                </div>
                            ) : null}

                            <h2 className="text-sm font-semibold text-[#0f1623]">
                                {title}
                            </h2>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="text-sm text-[#7a87a8] hover:text-[#0f1623]"
                        >
                            Close
                        </button>
                    </div>

                    <div className="p-6">
                        {children}
                    </div>
                </div>
            </div>
        </dialog>
    );
}

Modal.propTypes = {
    title: PropTypes.string.isRequired,
    icon: PropTypes.elementType,
    children: PropTypes.node.isRequired,
    onClose: PropTypes.func.isRequired,
};

export function getPasswordStrength(password) {
    let score = 0;

    if (password.length >= 8) {
        score += 1;
    }

    if (/[A-Z]/.test(password)) {
        score += 1;
    }

    if (/[a-z]/.test(password)) {
        score += 1;
    }

    if (/\d/.test(password)) {
        score += 1;
    }

    if (/[^A-Za-z\d\s]/.test(password)) {
        score += 1;
    }

    if (score <= 2) {
        return {
            label: 'Weak',
            color: 'bg-[#dc2626]',
            textColor: 'text-[#dc2626]',
            pct: 25,
        };
    }

    if (score === 3) {
        return {
            label: 'Fair',
            color: 'bg-[#d97706]',
            textColor: 'text-[#d97706]',
            pct: 50,
        };
    }

    if (score === 4) {
        return {
            label: 'Strong',
            color: 'bg-[#16a34a]',
            textColor: 'text-[#16a34a]',
            pct: 75,
        };
    }

    return {
        label: 'Very Strong',
        color: 'bg-[#059669]',
        textColor: 'text-[#059669]',
        pct: 100,
    };
}

export function handleOtpChange({
    index,
    value,
    setOtpDigits,
}) {
    const cleanValue = value
        .replace(/\D/g, '')
        .slice(-1);

    setOtpDigits((previousDigits) => {
        const updatedDigits = [...previousDigits];

        updatedDigits[index] = cleanValue;

        return updatedDigits;
    });
}