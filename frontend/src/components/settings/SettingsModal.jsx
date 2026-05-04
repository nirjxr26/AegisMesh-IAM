import { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AlertTriangle,
    AppWindow,
    Bell,
    Building2,
    Clock,
    Eye,
    EyeOff,
    Info,
    Key,
    Lock,
    Monitor,
    ShieldCheck,
    Smartphone,
    Settings as SettingsIcon,
    Trash2,
    User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ConnectedApps from '../security/ConnectedApps';
import ReauthModal from '../security/ReauthModal';
import SecurityScore from '../security/SecurityScore';
import { useAuth } from '../../context/AuthContext';
import { useReauth } from '../../hooks/useReauth';
import { connectedAppsAPI, settingsAPI } from '../../services/api';

const TAB_DEFS = [
    {
        id: 'profile',
        label: 'Profile',
        icon: User,
        title: 'Personal Information',
        subtitle: 'Update your name, email, and preferences',
    },
    {
        id: 'notifications',
        label: 'Notifications',
        icon: Bell,
        title: 'Notification Preferences',
        subtitle: 'Control which events trigger alerts',
    },
    {
        id: 'organization',
        label: 'Organization',
        icon: Building2,
        adminOnly: true,
        title: 'Organization Settings',
        subtitle: 'System-wide security and access policies',
    },
    {
        id: 'api-keys',
        label: 'API Keys',
        icon: Key,
        title: 'API Keys & Tokens',
        subtitle: 'Manage programmatic access credentials',
    },
    {
        id: 'connected-apps',
        label: 'Connected Apps',
        icon: AppWindow,
        title: 'Connected Apps',
        subtitle: 'Apps and API tokens with access to your account',
    },
];

const NOTIFICATION_ROWS = {
    security: [
        {
            keyEmail: 'newLoginEmail',
            keyInApp: 'newLoginInApp',
            label: 'New Login',
            description: 'Notify when your account signs in from a new device.',
        },
        {
            keyEmail: 'passwordChangedEmail',
            keyInApp: 'passwordChangedInApp',
            label: 'Password Changed',
            description: 'Alert whenever password credentials are updated.',
        },
        {
            keyEmail: 'mfaDisabledEmail',
            keyInApp: 'mfaDisabledInApp',
            label: 'MFA Disabled',
            description: 'Send immediate notice if multi-factor auth is turned off.',
        },
        {
            keyEmail: 'failedLoginEmail',
            keyInApp: 'failedLoginInApp',
            label: 'Failed Login Attempts',
            description: 'Warn when repeated failed auth attempts are detected.',
        },
        {
            keyEmail: 'sessionRevokedEmail',
            keyInApp: 'sessionRevokedInApp',
            label: 'Session Revoked',
            description: 'Inform when an active session is revoked.',
        },
        {
            keyEmail: 'accessChangedEmail',
            keyInApp: 'accessChangedInApp',
            label: 'App, Token & Device Access',
            description: 'Notify when API tokens, connected apps, or trusted devices change.',
        },
    ],
    activity: [
        {
            keyEmail: 'userCreatedEmail',
            keyInApp: 'userCreatedInApp',
            label: 'User Created',
            description: 'Notify about new user onboarding events.',
        },
        {
            keyEmail: 'roleAssignedEmail',
            keyInApp: 'roleAssignedInApp',
            label: 'Role Assigned',
            description: 'Alert when roles are granted to users or groups.',
        },
        {
            keyEmail: 'policyChangedEmail',
            keyInApp: 'policyChangedInApp',
            label: 'Policy Changed',
            description: 'Track updates to policy rules and effects.',
        },
        {
            keyEmail: 'auditExportEmail',
            keyInApp: 'auditExportInApp',
            label: 'Audit Export',
            description: 'Inform when audit datasets are exported.',
        },
    ],
};

const API_SCOPE_OPTIONS = [
    { value: 'read:users', description: 'Read users and profile metadata' },
    { value: 'write:users', description: 'Create and update users' },
    { value: 'read:roles', description: 'Read role definitions' },
    { value: 'write:roles', description: 'Manage roles and assignments' },
    { value: 'read:policies', description: 'Read policy documents' },
    { value: 'write:policies', description: 'Create and update policies' },
    { value: 'read:audit', description: 'Read audit logs and stats' },
    { value: 'write:groups', description: 'Manage groups and memberships' },
];

function classNames(...values) {
    return values.filter(Boolean).join(' ');
}

function isReauthCancelled(error) {
    return error?.message === 'Re-authentication cancelled';
}

function getInitials(user) {
    const first = user?.firstName?.[0] || '';
    const last = user?.lastName?.[0] || '';
    return `${first}${last}`.toUpperCase() || 'U';
}

function formatDate(value) {
    if (!value) return 'Never';
    return new Date(value).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatRelative(value) {
    if (!value) return 'Unknown';

    const now = Date.now();
    const ts = new Date(value).getTime();
    const diffMs = Math.max(0, now - ts);
    const minutes = Math.floor(diffMs / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;

    const months = Math.floor(days / 30);
    return `${months}mo ago`;
}

function daysSince(value) {
    if (!value) return 'Never';
    const diff = Date.now() - new Date(value).getTime();
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    if (days <= 0) return 'Today';
    return `${days} day${days === 1 ? '' : 's'} ago`;
}

function getPasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z\d\s]/.test(password)) score += 1;

    if (score <= 2) return { label: 'Weak', color: 'bg-[#dc2626]', textColor: 'text-[#dc2626]', pct: 25 };
    if (score === 3) return { label: 'Fair', color: 'bg-[#d97706]', textColor: 'text-[#d97706]', pct: 50 };
    if (score === 4) return { label: 'Strong', color: 'bg-[#16a34a]', textColor: 'text-[#16a34a]', pct: 75 };
    return { label: 'Very Strong', color: 'bg-[#059669]', textColor: 'text-[#059669]', pct: 100 };
}

function Toggle({ checked, onChange }) {
    return (
        <label style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            cursor: 'pointer',
            width: 44,
            height: 24,
            flexShrink: 0,
        }}>
            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
                style={{
                    opacity: 0,
                    width: 0,
                    height: 0,
                    position: 'absolute',
                }}
            />
            <span style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 12,
                background: checked ? '#6366f1' : '#e2e8f0',
                transition: 'background 200ms ease',
            }} />
            <span style={{
                position: 'absolute',
                top: 3,
                left: 3,
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#ffffff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                transition: 'transform 200ms ease',
                transform: checked ? 'translateX(20px)' : 'translateX(0)',
            }} />
        </label>
    );
}

function Modal({ title, icon: Icon, children, onClose }) {
    return (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 backdrop-blur-sm p-0 sm:items-center sm:p-4">
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
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-[#7a87a8] hover:text-[#0f1623] text-sm"
                    >
                        Close
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

function ProfileTab({ user, onProfileUpdated }) {
    const queryClient = useQueryClient();
    const fileInputRef = useRef(null);

    const [form, setForm] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        jobTitle: user?.jobTitle || '',
        department: user?.department || '',
    });
    const [errors, setErrors] = useState({});

    const updateMutation = useMutation({
        mutationFn: (payload) => settingsAPI.updateProfile(payload),
        onSuccess: async (res) => {
            toast.success('Profile updated successfully');
            setErrors({});
            await queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
            onProfileUpdated?.(res.data?.data);
        },
        onError: (err) => {
            const details = err.response?.data?.error?.details || [];
            const mapped = {};
            details.forEach((item) => {
                if (item.field) mapped[item.field] = item.message;
            });
            setErrors(mapped);
            if (!details.length) {
                toast.error(err.response?.data?.error?.message || 'Failed to update profile');
            }
        },
    });

    const uploadMutation = useMutation({
        mutationFn: (file) => settingsAPI.uploadAvatar(file),
        onSuccess: async () => {
            toast.success('Avatar updated');
            await queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
        },
        onError: (err) => {
            toast.error(err.response?.data?.error?.message || 'Failed to upload avatar');
        },
    });

    const removeMutation = useMutation({
        mutationFn: () => settingsAPI.deleteAvatar(),
        onSuccess: async () => {
            toast.success('Avatar removed');
            await queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
        },
        onError: (err) => {
            toast.error(err.response?.data?.error?.message || 'Failed to remove avatar');
        },
    });

    const handleSave = () => {
        updateMutation.mutate(form);
    };

    return (
        <div className="w-full space-y-5">
            <div className="bg-[#f4f6fb] border border-[#d0d7e8] rounded-2xl p-5 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5">
                {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Avatar" className="w-16 h-16 rounded-2xl object-cover" />
                ) : (
                    <div className="w-16 h-16 rounded-2xl bg-[#4f46e5]/10 text-[#4f46e5] text-xl font-bold flex items-center justify-center">
                        {getInitials(user)}
                    </div>
                )}

                <div className="space-y-2 min-w-0">
                    <div>
                        <p className="text-[15px] font-semibold text-[#0f1623] truncate">
                            {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Unknown User'}
                        </p>
                        <p className="text-[13px] text-[#7a87a8] truncate">{user?.email || 'No email'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-1.5 text-sm border border-[#d0d7e8] rounded-lg text-[#3a4560] hover:bg-white"
                            disabled={uploadMutation.isPending}
                        >
                            Upload Photo
                        </button>
                        {user?.avatarUrl ? (
                            <button
                                type="button"
                                onClick={() => removeMutation.mutate()}
                                className="text-xs text-[#dc2626] hover:underline"
                            >
                                Remove
                            </button>
                        ) : null}
                    </div>
                    <p className="text-xs text-[#7a87a8]">JPG, PNG or WebP. Max 2MB.</p>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadMutation.mutate(file);
                    }}
                />
            </div>

            <div className="bg-white border border-[#d0d7e8] rounded-2xl p-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="First Name" error={errors.firstName}>
                        <input
                            value={form.firstName}
                            onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
                            className="w-full border border-[#d0d7e8] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25 focus:border-[#4f46e5]"
                        />
                    </Field>

                    <Field label="Last Name" error={errors.lastName}>
                        <input
                            value={form.lastName}
                            onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
                            className="w-full border border-[#d0d7e8] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25 focus:border-[#4f46e5]"
                        />
                    </Field>

                    <Field label="Job Title">
                        <input
                            value={form.jobTitle}
                            onChange={(e) => setForm((prev) => ({ ...prev, jobTitle: e.target.value }))}
                            className="w-full border border-[#d0d7e8] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25 focus:border-[#4f46e5]"
                        />
                    </Field>

                    <Field label="Email">
                        <input
                            value={user?.email || ''}
                            readOnly
                            className="w-full border border-[#d0d7e8] rounded-xl px-4 py-2.5 text-sm bg-[#f4f6fb] cursor-not-allowed"
                        />
                    </Field>

                    <Field label="Department">
                        <input
                            value={form.department}
                            onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
                            className="w-full border border-[#d0d7e8] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25 focus:border-[#4f46e5]"
                        />
                    </Field>

                </div>

                <div className="flex justify-end gap-3 pt-1">
                    <button
                        type="button"
                        onClick={() => setForm({
                            firstName: user?.firstName || '',
                            lastName: user?.lastName || '',
                            jobTitle: user?.jobTitle || '',
                            department: user?.department || '',
                        })}
                        className="px-4 py-2 rounded-lg text-sm border border-[#d0d7e8] text-[#3a4560] hover:bg-[#f4f6fb]"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="px-4 py-2 rounded-lg text-sm bg-[#4f46e5] text-white hover:bg-[#3730a3]"
                        disabled={updateMutation.isPending}
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

function SecurityTab({ user, sessions = [], apiKeys = [], connectedApps = [], onNavigateTab }) {
    const queryClient = useQueryClient();
    const { withReauth, reauthModal, handleReauthSuccess, handleReauthClose } = useReauth();
    const passwordSectionRef = useRef(null);
    const loginHistorySectionRef = useRef(null);

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [passwordErrors, setPasswordErrors] = useState({});
    const [passwordVisibility, setPasswordVisibility] = useState({
        currentPassword: false,
        newPassword: false,
        confirmPassword: false,
    });

    const [showMfaModal, setShowMfaModal] = useState(false);
    const [mfaStep, setMfaStep] = useState(1);
    const [mfaSetup, setMfaSetup] = useState(null);
    const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
    const [revealedBackupCodes, setRevealedBackupCodes] = useState([]);

    const { data: loginHistoryData } = useQuery({
        queryKey: ['settings-login-history'],
        queryFn: () => settingsAPI.getLoginHistory().then((res) => res.data?.data || []),
    });

    const { data: trustedDevicesData } = useQuery({
        queryKey: ['settings-trusted-devices'],
        queryFn: () => settingsAPI.getTrustedDevices().then((res) => res.data?.data || []),
    });

    const changePasswordMutation = useMutation({
        mutationFn: (payload) => settingsAPI.changePassword(payload),
        onSuccess: async () => {
            toast.success('Password updated');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setPasswordErrors({});
            await queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
        },
        onError: (err) => {
            const details = err.response?.data?.error?.details || [];
            const mapped = {};
            details.forEach((item) => {
                if (item.field) mapped[item.field] = item.message;
            });
            setPasswordErrors(mapped);
            if (!details.length) {
                toast.error(err.response?.data?.error?.message || 'Failed to update password');
            }
        },
    });

    const mfaSetupMutation = useMutation({
        mutationFn: () => settingsAPI.getMfaSetup(),
        onSuccess: (res) => {
            setMfaSetup(res.data?.data);
            setShowMfaModal(true);
            setMfaStep(1);
            setOtpDigits(['', '', '', '', '', '']);
        },
        onError: (err) => {
            toast.error(err.response?.data?.error?.message || 'Failed to initialize MFA setup');
        },
    });

    const verifyMfaMutation = useMutation({
        mutationFn: ({ token, secret, stateToken }) => settingsAPI.verifyMfa({ token, secret, stateToken }),
        onSuccess: async (res) => {
            setRevealedBackupCodes(res.data?.data?.backupCodes || []);
            setMfaStep(3);
            await queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
        },
        onError: (err) => {
            toast.error(err.response?.data?.error?.message || 'Invalid verification code');
        },
    });

    const disableMfaMutation = useMutation({
        mutationFn: () => withReauth(
            (credentials) => settingsAPI.disableMfa(credentials),
            'disabling two-factor authentication'
        ),
        onSuccess: async () => {
            toast.success('MFA disabled');
            await queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
        },
        onError: (err) => {
            if (isReauthCancelled(err)) return;
            toast.error(err.response?.data?.error?.message || 'Failed to disable MFA');
        },
    });

    const regenCodesMutation = useMutation({
        mutationFn: () => withReauth(
            (credentials) => settingsAPI.regenerateBackupCodes(credentials),
            'regenerating backup codes'
        ),
        onSuccess: async (res) => {
            setRevealedBackupCodes(res.data?.data?.backupCodes || []);
            setShowMfaModal(true);
            setMfaStep(3);
            toast.success('Backup codes regenerated');
            await queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
        },
        onError: (err) => {
            if (isReauthCancelled(err)) return;
            toast.error(err.response?.data?.error?.message || 'Failed to regenerate backup codes');
        },
    });

    const revokeDeviceMutation = useMutation({
        mutationFn: (deviceId) => settingsAPI.revokeTrustedDevice(deviceId),
        onSuccess: async () => {
            toast.success('Trusted device revoked');
            await queryClient.invalidateQueries({ queryKey: ['settings-trusted-devices'] });
        },
        onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to revoke device'),
    });

    const revokeAllDevicesMutation = useMutation({
        mutationFn: () => settingsAPI.revokeAllTrustedDevices(),
        onSuccess: async () => {
            toast.success('All trusted devices revoked');
            await queryClient.invalidateQueries({ queryKey: ['settings-trusted-devices'] });
        },
        onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to revoke all devices'),
    });

    const passwordStrength = getPasswordStrength(passwordData.newPassword || '');

    const loginHistory = loginHistoryData || [];
    const trustedDevices = trustedDevicesData || [];

    const otpValue = otpDigits.join('');

    const handleSecurityAction = (check) => {
        if (!check) return;

        switch (check.id) {
            case 'mfa_enabled':
                if (!user?.mfaEnabled) {
                    mfaSetupMutation.mutate();
                }
                return;
            case 'backup_codes':
                if (!user?.mfaEnabled) {
                    mfaSetupMutation.mutate();
                    return;
                }
                regenCodesMutation.mutate();
                return;
            case 'password_age':
                passwordSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return;
            case 'email_verified':
                toast('Check your inbox for the verification email link.');
                return;
            case 'no_failed_logins':
                loginHistorySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return;
            default:
                if (check.actionTab && check.actionTab !== 'security') {
                    onNavigateTab?.(check.actionTab);
                }
        }
    };

    const downloadBackupCodes = () => {
        if (!revealedBackupCodes.length) return;
        const blob = new Blob([revealedBackupCodes.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `iam-backup-codes-${new Date().toISOString().slice(0, 10)}.txt`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="w-full space-y-5">
            <SecurityScore
                user={user}
                sessions={sessions}
                apiKeys={apiKeys}
                connectedApps={connectedApps}
                onAction={handleSecurityAction}
            />

            <div ref={passwordSectionRef}>
                <CardShell>
                <CardHeader
                    icon={Lock}
                    title="Password"
                    right={<span className="text-xs text-[#7a87a8]">Last changed {daysSince(user?.passwordChangedAt)}</span>}
                />
                <div className="px-6 py-5 space-y-4">
                    <PasswordField
                        label="Current Password"
                        value={passwordData.currentPassword}
                        onChange={(value) => setPasswordData((prev) => ({ ...prev, currentPassword: value }))}
                        visible={passwordVisibility.currentPassword}
                        onToggle={() => setPasswordVisibility((prev) => ({ ...prev, currentPassword: !prev.currentPassword }))}
                        error={passwordErrors.currentPassword}
                    />

                    <div>
                        <PasswordField
                            label="New Password"
                            value={passwordData.newPassword}
                            onChange={(value) => setPasswordData((prev) => ({ ...prev, newPassword: value }))}
                            visible={passwordVisibility.newPassword}
                            onToggle={() => setPasswordVisibility((prev) => ({ ...prev, newPassword: !prev.newPassword }))}
                            error={passwordErrors.newPassword}
                        />

                        <div className="mt-2 flex items-center gap-2">
                            <div className="w-full h-1.5 bg-[#f0f2f8] rounded-full overflow-hidden">
                                <div className={classNames('h-full transition-all', passwordStrength.color)} style={{ width: `${passwordStrength.pct}%` }} />
                            </div>
                            <span className={classNames('text-xs font-medium', passwordStrength.textColor)}>{passwordStrength.label}</span>
                        </div>
                    </div>

                    <PasswordField
                        label="Confirm Password"
                        value={passwordData.confirmPassword}
                        onChange={(value) => setPasswordData((prev) => ({ ...prev, confirmPassword: value }))}
                        visible={passwordVisibility.confirmPassword}
                        onToggle={() => setPasswordVisibility((prev) => ({ ...prev, confirmPassword: !prev.confirmPassword }))}
                        error={passwordErrors.confirmPassword}
                    />
                </div>
                <div className="px-6 pb-5 flex justify-end">
                    <button
                        type="button"
                        onClick={() => changePasswordMutation.mutate(passwordData)}
                        className="px-4 py-2 rounded-lg text-sm bg-[#4f46e5] text-white hover:bg-[#3730a3]"
                        disabled={changePasswordMutation.isPending}
                    >
                        Update Password
                    </button>
                </div>
                </CardShell>
            </div>

            <CardShell>
                <CardHeader
                    icon={ShieldCheck}
                    title="Two-Factor Authentication"
                    right={(
                        <span className={classNames(
                            'text-xs font-semibold px-2 py-1 rounded-full',
                            user?.mfaEnabled ? 'bg-[#16a34a]/10 text-[#16a34a]' : 'bg-[#dc2626]/10 text-[#dc2626]'
                        )}
                        >
                            {user?.mfaEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                    )}
                />

                {!user?.mfaEnabled ? (
                    <div className="px-6 py-5">
                        <div className="bg-[#dc2626]/5 border border-[#dc2626]/15 rounded-xl px-4 py-3 flex items-start gap-3">
                            <AlertTriangle size={16} className="text-[#dc2626] mt-0.5" />
                            <div className="flex-1">
                                <p className="text-[13px] text-[#7a1b1b]">Your account is not protected by two-factor authentication.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => mfaSetupMutation.mutate()}
                                className="px-3 py-1.5 rounded-lg text-sm bg-[#4f46e5] text-white hover:bg-[#3730a3]"
                            >
                                Enable MFA
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="px-6 py-5 space-y-4">
                        <div className="bg-[#16a34a]/5 border border-[#16a34a]/15 rounded-xl px-4 py-3">
                            <p className="text-[13px] text-[#1f5e34]">Configured with Authenticator App</p>
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => regenCodesMutation.mutate()}
                                className="px-3 py-2 text-sm border border-[#d0d7e8] rounded-lg text-[#3a4560] hover:bg-[#f4f6fb]"
                                disabled={regenCodesMutation.isPending}
                            >
                                Regenerate Backup Codes
                            </button>
                            <button
                                type="button"
                                onClick={() => disableMfaMutation.mutate()}
                                className="px-3 py-2 text-sm border border-red-200 text-[#dc2626] rounded-lg hover:bg-red-50"
                                disabled={disableMfaMutation.isPending}
                            >
                                Disable MFA
                            </button>
                        </div>
                    </div>
                )}
            </CardShell>

            <div ref={loginHistorySectionRef}>
                <CardShell>
                <CardHeader icon={Clock} title="Recent Login Activity" />
                <div>
                    {(loginHistory.slice(0, 5) || []).map((log) => {
                        const success = log.result === 'SUCCESS';
                        const device = parseDeviceLabel(log.userAgent);

                        return (
                            <div key={log.id} className="px-6 py-3.5 border-b border-[#f0f2f8] last:border-0 flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2 text-sm text-[#0f1623]">
                                        <span className={classNames('w-2 h-2 rounded-full', success ? 'bg-[#16a34a]' : 'bg-[#dc2626]')} />
                                        {device}
                                    </div>
                                    <p className="text-xs text-[#7a87a8] mt-0.5">{log.ip || 'Unknown IP'}</p>
                                </div>
                                <span className="text-xs text-[#7a87a8]">{formatRelative(log.timestamp)}</span>
                            </div>
                        );
                    })}
                    {loginHistory.length === 0 ? (
                        <div className="px-6 py-4 text-sm text-[#7a87a8]">No login activity found.</div>
                    ) : null}
                </div>
                <div className="px-6 py-3 border-t border-[#f0f2f8]">
                    <a href="/dashboard/audit-logs" className="text-sm text-[#4f46e5] hover:underline">View Full Audit Log →</a>
                </div>
                </CardShell>
            </div>

            <CardShell>
                <CardHeader icon={Monitor} title="Trusted Devices" />
                <div>
                    {trustedDevices.map((device) => (
                        <div key={device.id} className="px-6 py-3.5 border-b border-[#f0f2f8] last:border-0 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-[#f4f6fb] rounded-lg p-1.5">
                                    {String(device.device || '').toLowerCase().includes('mobile') ? <Smartphone size={14} className="text-[#7a87a8]" /> : <Monitor size={14} className="text-[#7a87a8]" />}
                                </div>
                                <div>
                                    <p className="text-sm text-[#0f1623]">{device.name || 'Unknown Device'}</p>
                                    <p className="text-xs text-[#7a87a8]">Last seen: {formatRelative(device.lastSeenAt)}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => revokeDeviceMutation.mutate(device.id)}
                                className="text-xs text-[#dc2626] hover:underline"
                            >
                                Revoke
                            </button>
                        </div>
                    ))}
                    {trustedDevices.length === 0 ? (
                        <div className="px-6 py-4 text-sm text-[#7a87a8]">No trusted devices found.</div>
                    ) : null}
                </div>
                <div className="px-6 py-3 border-t border-[#f0f2f8]">
                    <button
                        type="button"
                        onClick={() => revokeAllDevicesMutation.mutate()}
                        className="px-3 py-1.5 text-xs border border-red-200 text-[#dc2626] rounded-lg hover:bg-red-50"
                    >
                        Revoke All Devices
                    </button>
                </div>
            </CardShell>

            {showMfaModal ? (
                <Modal
                    title="MFA Setup"
                    icon={ShieldCheck}
                    onClose={() => {
                        setShowMfaModal(false);
                        setMfaStep(1);
                    }}
                >
                    {mfaStep === 1 ? (
                        <div className="space-y-4">
                            <p className="text-sm text-[#3a4560]">
                                Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password).
                            </p>
                            <div className="flex justify-center">
                                <img src={mfaSetup?.qrCodeUrl} alt="MFA QR" className="w-[180px] h-[180px] border border-[#d0d7e8] rounded-xl" />
                            </div>
                            <div className="bg-[#f4f6fb] border border-[#d0d7e8] rounded-xl p-3">
                                <p className="text-xs text-[#7a87a8] mb-1">Manual Secret</p>
                                <p className="font-mono text-sm break-all text-[#0f1623]">{mfaSetup?.secret}</p>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setMfaStep(2)}
                                    className="px-4 py-2 text-sm bg-[#4f46e5] text-white rounded-lg"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    ) : null}

                    {mfaStep === 2 ? (
                        <div className="space-y-4">
                            <p className="text-sm text-[#3a4560]">Enter the 6-digit code from your app</p>
                            <div className="flex gap-2 justify-center">
                                {otpDigits.map((digit, index) => (
                                    <input
                                        key={index}
                                        value={digit}
                                        onChange={(e) => {
                                            const clean = e.target.value.replace(/\D/g, '').slice(-1);
                                            setOtpDigits((prev) => {
                                                const next = [...prev];
                                                next[index] = clean;
                                                return next;
                                            });
                                            if (clean && index < 5) {
                                                const nextInput = document.getElementById(`otp-${index + 1}`);
                                                nextInput?.focus();
                                            }
                                        }}
                                        id={`otp-${index}`}
                                        maxLength={1}
                                        className="w-10 h-12 text-center text-lg font-mono border border-[#d0d7e8] rounded-xl focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/25"
                                    />
                                ))}
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => verifyMfaMutation.mutate({
                                        token: otpValue,
                                        secret: mfaSetup?.secret,
                                        stateToken: mfaSetup?.stateToken,
                                    })}
                                    className="px-4 py-2 text-sm bg-[#4f46e5] text-white rounded-lg"
                                    disabled={otpValue.length !== 6 || verifyMfaMutation.isPending}
                                >
                                    Verify & Enable
                                </button>
                            </div>
                        </div>
                    ) : null}

                    {mfaStep === 3 ? (
                        <div className="space-y-4">
                            <p className="text-sm text-[#3a4560]">Save these codes somewhere safe. Each can only be used once.</p>
                            <div className="grid grid-cols-2 gap-2">
                                {revealedBackupCodes.map((code) => (
                                    <div key={code} className="font-mono text-sm bg-[#f4f6fb] border border-[#d0d7e8] rounded-lg px-4 py-2 text-center">
                                        {code}
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={downloadBackupCodes}
                                    className="px-3 py-2 text-sm border border-[#d0d7e8] rounded-lg"
                                >
                                    Download Codes
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowMfaModal(false)}
                                    className="px-3 py-2 text-sm bg-[#4f46e5] text-white rounded-lg"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    ) : null}
                </Modal>
            ) : null}

            <ReauthModal
                isOpen={reauthModal.isOpen}
                onClose={handleReauthClose}
                onSuccess={handleReauthSuccess}
                action={reauthModal.action}
                requiresMfa={reauthModal.requiresMfa}
                actionLabel={reauthModal.actionLabel}
            />
        </div>
    );
}

function SessionsTab() {
    const queryClient = useQueryClient();
    const { withReauth, reauthModal, handleReauthSuccess, handleReauthClose } = useReauth();

    const { data: sessions = [] } = useQuery({
        queryKey: ['settings-sessions'],
        queryFn: () => settingsAPI.getSessions().then((res) => res.data?.data || []),
    });

    const revokeMutation = useMutation({
        mutationFn: (sessionId) => settingsAPI.revokeSession(sessionId),
        onSuccess: async () => {
            toast.success('Session revoked');
            await queryClient.invalidateQueries({ queryKey: ['settings-sessions'] });
        },
        onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to revoke session'),
    });

    const revokeAllMutation = useMutation({
        mutationFn: () => withReauth(
            (credentials) => settingsAPI.revokeAllOtherSessions(credentials),
            'revoking all other sessions'
        ),
        onSuccess: async () => {
            toast.success('All other sessions revoked');
            await queryClient.invalidateQueries({ queryKey: ['settings-sessions'] });
        },
        onError: (err) => {
            if (isReauthCancelled(err)) return;
            toast.error(err.response?.data?.error?.message || 'Failed to revoke sessions');
        },
    });

    const current = sessions.find((session) => session.isCurrent);

    return (
        <div className="w-full">
            <div className="bg-[#4f46e5]/5 border border-[#4f46e5]/15 rounded-xl px-4 py-3 flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <Info size={16} className="text-[#4f46e5]" />
                    <p className="text-[13px] text-[#374151]">
                        Currently signed in from {current?.browser || 'Browser'} · {current?.os || 'OS'}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => revokeAllMutation.mutate()}
                    className="text-sm text-[#dc2626] hover:underline font-medium"
                    disabled={revokeAllMutation.isPending}
                >
                    Revoke All Others
                </button>
            </div>

            <div className="bg-white border border-[#d0d7e8] rounded-2xl overflow-hidden shadow-sm divide-y divide-[#f0f2f8]">
                {sessions.map((session) => (
                    <div key={session.id} className="px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-[#f4f6fb] flex items-center justify-center text-[#7a87a8]">
                                {session.device === 'Mobile' ? <Smartphone size={16} /> : <Monitor size={16} />}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-[#0f1623]">{session.browser} on {session.os}</p>
                                <p className="text-xs text-[#7a87a8]">{session.ip} · Created {formatRelative(session.createdAt)}</p>
                            </div>
                        </div>

                        <div className="text-right">
                            {session.isCurrent ? (
                                <span className="text-xs font-semibold bg-[#16a34a]/10 text-[#16a34a] px-2 py-1 rounded-full">Current</span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => revokeMutation.mutate(session.id)}
                                    className="px-3 py-1.5 text-xs border border-red-200 text-[#dc2626] rounded-lg hover:bg-red-50"
                                >
                                    Revoke
                                </button>
                            )}
                            <p className="text-xs text-[#7a87a8] mt-1">Expires {formatDate(session.expiresAt)}</p>
                        </div>
                    </div>
                ))}

                {sessions.length === 0 ? (
                    <div className="px-6 py-6 text-sm text-[#7a87a8]">No active sessions found.</div>
                ) : null}
            </div>

            <ReauthModal
                isOpen={reauthModal.isOpen}
                onClose={handleReauthClose}
                onSuccess={handleReauthSuccess}
                action={reauthModal.action}
                requiresMfa={reauthModal.requiresMfa}
                actionLabel={reauthModal.actionLabel}
            />
        </div>
    );
}

function NotificationsTab() {
    const queryClient = useQueryClient();

    const { data: prefs = {} } = useQuery({
        queryKey: ['settings-notifications'],
        queryFn: () => settingsAPI.getNotifications().then((res) => res.data?.data || {}),
    });

    const [localPrefs, setLocalPrefs] = useState({});

    const mergedPrefs = useMemo(() => ({ ...prefs, ...localPrefs }), [prefs, localPrefs]);

    const updateMutation = useMutation({
        mutationFn: (payload) => settingsAPI.updateNotifications(payload),
        onSuccess: async () => {
            toast.success('Notification preferences saved');
            setLocalPrefs({});
            await queryClient.invalidateQueries({ queryKey: ['settings-notifications'] });
        },
        onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to update preferences'),
    });

    const renderCard = (title, rows) => (
        <div className="bg-white border border-[#d0d7e8] rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-[#f0f2f8] flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#4f46e5]/10 text-[#4f46e5] flex items-center justify-center">
                    <Bell size={16} />
                </div>
                <h3 className="text-[15px] font-semibold text-[#0f1623]">{title}</h3>
            </div>

            <div>
                {rows.map((row) => (
                    <div key={row.keyEmail} className="px-6 py-[14px] border-b border-[#f8fafc] last:border-0 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0 pr-3">
                            <p className="text-[13px] font-medium text-[#0f172a]">{row.label}</p>
                            <p className="text-[11px] text-[#94a3b8] mt-0.5">{row.description}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-[0.05em]">EMAIL</span>
                            <Toggle
                                checked={Boolean(mergedPrefs[row.keyEmail])}
                                onChange={() => setLocalPrefs((prev) => ({ ...prev, [row.keyEmail]: !mergedPrefs[row.keyEmail] }))}
                            />
                            <span className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-[0.05em]">IN-APP</span>
                            <Toggle
                                checked={Boolean(mergedPrefs[row.keyInApp])}
                                onChange={() => setLocalPrefs((prev) => ({ ...prev, [row.keyInApp]: !mergedPrefs[row.keyInApp] }))}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="w-full space-y-5">
            {renderCard('Security Notifications', NOTIFICATION_ROWS.security)}
            {renderCard('Activity Notifications', NOTIFICATION_ROWS.activity)}

            <div className="flex justify-end pt-2">
                <button
                    type="button"
                    onClick={() => updateMutation.mutate(localPrefs)}
                    className="px-4 py-2 rounded-lg text-sm bg-[#4f46e5] text-white hover:bg-[#3730a3]"
                    disabled={!Object.keys(localPrefs).length || updateMutation.isPending}
                >
                    Save Preferences
                </button>
            </div>
        </div>
    );
}

function OrganizationTab() {
    const queryClient = useQueryClient();
    const { withReauth, reauthModal, handleReauthSuccess, handleReauthClose } = useReauth();

    const { data: organization } = useQuery({
        queryKey: ['settings-organization'],
        queryFn: () => settingsAPI.getOrganization().then((res) => res.data?.data),
    });

    const [form, setForm] = useState(null);
    const [showResetModal, setShowResetModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [resetConfirmText, setResetConfirmText] = useState('');
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    const working = form || organization || {};

    const updateMutation = useMutation({
        mutationFn: (payload) => settingsAPI.updateOrganization(payload),
        onSuccess: async () => {
            toast.success('Organization settings updated');
            setForm(null);
            await queryClient.invalidateQueries({ queryKey: ['settings-organization'] });
        },
        onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to update organization settings'),
    });

    const exportMutation = useMutation({
        mutationFn: () => withReauth(
            (credentials) => settingsAPI.exportOrganizationData(credentials),
            'exporting organization data'
        ),
        onSuccess: (res) => {
            const blob = new Blob([res.data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `org-export-${new Date().toISOString().slice(0, 10)}.json`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success('Export generated');
        },
        onError: (err) => {
            if (isReauthCancelled(err)) return;
            toast.error(err.response?.data?.error?.message || 'Failed to export data');
        },
    });

    const resetMutation = useMutation({
        mutationFn: () => withReauth(
            (credentials) => settingsAPI.resetOrganizationPolicies(credentials),
            'resetting organization security policies'
        ),
        onSuccess: async () => {
            toast.success('Organization security policies reset to defaults');
            setShowResetModal(false);
            setResetConfirmText('');
            await queryClient.invalidateQueries({ queryKey: ['settings-organization'] });
        },
        onError: (err) => {
            if (isReauthCancelled(err)) return;
            toast.error(err.response?.data?.error?.message || 'Failed to reset policies');
        },
    });

    const updateField = (key, value) => {
        const base = form || organization || {};
        setForm({ ...base, [key]: value });
    };

    const save = () => {
        if (!form) return;

        const payload = {
            orgName: form.orgName,
            region: form.region,
            minPasswordLength: Number(form.minPasswordLength),
            requireUppercase: Boolean(form.requireUppercase),
            requireNumber: Boolean(form.requireNumber),
            requireSymbol: Boolean(form.requireSymbol),
            passwordExpiryDays: form.passwordExpiryDays === '' || form.passwordExpiryDays === null ? null : Number(form.passwordExpiryDays),
            maxFailedAttempts: Number(form.maxFailedAttempts),
            sessionTimeoutMinutes: Number(form.sessionTimeoutMinutes),
            requireMfaForAll: Boolean(form.requireMfaForAll),
            allowOAuthLogin: Boolean(form.allowOAuthLogin),
            ipAllowlist: String(form.ipAllowlist || '')
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean),
        };

        updateMutation.mutate(payload);
    };

    if (!organization) {
        return <div className="text-sm text-[#7a87a8]">Loading organization settings...</div>;
    }

    return (
        <div className="w-full space-y-5">
            <CardShell>
                <CardHeader icon={Building2} title="Organization" />
                <div className="p-6 space-y-4">
                    <Field label="Organization Name">
                        <input
                            value={working.orgName || ''}
                            onChange={(e) => updateField('orgName', e.target.value)}
                            className="w-full border border-[#d0d7e8] rounded-xl px-3 py-2 text-sm"
                        />
                    </Field>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field label="Account ID">
                            <div className="flex gap-2">
                                <input
                                    value={working.accountId || ''}
                                    readOnly
                                    className="flex-1 border border-[#d0d7e8] rounded-xl px-3 py-2 text-sm bg-[#f4f6fb]"
                                />
                                <button
                                    type="button"
                                    onClick={() => navigator.clipboard.writeText(working.accountId || '')}
                                    className="px-3 py-2 text-xs border border-[#d0d7e8] rounded-lg"
                                >
                                    Copy
                                </button>
                            </div>
                        </Field>
                        <Field label="Plan">
                            <div className="h-10 flex items-center px-3 text-sm rounded-xl bg-[#f4f6fb] border border-[#d0d7e8]">
                                <span className="text-[#4f46e5] font-semibold uppercase">{working.plan}</span>
                            </div>
                        </Field>
                    </div>
                    <Field label="Region">
                        <input
                            value={working.region || ''}
                            onChange={(e) => updateField('region', e.target.value)}
                            className="w-full border border-[#d0d7e8] rounded-xl px-3 py-2 text-sm"
                        />
                    </Field>
                </div>
            </CardShell>

            <CardShell>
                <CardHeader icon={Lock} title="Password Policy" />
                <div className="p-6 space-y-4">
                    <Field label="Minimum password length">
                        <input
                            type="number"
                            min={6}
                            max={32}
                            value={working.minPasswordLength ?? 8}
                            onChange={(e) => updateField('minPasswordLength', e.target.value)}
                            className="w-36 border border-[#d0d7e8] rounded-xl px-3 py-2 text-sm"
                        />
                    </Field>

                    <PolicyToggleRow
                        label="Require uppercase"
                        value={Boolean(working.requireUppercase)}
                        onChange={() => updateField('requireUppercase', !working.requireUppercase)}
                    />
                    <PolicyToggleRow
                        label="Require number"
                        value={Boolean(working.requireNumber)}
                        onChange={() => updateField('requireNumber', !working.requireNumber)}
                    />
                    <PolicyToggleRow
                        label="Require symbol"
                        value={Boolean(working.requireSymbol)}
                        onChange={() => updateField('requireSymbol', !working.requireSymbol)}
                    />

                    <Field label="Password expiry">
                        <select
                            value={working.passwordExpiryDays ?? ''}
                            onChange={(e) => updateField('passwordExpiryDays', e.target.value === '' ? null : e.target.value)}
                            className="w-full border border-[#d0d7e8] rounded-xl px-3 py-2 text-sm bg-white"
                        >
                            <option value="">Never</option>
                            <option value="30">30 days</option>
                            <option value="60">60 days</option>
                            <option value="90">90 days</option>
                        </select>
                    </Field>
                </div>
            </CardShell>

            <CardShell>
                <CardHeader icon={ShieldCheck} title="Access Policy" />
                <div className="p-6 space-y-4">
                    <Field label="Max failed attempts before lockout">
                        <input
                            type="number"
                            min={1}
                            max={20}
                            value={working.maxFailedAttempts ?? 5}
                            onChange={(e) => updateField('maxFailedAttempts', e.target.value)}
                            className="w-36 border border-[#d0d7e8] rounded-xl px-3 py-2 text-sm"
                        />
                    </Field>

                    <Field label="Session timeout (minutes)">
                        <select
                            value={working.sessionTimeoutMinutes ?? 480}
                            onChange={(e) => updateField('sessionTimeoutMinutes', Number(e.target.value))}
                            className="w-full border border-[#d0d7e8] rounded-xl px-3 py-2 text-sm bg-white"
                        >
                            <option value={60}>60 minutes</option>
                            <option value={240}>4 hours</option>
                            <option value={480}>8 hours</option>
                            <option value={1440}>24 hours</option>
                            <option value={10080}>7 days</option>
                        </select>
                    </Field>

                    <PolicyToggleRow
                        label="Require MFA for all users"
                        value={Boolean(working.requireMfaForAll)}
                        onChange={() => updateField('requireMfaForAll', !working.requireMfaForAll)}
                    />
                    {working.requireMfaForAll ? (
                        <p className="text-xs text-[#b45309]">Enabling this will lock out users without MFA configured</p>
                    ) : null}

                    <PolicyToggleRow
                        label="Allow OAuth login"
                        value={Boolean(working.allowOAuthLogin)}
                        onChange={() => updateField('allowOAuthLogin', !working.allowOAuthLogin)}
                    />
                </div>
            </CardShell>

            <CardShell>
                <CardHeader icon={Monitor} title="IP Allowlist" />
                <div className="p-6 space-y-3">
                    <textarea
                        value={Array.isArray(working.ipAllowlist) ? working.ipAllowlist.join('\n') : (working.ipAllowlist || '')}
                        onChange={(e) => updateField('ipAllowlist', e.target.value)}
                        className="w-full min-h-[120px] font-mono text-sm border border-[#d0d7e8] rounded-xl px-3 py-2"
                        placeholder={'Leave empty to allow all IPs\n203.45.112.0/24\n10.0.0.0/8'}
                    />
                </div>
            </CardShell>

            <CardShell>
                <div className="bg-[#dc2626]/5 px-6 py-4 border-b border-[#dc2626]/15">
                    <div className="flex items-center gap-3">
                        <AlertTriangle size={16} className="text-[#dc2626]" />
                        <h3 className="text-[15px] font-semibold text-[#dc2626]">Danger Zone</h3>
                    </div>
                </div>
                <DangerRow
                    title="Export All Data"
                    description="Download all users, roles, policies, groups, and recent audit logs."
                    actionLabel="Export"
                    onAction={() => exportMutation.mutate()}
                />
                <DangerRow
                    title="Reset All Policies"
                    description="Reset organization security policy fields to defaults."
                    actionLabel="Reset"
                    onAction={() => setShowResetModal(true)}
                />
                <DangerRow
                    title="Delete Organization"
                    description="Dangerous irreversible operation placeholder for future implementation."
                    actionLabel="Delete"
                    onAction={() => setShowDeleteModal(true)}
                />
            </CardShell>

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={save}
                    className="px-4 py-2 rounded-lg text-sm bg-[#4f46e5] text-white hover:bg-[#3730a3]"
                    disabled={!form || updateMutation.isPending}
                >
                    Save Organization Settings
                </button>
            </div>

            {showResetModal ? (
                <Modal title="Reset Policies" icon={AlertTriangle} onClose={() => setShowResetModal(false)}>
                    <div className="space-y-4">
                        <p className="text-sm text-[#3a4560]">Type <span className="font-mono">RESET</span> and confirm your identity to continue.</p>
                        <input
                            value={resetConfirmText}
                            onChange={(e) => setResetConfirmText(e.target.value)}
                            placeholder="Type RESET"
                            className="w-full border border-[#d0d7e8] rounded-xl px-3 py-2 text-sm"
                        />
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => resetMutation.mutate()}
                                disabled={resetConfirmText !== 'RESET' || resetMutation.isPending}
                                className="px-3 py-2 text-sm rounded-lg bg-[#dc2626] text-white disabled:opacity-50"
                            >
                                Confirm Reset
                            </button>
                        </div>
                    </div>
                </Modal>
            ) : null}

            <ReauthModal
                isOpen={reauthModal.isOpen}
                onClose={handleReauthClose}
                onSuccess={handleReauthSuccess}
                action={reauthModal.action}
                requiresMfa={reauthModal.requiresMfa}
                actionLabel={reauthModal.actionLabel}
            />

            {showDeleteModal ? (
                <Modal title="Delete Organization" icon={AlertTriangle} onClose={() => setShowDeleteModal(false)}>
                    <div className="space-y-4">
                        <p className="text-sm text-[#3a4560]">Type the organization name <span className="font-medium">{organization.orgName}</span> to confirm. This action is currently disabled.</p>
                        <input
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            className="w-full border border-[#d0d7e8] rounded-xl px-3 py-2 text-sm"
                        />
                        <div className="flex justify-end">
                            <button
                                type="button"
                                disabled
                                className="px-3 py-2 text-sm rounded-lg bg-[#dc2626] text-white opacity-50 cursor-not-allowed"
                            >
                                Delete (Not Implemented)
                            </button>
                        </div>
                    </div>
                </Modal>
            ) : null}
        </div>
    );
}

function ApiKeysTab() {
    const queryClient = useQueryClient();
    const { withReauth, reauthModal, handleReauthSuccess, handleReauthClose } = useReauth();
    const [showModal, setShowModal] = useState(false);
    const [createdToken, setCreatedToken] = useState(null);

    const [tokenForm, setTokenForm] = useState({
        name: '',
        expiresIn: 30,
        scopes: ['read:users'],
    });

    const { data: apiKeys = [] } = useQuery({
        queryKey: ['settings-api-keys'],
        queryFn: () => settingsAPI.getApiKeys().then((res) => res.data?.data || []),
    });

    const createMutation = useMutation({
        mutationFn: (payload) => withReauth(
            (credentials) => settingsAPI.createApiKey(payload, credentials),
            'creating a new API key'
        ),
        onSuccess: async (res) => {
            setCreatedToken(res.data?.data?.token || null);
            await queryClient.invalidateQueries({ queryKey: ['settings-api-keys'] });
            toast.success('API key created');
        },
        onError: (err) => {
            if (isReauthCancelled(err)) return;
            toast.error(err.response?.data?.error?.message || 'Failed to create API key');
        },
    });

    const revokeMutation = useMutation({
        mutationFn: (tokenId) => settingsAPI.revokeApiKey(tokenId),
        onSuccess: async () => {
            toast.success('API key revoked');
            await queryClient.invalidateQueries({ queryKey: ['settings-api-keys'] });
        },
        onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to revoke API key'),
    });

    const activeApiKeys = apiKeys.filter((token) => token.isActive && !token.revokedAt);

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-[15px] font-semibold text-[#0f1623]">API Keys</h3>
                        <span className="text-sm text-[#7a87a8]">{activeApiKeys.length} active</span>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setShowModal(true);
                        setCreatedToken(null);
                    }}
                    className="px-4 py-2 rounded-lg text-sm bg-[#4f46e5] text-white hover:bg-[#3730a3]"
                >
                    + New API Key
                </button>
            </div>

            <div className="bg-white border border-[#d0d7e8] rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-[#f4f6fb] border-b border-[#d0d7e8] px-6 py-3 grid grid-cols-[2fr_1fr_1fr_1fr_auto] text-[10px] font-semibold tracking-widest uppercase text-[#7a87a8]">
                    <span>Key</span>
                    <span>Scopes</span>
                    <span>Created</span>
                    <span>Expires</span>
                    <span>Actions</span>
                </div>
                <div>
                    {apiKeys.map((token) => {
                        const revoked = !token.isActive || Boolean(token.revokedAt);
                        return (
                            <div
                                key={token.id}
                                className={classNames(
                                    'px-6 py-4 border-b border-[#f0f2f8] last:border-0 grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center text-sm gap-3',
                                    revoked ? 'opacity-50' : ''
                                )}
                            >
                                <div>
                                    <p className="font-semibold text-[#0f1623]">{token.name}</p>
                                    <span className="font-mono text-[10px] bg-[#f4f6fb] px-2 py-0.5 rounded border border-[#d0d7e8] inline-block mt-1">
                                        {token.tokenPrefix}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {token.scopes?.map((scope) => (
                                        <span key={scope} className="bg-[#4f46e5]/10 text-[#4f46e5] text-[10px] px-2 py-0.5 rounded-full">
                                            {scope}
                                        </span>
                                    ))}
                                </div>
                                <div className="text-xs text-[#7a87a8]">{formatDate(token.createdAt)}</div>
                                <div className="text-xs text-[#7a87a8]">
                                    {token.expiresAt ? formatDate(token.expiresAt) : 'Never'}
                                    {revoked ? <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-[#dc2626]/10 text-[#dc2626]">Revoked</span> : null}
                                </div>
                                <div className="justify-self-end">
                                    <button
                                        type="button"
                                        onClick={() => revokeMutation.mutate(token.id)}
                                        className="w-8 h-8 rounded-lg border border-red-200 text-[#dc2626] hover:bg-red-50 flex items-center justify-center"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {apiKeys.length === 0 ? (
                        <div className="py-12 flex flex-col items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#4f46e5]/10 text-[#4f46e5] flex items-center justify-center">
                                <Key size={18} />
                            </div>
                            <p className="text-sm font-semibold text-[#0f1623]">No API keys yet</p>
                            <p className="text-xs text-[#7a87a8]">Create a key to enable programmatic access for scripts and integrations.</p>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowModal(true);
                                    setCreatedToken(null);
                                }}
                                className="px-4 py-2 rounded-lg text-sm bg-[#4f46e5] text-white hover:bg-[#3730a3]"
                            >
                                + New Key
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>

            {showModal ? (
                <Modal title="Create API Key" icon={Key} onClose={() => setShowModal(false)}>
                    {!createdToken ? (
                        <div className="space-y-4">
                            <Field label="Token Name">
                                <input
                                    value={tokenForm.name}
                                    onChange={(e) => setTokenForm((prev) => ({ ...prev, name: e.target.value }))}
                                    className="w-full border border-[#d0d7e8] rounded-xl px-3 py-2 text-sm"
                                />
                            </Field>

                            <Field label="Expiry">
                                <select
                                    value={String(tokenForm.expiresIn)}
                                    onChange={(e) => setTokenForm((prev) => ({ ...prev, expiresIn: e.target.value === 'null' ? null : Number(e.target.value) }))}
                                    className="w-full border border-[#d0d7e8] rounded-xl px-3 py-2 text-sm"
                                >
                                    <option value={7}>7 days</option>
                                    <option value={30}>30 days</option>
                                    <option value={90}>90 days</option>
                                    <option value={365}>1 year</option>
                                    <option value={'null'}>Never</option>
                                </select>
                            </Field>

                            <div>
                                <label className="text-xs text-[#7a87a8] font-medium block mb-2">Scopes</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {API_SCOPE_OPTIONS.map((scope) => {
                                        const checked = tokenForm.scopes.includes(scope.value);
                                        return (
                                            <button
                                                key={scope.value}
                                                type="button"
                                                onClick={() => {
                                                    setTokenForm((prev) => {
                                                        const exists = prev.scopes.includes(scope.value);
                                                        const nextScopes = exists
                                                            ? prev.scopes.filter((item) => item !== scope.value)
                                                            : [...prev.scopes, scope.value];
                                                        return { ...prev, scopes: nextScopes };
                                                    });
                                                }}
                                                className={classNames(
                                                    'border border-[#d0d7e8] rounded-xl px-4 py-3 text-left hover:bg-[#f8f9fd]',
                                                    checked ? 'border-[#4f46e5] bg-[#4f46e5]/5' : ''
                                                )}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <input type="checkbox" readOnly checked={checked} />
                                                    <span className="text-sm font-medium text-[#0f1623]">{scope.value}</span>
                                                </div>
                                                <p className="text-xs text-[#7a87a8] mt-1">{scope.description}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => createMutation.mutate(tokenForm)}
                                    className="px-4 py-2 rounded-lg text-sm bg-[#4f46e5] text-white hover:bg-[#3730a3]"
                                    disabled={!tokenForm.name || !tokenForm.scopes.length || createMutation.isPending}
                                >
                                    Create API Key
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-[#f4f6fb] border border-[#d0d7e8] rounded-xl p-4 font-mono text-sm break-all relative">
                                {createdToken}
                                <button
                                    type="button"
                                    onClick={() => navigator.clipboard.writeText(createdToken)}
                                    className="absolute top-2 right-2 text-xs px-2 py-1 border border-[#d0d7e8] rounded bg-white"
                                >
                                    Copy
                                </button>
                            </div>

                            <div className="bg-[#d97706]/10 border border-[#d97706]/20 rounded-xl px-4 py-3 flex gap-2 text-sm text-[#92400e]">
                                <AlertTriangle size={16} />
                                <span>This token will not be shown again. Copy it now and store it securely.</span>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 rounded-lg text-sm bg-[#4f46e5] text-white"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    )}
                </Modal>
            ) : null}

            <ReauthModal
                isOpen={reauthModal.isOpen}
                onClose={handleReauthClose}
                onSuccess={handleReauthSuccess}
                action={reauthModal.action}
                requiresMfa={reauthModal.requiresMfa}
                actionLabel={reauthModal.actionLabel}
            />
        </div>
    );
}

function Field({ label, error, children, className = '' }) {
    return (
        <div className={className}>
            <label className="text-xs font-semibold text-[#3a4560] uppercase tracking-wide mb-1.5 block">{label}</label>
            {children}
            {error ? <p className="text-xs text-[#dc2626] mt-1">{error}</p> : null}
        </div>
    );
}

function CardShell({ children }) {
    return <div className="bg-white border border-[#d0d7e8] rounded-2xl overflow-hidden shadow-sm">{children}</div>;
}

function CardHeader({ icon, title, right = null }) {
    return (
        <div className="px-6 py-4 border-b border-[#f0f2f8] flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#4f46e5]/10 text-[#4f46e5] flex items-center justify-center">
                {icon ? createElement(icon, { size: 16 }) : null}
            </div>
            <h3 className="text-[15px] font-semibold text-[#0f1623]">{title}</h3>
            <div className="ml-auto">{right}</div>
        </div>
    );
}

function PasswordField({ label, value, onChange, visible, onToggle, error }) {
    return (
        <Field label={label} error={error}>
            <div className="relative">
                <input
                    type={visible ? 'text' : 'password'}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full border border-[#d0d7e8] rounded-xl px-4 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25 focus:border-[#4f46e5]"
                />
                <button
                    type="button"
                    onClick={onToggle}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7a87a8]"
                >
                    {visible ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
            </div>
        </Field>
    );
}

function PolicyToggleRow({ label, value, onChange }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm text-[#0f1623]">{label}</span>
            <Toggle checked={value} onChange={onChange} />
        </div>
    );
}

function DangerRow({ title, description, actionLabel, onAction }) {
    return (
        <div className="px-6 py-4 border-b border-[#f0f2f8] last:border-0 flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-[#0f1623]">{title}</p>
                <p className="text-xs text-[#7a87a8] mt-0.5">{description}</p>
            </div>
            <button
                type="button"
                onClick={onAction}
                className="px-3 py-1.5 rounded-lg text-sm border border-red-200 text-[#dc2626] hover:bg-red-50"
            >
                {actionLabel}
            </button>
        </div>
    );
}

function parseDeviceLabel(userAgent) {
    const ua = String(userAgent || '').toLowerCase();
    const browser = ua.includes('chrome') && !ua.includes('edg')
        ? 'Chrome'
        : ua.includes('firefox')
            ? 'Firefox'
            : ua.includes('safari') && !ua.includes('chrome')
                ? 'Safari'
                : ua.includes('edg')
                    ? 'Edge'
                    : 'Browser';

    const os = ua.includes('windows')
        ? 'Windows'
        : ua.includes('mac os')
            ? 'macOS'
            : ua.includes('linux')
                ? 'Linux'
                : ua.includes('android')
                    ? 'Android'
                    : ua.includes('iphone') || ua.includes('ipad')
                        ? 'iOS'
                        : 'OS';

    return `${browser} on ${os}`;
}

export default function SettingsModal({ isOpen = false, onClose, initialTab = 'profile' }) {
    const { user, updateUser } = useAuth();
    const modalRef = useRef(null);
    const [activeTab, setActiveTab] = useState(() => {
        return TAB_DEFS.some((tab) => tab.id === initialTab) ? initialTab : 'profile';
    });

    const handleClose = useCallback(() => {
        onClose?.();
    }, [onClose]);

    const isSuperAdmin = user?.role === 'SuperAdmin';

    useEffect(() => {
        if (!isOpen) return;

        const modal = modalRef.current;
        if (!modal) return;

        const previousActive = document.activeElement;
        const previousOverflow = document.body.style.overflow;

        const getFocusable = () => Array.from(
            modal.querySelectorAll('a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')
        );

        document.body.style.overflow = 'hidden';

        const focusable = getFocusable();
        if (focusable.length > 0) {
            focusable[0].focus();
        } else {
            modal.focus();
        }

        const onKeyDownModal = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                handleClose();
                return;
            }

            if (event.key !== 'Tab') return;

            const items = getFocusable();
            if (!items.length) {
                event.preventDefault();
                modal.focus();
                return;
            }

            const first = items[0];
            const last = items[items.length - 1];
            const active = document.activeElement;

            if (event.shiftKey) {
                if (active === first || !modal.contains(active)) {
                    event.preventDefault();
                    last.focus();
                }
            } else if (active === last || !modal.contains(active)) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', onKeyDownModal);

        return () => {
            document.removeEventListener('keydown', onKeyDownModal);
            document.body.style.overflow = previousOverflow;
            if (previousActive && typeof previousActive.focus === 'function') {
                previousActive.focus();
            }
        };
    }, [handleClose, isOpen]);

    const { data: profileData } = useQuery({
        queryKey: ['settings-profile'],
        queryFn: () => settingsAPI.getProfile().then((res) => res.data?.data),
        enabled: isOpen,
    });

    const { data: apiKeysData = [] } = useQuery({
        queryKey: ['settings-api-keys'],
        queryFn: () => settingsAPI.getApiKeys().then((res) => res.data?.data || []),
        enabled: isOpen,
    });

    const { data: connectedAppsResponse } = useQuery({
        queryKey: ['settings-connected-apps'],
        queryFn: () => connectedAppsAPI.getAll().then((res) => res.data),
        enabled: isOpen,
    });

    const effectiveUser = {
        ...user,
        ...(profileData || {}),
    };

    const activeApiKeyCount = useMemo(
        () => apiKeysData.filter((key) => key.isActive && !key.revokedAt).length,
        [apiKeysData]
    );

    const connectedAppsData = useMemo(() => connectedAppsResponse?.data ?? [], [connectedAppsResponse]);

    const activeConnectedAppCount = useMemo(
        () => connectedAppsData.length,
        [connectedAppsData]
    );

    const tabs = TAB_DEFS
        .filter((tab) => !(tab.adminOnly && !isSuperAdmin))
        .map((tab) => {
            if (tab.id === 'api-keys') {
                return { ...tab, badge: activeApiKeyCount > 0 ? activeApiKeyCount : null };
            }

            if (tab.id === 'connected-apps') {
                return { ...tab, badge: activeConnectedAppCount > 0 ? activeConnectedAppCount : null };
            }

            return tab;
        });

    if (!isOpen) return null;

    const selectedTabId = tabs.some((tab) => tab.id === activeTab) ? activeTab : (tabs[0]?.id || 'profile');
    const activeTabMeta = tabs.find((tab) => tab.id === selectedTabId) || TAB_DEFS[0];
    const displayName = [effectiveUser?.firstName, effectiveUser?.lastName].filter(Boolean).join(' ') || 'Unknown User';
    const roleLabel = effectiveUser?.role?.name
        || (typeof effectiveUser?.role === 'string' ? effectiveUser.role : null)
        || effectiveUser?.primaryRole?.name
        || 'Member';

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-[#0f1623]/50 backdrop-blur-sm p-0 md:items-center md:p-4"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    handleClose();
                }
            }}
        >
            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-label="Settings"
                tabIndex={-1}
                className="flex h-[90vh] w-full overflow-hidden rounded-t-[24px] bg-white shadow-2xl md:h-[680px] md:max-w-6xl md:flex-row md:rounded-2xl"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <aside className="flex w-full shrink-0 flex-col border-b border-[#e2e8f0] bg-white md:w-[260px] md:border-b-0 md:border-r">
                    <div className="hidden border-b border-[#f1f5f9] px-4 pb-3 pt-4 md:block">
                        <div className="inline-flex items-center gap-2.5">
                            <div className="bg-[#6366f1]/10 rounded-xl p-2 text-[#6366f1]">
                                <SettingsIcon size={18} />
                            </div>
                            <h2 className="text-[15px] font-semibold text-[#0f1623]">Settings</h2>
                        </div>
                    </div>

                    <div
                        className="flex gap-1 overflow-x-auto p-2 md:flex-1 md:flex-col md:overflow-x-hidden md:overflow-y-auto"
                        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
                    >
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            if (tab.id === 'organization' && !isSuperAdmin) return null;

                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={classNames(
                                        'flex shrink-0 items-center gap-[10px] whitespace-nowrap border-none border-b-2 border-transparent px-[14px] py-[10px] text-left transition-all duration-150 md:mb-0.5 md:w-full md:rounded-[10px] md:border-b-0',
                                        selectedTabId === tab.id
                                            ? 'border-[#6366f1] bg-transparent text-[#6366f1] font-semibold md:bg-[#ede9fe]'
                                            : 'bg-transparent text-[#64748b] hover:text-[#374151] font-medium md:hover:bg-[#f8fafc]'
                                    )}
                                >
                                    <Icon size={16} className="shrink-0" />
                                    <span className="flex-1 text-[13px] font-medium text-inherit truncate">{tab.label}</span>
                                    {tab.badge ? (
                                        <span className="ml-auto bg-[#6366f1] text-white text-[10px] font-bold rounded-[20px] px-[7px] py-[1px] min-w-[20px] text-center">
                                            {tab.badge}
                                        </span>
                                    ) : null}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-auto hidden border-t border-[#f1f5f9] px-[10px] pb-3 pt-3 md:block">
                        <div className="flex items-center gap-3">
                            {effectiveUser?.avatarUrl ? (
                                <img src={effectiveUser.avatarUrl} alt={displayName} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-[#6366f1] text-white text-xs font-bold flex items-center justify-center">
                                    {getInitials(effectiveUser)}
                                </div>
                            )}
                            <div className="min-w-0">
                                <p className="text-[13px] font-semibold text-[#0f172a] truncate">{displayName}</p>
                                <span className="inline-flex items-center text-[10px] text-[#7c3aed] bg-[#ede9fe] px-[7px] py-[1px] rounded-[20px] font-semibold mt-0.5">
                                    {roleLabel}
                                </span>
                            </div>
                        </div>
                    </div>
                </aside>

                <section className="flex-1 flex flex-col overflow-hidden">
                    <header className="flex items-center justify-between border-b border-[#f0f2f8] px-5 py-4 shrink-0 md:px-8 md:py-5">
                        <div>
                            <h3 className="text-[17px] font-semibold text-[#0f1623]">{activeTabMeta.title}</h3>
                            <p className="text-[13px] text-[#7a87a8] mt-0.5">{activeTabMeta.subtitle}</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="w-8 h-8 rounded-xl bg-[#f4f6fb] hover:bg-[#e6eaf4] border border-[#d0d7e8] flex items-center justify-center text-[#7a87a8] hover:text-[#0f1623] transition-colors"
                            aria-label="Close settings"
                        >
                            &times;
                        </button>
                    </header>

                    <div className="flex-1 overflow-y-auto px-5 py-5 md:px-8 md:py-6">
                        {selectedTabId === 'profile' ? (
                            <ProfileTab
                                user={effectiveUser}
                                onProfileUpdated={(nextProfile) => updateUser(nextProfile)}
                            />
                        ) : null}
                        {selectedTabId === 'connected-apps' ? <ConnectedApps /> : null}
                        {selectedTabId === 'notifications' ? <NotificationsTab /> : null}
                        {selectedTabId === 'organization' && isSuperAdmin ? <OrganizationTab /> : null}
                        {selectedTabId === 'api-keys' ? <ApiKeysTab /> : null}
                    </div>
                </section>
            </div>
        </div>
    );
}
