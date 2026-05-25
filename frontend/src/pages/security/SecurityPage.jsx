import PropTypes from 'prop-types';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AlertTriangle,
    Eye,
    EyeOff,
    Lock,
    ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ReauthModal from '../../components/security/ReauthModal';
import SecurityScore from '../../components/security/SecurityScore';
import { useAuth } from '../../context/AuthContext';
import { useReauth } from '../../hooks/useReauth';
import { settingsAPI } from '../../services/api';
import { daysSince as getDaysSince } from '../../utils/securityScore';

const OTP_INPUT_IDS = ['security-otp-0', 'security-otp-1', 'security-otp-2', 'security-otp-3', 'security-otp-4', 'security-otp-5'];

function classNames(...values) {
    return values.filter(Boolean).join(' ');
}

function formatPasswordAge(value, hasPassword) {
    if (!value) {
        return hasPassword === false ? 'Managed by external login' : 'Never changed';
    }

    const days = getDaysSince(value);
    if (!Number.isFinite(days)) return 'Never changed';
    if (days <= 0) return 'Last changed today';
    return `Last changed ${days} day${days === 1 ? '' : 's'} ago`;
}

function getPasswordStrength(password) {
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

function isReauthCancelled(error) {
    return error?.message === 'Re-authentication cancelled';
}

function Modal({ title, icon: Icon, children, onClose }) {
    const handleBackdropKeyDown = (event) => {
        if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-[4px] p-0 sm:items-center sm:p-4"
            onClick={onClose}
            onKeyDown={handleBackdropKeyDown}
            role="button"
            tabIndex={0}
            aria-label="Close modal backdrop"
        >
            <div
                className="relative mx-4 max-h-[90vh] w-full overflow-y-auto rounded-t-[20px] bg-white shadow-[0_25px_60px_rgba(0,0,0,0.15)] sm:mx-0 sm:max-w-[520px] sm:rounded-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="px-6 pt-5 pb-4 border-b border-[#f1f5f9] flex items-center justify-between">
                    <div className="flex items-center">
                        {Icon ? <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600"><Icon size={18} /></div> : null}
                        <h3 className="ml-3 text-base font-bold text-[#0f172a]">{title}</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-[#94a3b8] hover:text-[#374151] text-[20px] leading-none bg-transparent border-0 p-0"
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>
                <div className="px-6 pt-5 pb-6">{children}</div>
            </div>
        </div>
    );
}

Modal.propTypes = {
    title: PropTypes.string,
    icon: PropTypes.elementType,
    children: PropTypes.node,
    onClose: PropTypes.func.isRequired,
};

function Field({ label, error, children, className = '' }) {
    return (
        <div className={className}>
            <label className="text-xs font-semibold text-[#3a4560] uppercase tracking-wide mb-1.5 block">{label}</label>
            {children}
            {error ? <p className="text-xs text-[#dc2626] mt-1">{error}</p> : null}
        </div>
    );
}

Field.propTypes = {
    label: PropTypes.string.isRequired,
    error: PropTypes.string,
    children: PropTypes.node,
    className: PropTypes.string,
};

function PasswordField({ label, value, onChange, visible, onToggle, error }) {
    return (
        <Field label={label} error={error}>
            <div className="relative">
                <input
                    type={visible ? 'text' : 'password'}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
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

PasswordField.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    visible: PropTypes.bool.isRequired,
    onToggle: PropTypes.func.isRequired,
    error: PropTypes.string,
};

function SummaryCard({ icon, title, value, valueClassName, sublabel, buttonLabel, onClick }) {
    const Icon = icon;

    return (
        <button
            type="button"
            onClick={onClick}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all text-left w-full"
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                        <Icon size={18} />
                    </div>
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                    <p className={classNames('text-lg font-semibold mt-2', valueClassName)}>{value}</p>
                    <p className="text-xs text-slate-400 mt-1">{sublabel}</p>
                </div>

                <span className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                    {buttonLabel}
                </span>
            </div>
        </button>
    );
}

SummaryCard.propTypes = {
    icon: PropTypes.elementType.isRequired,
    title: PropTypes.string.isRequired,
    value: PropTypes.node.isRequired,
    valueClassName: PropTypes.string,
    sublabel: PropTypes.string,
    buttonLabel: PropTypes.string.isRequired,
    onClick: PropTypes.func,
};

function PasswordChangeForm({
    passwordData,
    setPasswordData,
    passwordVisibility,
    setPasswordVisibility,
    passwordErrors,
    passwordStrength,
    changePasswordMutation,
    onSuccess,
}) {
    return (
        <div className="space-y-4">
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

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={() => changePasswordMutation.mutate(passwordData, { onSuccess: () => onSuccess?.() })}
                    className="px-4 py-2 rounded-lg text-sm bg-[#4f46e5] text-white hover:bg-[#3730a3]"
                    disabled={changePasswordMutation.isPending}
                >
                    Update Password
                </button>
            </div>
        </div>
    );
}

PasswordChangeForm.propTypes = {
    passwordData: PropTypes.shape({
        currentPassword: PropTypes.string.isRequired,
        newPassword: PropTypes.string.isRequired,
        confirmPassword: PropTypes.string.isRequired,
    }).isRequired,
    setPasswordData: PropTypes.func.isRequired,
    passwordVisibility: PropTypes.shape({
        currentPassword: PropTypes.bool.isRequired,
        newPassword: PropTypes.bool.isRequired,
        confirmPassword: PropTypes.bool.isRequired,
    }).isRequired,
    setPasswordVisibility: PropTypes.func.isRequired,
    passwordErrors: PropTypes.shape({
        currentPassword: PropTypes.string,
        newPassword: PropTypes.string,
        confirmPassword: PropTypes.string,
    }).isRequired,
    passwordStrength: PropTypes.shape({
        color: PropTypes.string.isRequired,
        textColor: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        pct: PropTypes.number.isRequired,
    }).isRequired,
    changePasswordMutation: PropTypes.shape({
        mutate: PropTypes.func.isRequired,
        isPending: PropTypes.bool.isRequired,
    }).isRequired,
    onSuccess: PropTypes.func,
};

function MFAManageForm({
    effectiveUser,
    mfaSetupMutation,
    regenCodesMutation,
    disableMfaMutation,
    onSuccess,
}) {
    if (!effectiveUser?.mfaEnabled) {
        return (
            <div className="bg-[#dc2626]/5 border border-[#dc2626]/15 rounded-xl px-4 py-3 flex items-start gap-3">
                <AlertTriangle size={16} className="text-[#dc2626] mt-0.5" />
                <div className="flex-1">
                    <p className="text-[13px] text-[#7a1b1b]">Your account is not protected by two-factor authentication.</p>
                </div>
                <button
                    type="button"
                    onClick={() => mfaSetupMutation.mutate(undefined, { onSuccess: () => onSuccess?.() })}
                    className="px-3 py-1.5 rounded-lg text-sm bg-[#4f46e5] text-white hover:bg-[#3730a3]"
                >
                    Enable MFA
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="bg-[#16a34a]/5 border border-[#16a34a]/15 rounded-xl px-4 py-3">
                <p className="text-[13px] text-[#1f5e34]">Configured with Authenticator App</p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
                <button
                    type="button"
                    onClick={() => regenCodesMutation.mutate(undefined, { onSuccess: () => onSuccess?.() })}
                    className="px-3 py-2 text-sm border border-[#d0d7e8] rounded-lg text-[#3a4560] hover:bg-[#f4f6fb]"
                    disabled={regenCodesMutation.isPending}
                >
                    Regenerate Backup Codes
                </button>
                <button
                    type="button"
                    onClick={() => disableMfaMutation.mutate(undefined, { onSuccess: () => onSuccess?.() })}
                    className="px-3 py-2 text-sm border border-red-200 text-[#dc2626] rounded-lg hover:bg-red-50"
                    disabled={disableMfaMutation.isPending}
                >
                    Disable MFA
                </button>
            </div>
        </div>
    );
}

MFAManageForm.propTypes = {
    effectiveUser: PropTypes.shape({
        mfaEnabled: PropTypes.bool,
    }),
    mfaSetupMutation: PropTypes.shape({
        mutate: PropTypes.func.isRequired,
        isPending: PropTypes.bool.isRequired,
    }).isRequired,
    regenCodesMutation: PropTypes.shape({
        mutate: PropTypes.func.isRequired,
        isPending: PropTypes.bool.isRequired,
    }).isRequired,
    disableMfaMutation: PropTypes.shape({
        mutate: PropTypes.func.isRequired,
        isPending: PropTypes.bool.isRequired,
    }).isRequired,
    onSuccess: PropTypes.func,
};

export default function SecurityPage() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { withReauth, reauthModal, handleReauthSuccess, handleReauthClose } = useReauth();

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
    const [activeModal, setActiveModal] = useState(null);
    const [mfaStep, setMfaStep] = useState(1);
    const [mfaSetup, setMfaSetup] = useState(null);
    const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
    const [revealedBackupCodes, setRevealedBackupCodes] = useState([]);

    const { data: profileData } = useQuery({
        queryKey: ['settings-profile'],
        queryFn: () => settingsAPI.getProfile().then((res) => res.data?.data),
    });

    const { data: sessionsData = [] } = useQuery({
        queryKey: ['settings-sessions'],
        queryFn: () => settingsAPI.getSessions().then((res) => res.data?.data || []),
    });

    const { data: apiKeysData = [] } = useQuery({
        queryKey: ['settings-api-keys'],
        queryFn: () => settingsAPI.getApiKeys().then((res) => res.data?.data || []),
    });

    const effectiveUser = {
        ...user,
        ...(profileData || {}),
    };

    const changePasswordMutation = useMutation({
        mutationFn: (payload) => settingsAPI.changePassword(payload),
        onSuccess: async () => {
            toast.success('Password updated');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setPasswordErrors({});
            await queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
        },
        onError: (error) => {
            const details = error.response?.data?.error?.details || [];
            const mapped = {};
            details.forEach((item) => {
                if (item.field) mapped[item.field] = item.message;
            });
            setPasswordErrors(mapped);
            if (!details.length) {
                toast.error(error.response?.data?.error?.message || 'Failed to update password');
            }
        },
    });

    const mfaSetupMutation = useMutation({
        mutationFn: () => settingsAPI.getMfaSetup(),
        onSuccess: (response) => {
            setMfaSetup(response.data?.data);
            setShowMfaModal(true);
            setMfaStep(1);
            setOtpDigits(['', '', '', '', '', '']);
        },
        onError: (error) => {
            toast.error(error.response?.data?.error?.message || 'Failed to initialize MFA setup');
        },
    });

    const verifyMfaMutation = useMutation({
        mutationFn: ({ token, secret, stateToken }) => settingsAPI.verifyMfa({ token, secret, stateToken }),
        onSuccess: async (response) => {
            setRevealedBackupCodes(response.data?.data?.backupCodes || []);
            setMfaStep(3);
            await queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.error?.message || 'Invalid verification code');
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
        onError: (error) => {
            if (isReauthCancelled(error)) return;
            toast.error(error.response?.data?.error?.message || 'Failed to disable MFA');
        },
    });

    const regenCodesMutation = useMutation({
        mutationFn: () => withReauth(
            (credentials) => settingsAPI.regenerateBackupCodes(credentials),
            'regenerating backup codes'
        ),
        onSuccess: async (response) => {
            setRevealedBackupCodes(response.data?.data?.backupCodes || []);
            setShowMfaModal(true);
            setMfaStep(3);
            toast.success('Backup codes regenerated');
            await queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
        },
        onError: (error) => {
            if (isReauthCancelled(error)) return;
            toast.error(error.response?.data?.error?.message || 'Failed to regenerate backup codes');
        },
    });

    const passwordStrength = getPasswordStrength(passwordData.newPassword || '');
    const otpValue = otpDigits.join('');

    const passwordAgeDays = getDaysSince(effectiveUser?.passwordChangedAt);
    const passwordUpToDate = !effectiveUser?.passwordChangedAt
        ? effectiveUser?.hasPassword === false
        : passwordAgeDays <= 90;

    const downloadBackupCodes = () => {
        if (revealedBackupCodes.length === 0) return;
        const blob = new Blob([revealedBackupCodes.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `iam-backup-codes-${new Date().toISOString().slice(0, 10)}.txt`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const modalConfig = {
        password: { title: 'Update Password', icon: Lock },
        mfa: { title: 'Two-Factor Authentication', icon: ShieldCheck },
    };

    const selectedModal = activeModal ? modalConfig[activeModal] : null;
    return (
        <div className="w-full p-0">
            <div className="animate-fade-in w-full">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Security</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Manage your account security, authentication, and access controls.
                        </p>
                    </div>
                </div>

                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <SummaryCard
                        icon={Lock}
                        title="Password"
                        value={passwordUpToDate ? 'Up to date' : 'Needs update'}
                        valueClassName={passwordUpToDate ? 'text-emerald-600' : 'text-red-600'}
                        sublabel={formatPasswordAge(effectiveUser?.passwordChangedAt, effectiveUser?.hasPassword)}
                        buttonLabel="Update"
                        onClick={() => setActiveModal('password')}
                    />
                    <SummaryCard
                        icon={ShieldCheck}
                        title="Two-Factor Auth"
                        value={effectiveUser?.mfaEnabled ? 'Enabled' : 'Disabled'}
                        valueClassName={effectiveUser?.mfaEnabled ? 'text-emerald-600' : 'text-red-600'}
                        sublabel={effectiveUser?.mfaEnabled ? 'Authenticator app' : 'Not configured'}
                        buttonLabel="Manage"
                        onClick={() => setActiveModal('mfa')}
                    />
                </div>

                <section>
                    <SecurityScore
                        user={effectiveUser}
                        sessions={sessionsData}
                        apiKeys={apiKeysData}
                        connectedApps={[]}
                    />
                </section>
            </div>

            {selectedModal ? (
                <Modal
                    title={selectedModal.title}
                    icon={selectedModal.icon}
                    onClose={() => setActiveModal(null)}
                >
                    {activeModal === 'password' ? (
                        <PasswordChangeForm
                            passwordData={passwordData}
                            setPasswordData={setPasswordData}
                            passwordVisibility={passwordVisibility}
                            setPasswordVisibility={setPasswordVisibility}
                            passwordErrors={passwordErrors}
                            passwordStrength={passwordStrength}
                            changePasswordMutation={changePasswordMutation}
                            onSuccess={() => setActiveModal(null)}
                        />
                    ) : null}

                    {activeModal === 'mfa' ? (
                        <MFAManageForm
                            effectiveUser={effectiveUser}
                            mfaSetupMutation={mfaSetupMutation}
                            regenCodesMutation={regenCodesMutation}
                            disableMfaMutation={disableMfaMutation}
                            onSuccess={() => setActiveModal(null)}
                        />
                    ) : null}
                </Modal>
            ) : null}

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
                                        key={OTP_INPUT_IDS[index]}
                                        value={digit}
                                        onChange={(event) => {
                                            const clean = event.target.value.replace(/\D/g, '').slice(-1);
                                            setOtpDigits((prev) => {
                                                const next = [...prev];
                                                next[index] = clean;
                                                return next;
                                            });
                                            if (clean && index < 5) {
                                                const nextInput = document.getElementById(OTP_INPUT_IDS[index + 1]);
                                                nextInput?.focus();
                                            }
                                        }}
                                        id={OTP_INPUT_IDS[index]}
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
