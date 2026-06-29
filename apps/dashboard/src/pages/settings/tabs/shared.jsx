/* eslint-disable react-refresh/only-export-components */
import { createElement, useId, Children, cloneElement, isValidElement } from 'react';
import PropTypes from 'prop-types';
import { Eye, EyeOff } from 'lucide-react';

export function classNames(...values) {
    return values.filter(Boolean).join(' ');
}

export function getPasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z\d\s]/.test(password)) score += 1;
    if (score <= 2) return { label: 'Weak', color: 'bg-[#dc2626]', textColor: 'text-[#dc2626]', pct: 25 };
    if (score === 3) return { label: 'Fair', color: 'bg-[#d97706]', textColor: 'text-[#d97706]', pct: 50 };
    if (score === 4) return { label: 'Strong', color: 'bg-[#16a34a]', textColor: 'text-[#16a34a]', pct: 75 };
    return { label: 'Very Strong', color: 'bg-[#059669]', textColor: 'text-[#059669]', pct: 100 };
}

export const LANG_OPTIONS = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'ja', label: 'Japanese' },
    { value: 'zh', label: 'Mandarin' },
];

export const TIMEZONE_OPTIONS = [
    'UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London',
    'Europe/Berlin', 'Asia/Tokyo', 'Asia/Singapore', 'Asia/Kolkata', 'Australia/Sydney',
];

export const NOTIFICATION_ROWS = {
    security: [
        { keyEmail: 'newLoginEmail', keyInApp: 'newLoginInApp', label: 'New Login', description: 'Notify when your account signs in from a new device.' },
        { keyEmail: 'passwordChangedEmail', keyInApp: 'passwordChangedInApp', label: 'Password Changed', description: 'Alert whenever password credentials are updated.' },
        { keyEmail: 'mfaDisabledEmail', keyInApp: 'mfaDisabledInApp', label: 'MFA Disabled', description: 'Send immediate notice if multi-factor auth is turned off.' },
        { keyEmail: 'failedLoginEmail', keyInApp: 'failedLoginInApp', label: 'Failed Login Attempts', description: 'Warn when repeated failed auth attempts are detected.' },
        { keyEmail: 'sessionRevokedEmail', keyInApp: 'sessionRevokedInApp', label: 'Session Revoked', description: 'Inform when an active session is revoked.' },
        { keyEmail: 'accessChangedEmail', keyInApp: 'accessChangedInApp', label: 'App, Token & Device Access', description: 'Notify when API tokens, connected apps, or trusted devices change.' },
    ],
    activity: [
        { keyEmail: 'userCreatedEmail', keyInApp: 'userCreatedInApp', label: 'User Created', description: 'Notify about new user onboarding events.' },
        { keyEmail: 'roleAssignedEmail', keyInApp: 'roleAssignedInApp', label: 'Role Assigned', description: 'Alert when roles are granted to users or groups.' },
        { keyEmail: 'policyChangedEmail', keyInApp: 'policyChangedInApp', label: 'Policy Changed', description: 'Track updates to policy rules and effects.' },
        { keyEmail: 'auditExportEmail', keyInApp: 'auditExportInApp', label: 'Audit Export', description: 'Inform when audit datasets are exported.' },
    ],
};

export const API_SCOPE_OPTIONS = [
    { value: 'read:users', description: 'Read users and profile metadata' },
    { value: 'write:users', description: 'Create and update users' },
    { value: 'read:roles', description: 'Read role definitions' },
    { value: 'write:roles', description: 'Manage roles and assignments' },
    { value: 'read:policies', description: 'Read policy documents' },
    { value: 'write:policies', description: 'Create and update policies' },
    { value: 'read:audit', description: 'Read audit logs and stats' },
    { value: 'write:groups', description: 'Manage groups and memberships' },
];

export const OTP_INPUT_IDS = ['otp-0', 'otp-1', 'otp-2', 'otp-3', 'otp-4', 'otp-5'];

export function Toggle({ checked, onChange }) {
    return (
        <label style={{
            position: 'relative', display: 'inline-flex', alignItems: 'center',
            cursor: 'pointer', width: 44, height: 24, flexShrink: 0,
        }}>
            <input type="checkbox" checked={checked} onChange={onChange} aria-label="Toggle setting"
                style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
            <span style={{
                position: 'absolute', inset: 0, borderRadius: 12,
                background: checked ? '#6366f1' : '#e2e8f0', transition: 'background 200ms ease',
            }} />
            <span style={{
                position: 'absolute', top: 3, left: 3, width: 18, height: 18,
                borderRadius: '50%', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                transition: 'transform 200ms ease', transform: checked ? 'translateX(20px)' : 'translateX(0)',
            }} />
        </label>
    );
}

Toggle.propTypes = {
    checked: PropTypes.bool.isRequired,
    onChange: PropTypes.func.isRequired,
};

export function Modal({ title, icon: Icon, children, onClose }) {
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-0 sm:items-center sm:p-4">
            <div className="mx-4 w-full overflow-hidden rounded-t-[20px] border border-[#d0d7e8] bg-white shadow-2xl sm:mx-0 sm:max-w-2xl sm:rounded-2xl">
                <div className="px-6 py-4 border-b border-[#f0f2f8] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {Icon ? (
                            <div className="w-8 h-8 rounded-lg bg-[#4f46e5]/10 text-[#4f46e5] flex items-center justify-center">
                                <Icon size={16} />
                            </div>
                        ) : null}
                        <h3 className="text-[15px] font-semibold text-[#0f1623]">{title}</h3>
                    </div>
                    <button type="button" onClick={onClose} className="text-[#7a87a8] hover:text-[#0f1623] text-sm">Close</button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

Modal.propTypes = {
    title: PropTypes.string,
    icon: PropTypes.elementType,
    children: PropTypes.node,
    onClose: PropTypes.func,
};

export function TabButton({ tab, active, onClick }) {
    const Icon = tab.icon;
    return (
        <button
            type="button"
            onClick={() => onClick(tab.id)}
            className={classNames(
                'flex shrink-0 items-center gap-[10px] whitespace-nowrap border-none border-b-2 border-transparent px-[14px] py-[10px] text-left transition-all duration-150 md:mb-0.5 md:w-full md:rounded-[10px] md:border-b-0',
                active
                    ? 'border-[#6366f1] bg-transparent text-[#6366f1] font-semibold md:bg-[#ede9fe]'
                    : 'bg-transparent text-[#64748b] hover:text-[#374151] font-medium md:hover:bg-[#f8fafc]'
            )}
        >
            <Icon size={16} className="shrink-0" />
            <span className="flex-1 text-[13px] font-medium text-inherit">{tab.label}</span>
            {tab.badge ? (
                <span className="ml-auto bg-[#6366f1] text-white text-[10px] font-bold rounded-[20px] px-[7px] py-[1px] min-w-[20px] text-center">
                    {tab.badge}
                </span>
            ) : null}
        </button>
    );
}

TabButton.propTypes = {
    tab: PropTypes.shape({
        id: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        icon: PropTypes.elementType.isRequired,
        badge: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }).isRequired,
    active: PropTypes.bool.isRequired,
    onClick: PropTypes.func.isRequired,
};

export function Field({ label, error, children }) {
    const generatedId = useId();
    const childArray = Children.toArray(children);
    if (childArray.length === 1 && isValidElement(childArray[0])) {
        const child = childArray[0];
        const existingId = child.props?.id;
        const idToUse = existingId || generatedId;
        const renderedChild = existingId ? child : cloneElement(child, { id: idToUse });
        return (
            <div>
                <label htmlFor={idToUse} className="text-xs text-[#7a87a8] font-medium mb-1 block">{label}</label>
                {renderedChild}
                {error ? <p className="text-xs text-[#dc2626] mt-1">{error}</p> : null}
            </div>
        );
    }
    return (
        <div>
            <div className="text-xs text-[#7a87a8] font-medium mb-1 block">{label}</div>
            {children}
            {error ? <p className="text-xs text-[#dc2626] mt-1">{error}</p> : null}
        </div>
    );
}

Field.propTypes = {
    label: PropTypes.string.isRequired,
    error: PropTypes.string,
    children: PropTypes.node,
};

export function CardShell({ children }) {
    return <div className="bg-white border border-[#d0d7e8] rounded-2xl overflow-hidden shadow-sm">{children}</div>;
}

CardShell.propTypes = {
    children: PropTypes.node,
};

export function CardHeader({ icon: Icon, title, right = null }) {
    return (
        <div className="px-6 py-4 border-b border-[#f0f2f8] flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#4f46e5]/10 text-[#4f46e5] flex items-center justify-center">
                {createElement(Icon, { size: 16 })}
            </div>
            <h3 className="text-[15px] font-semibold text-[#0f1623]">{title}</h3>
            <div className="ml-auto">{right}</div>
        </div>
    );
}

CardHeader.propTypes = {
    icon: PropTypes.elementType.isRequired,
    title: PropTypes.string.isRequired,
    right: PropTypes.node,
};

export function PasswordField({ label, value, onChange, visible, onToggle, error }) {
    return (
        <Field label={label} error={error}>
            <div className="relative">
                <input
                    type={visible ? 'text' : 'password'}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full border border-[#d0d7e8] rounded-xl px-3 py-2 text-sm pr-10"
                />
                <button type="button" onClick={onToggle} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7a87a8]">
                    {visible ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
            </div>
        </Field>
    );
}

PasswordField.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    visible: PropTypes.bool.isRequired,
    onToggle: PropTypes.func.isRequired,
    error: PropTypes.string,
};

export function PolicyToggleRow({ label, value, onChange }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm text-[#0f1623]">{label}</span>
            <Toggle checked={value} onChange={onChange} />
        </div>
    );
}

PolicyToggleRow.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.bool.isRequired,
    onChange: PropTypes.func.isRequired,
};

export function DangerRow({ title, description, actionLabel, onAction }) {
    return (
        <div className="px-6 py-4 border-b border-[#f0f2f8] last:border-0 flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-[#0f1623]">{title}</p>
                <p className="text-xs text-[#7a87a8] mt-0.5">{description}</p>
            </div>
            <button type="button" onClick={onAction} className="px-3 py-1.5 rounded-lg text-sm border border-red-200 text-[#dc2626] hover:bg-red-50">
                {actionLabel}
            </button>
        </div>
    );
}

DangerRow.propTypes = {
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    actionLabel: PropTypes.string.isRequired,
    onAction: PropTypes.func.isRequired,
};

export function NotificationPrefRow({ row, mergedPrefs, setLocalPrefs }) {
    const emailEnabled = Boolean(mergedPrefs[row.keyEmail]);
    const inAppEnabled = Boolean(mergedPrefs[row.keyInApp]);
    const handleToggleEmail = () => setLocalPrefs((prev) => ({ ...prev, [row.keyEmail]: !emailEnabled }));
    const handleToggleInApp = () => setLocalPrefs((prev) => ({ ...prev, [row.keyInApp]: !inAppEnabled }));
    return (
        <div className="px-6 py-[14px] border-b border-[#f8fafc] last:border-0 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0 pr-3">
                <p className="text-[13px] font-medium text-[#0f172a]">{row.label}</p>
                <p className="text-[11px] text-[#94a3b8] mt-0.5">{row.description}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
                <span className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-[0.05em]">EMAIL</span>
                <Toggle checked={emailEnabled} onChange={handleToggleEmail} />
                <span className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-[0.05em]">IN-APP</span>
                <Toggle checked={inAppEnabled} onChange={handleToggleInApp} />
            </div>
        </div>
    );
}

NotificationPrefRow.propTypes = {
    row: PropTypes.shape({
        keyEmail: PropTypes.string.isRequired,
        keyInApp: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        description: PropTypes.string.isRequired,
    }).isRequired,
    mergedPrefs: PropTypes.object.isRequired,
    setLocalPrefs: PropTypes.func.isRequired,
};
