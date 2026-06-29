import PropTypes from 'prop-types';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AlertTriangle, Lock, Monitor, ShieldCheck, Smartphone,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { settingsAPI } from '../../../services/api';
import { formatRelative, daysSince } from '../../../utils/formatters';
import { classNames, getPasswordStrength, OTP_INPUT_IDS, CardShell, CardHeader, PasswordField, Modal } from './shared';

export default function SecurityTab({ user }) {
    const queryClient = useQueryClient();

    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [passwordErrors, setPasswordErrors] = useState({});
    const [passwordVisibility, setPasswordVisibility] = useState({ currentPassword: false, newPassword: false, confirmPassword: false });

    const [showMfaModal, setShowMfaModal] = useState(false);
    const [mfaStep, setMfaStep] = useState(1);
    const [mfaSetup, setMfaSetup] = useState(null);
    const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
    const [revealedBackupCodes, setRevealedBackupCodes] = useState([]);

    const [disablePassword, setDisablePassword] = useState('');
    const [showDisablePrompt, setShowDisablePrompt] = useState(false);

    const { data: trustedDevicesData } = useQuery({
        queryKey: ['settings-trusted-devices'],
        queryFn: () => settingsAPI.getTrustedDevices().then((res) => res.data?.data || []),
    });

    const changePasswordMutation = useMutation({
        mutationFn: (payload) => settingsAPI.changePassword(payload),
        onSuccess: () => {
            toast.success('Password updated');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setPasswordErrors({});
        },
        onError: (err) => {
            const details = err.response?.data?.error?.details || [];
            const mapped = {};
            details.forEach((item) => { if (item.field) mapped[item.field] = item.message; });
            setPasswordErrors(mapped);
            if (!details.length) toast.error(err.response?.data?.error?.message || 'Failed to update password');
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
        onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to initialize MFA setup'),
    });

    const verifyMfaMutation = useMutation({
        mutationFn: ({ token, secret, stateToken }) => settingsAPI.verifyMfa({ token, secret, stateToken }),
        onSuccess: async (res) => {
            setRevealedBackupCodes(res.data?.data?.backupCodes || []);
            setMfaStep(3);
            await queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
        },
        onError: (err) => toast.error(err.response?.data?.error?.message || 'Invalid verification code'),
    });

    const disableMfaMutation = useMutation({
        mutationFn: (payload) => settingsAPI.disableMfa(payload),
        onSuccess: async () => {
            toast.success('MFA disabled');
            setShowDisablePrompt(false);
            setDisablePassword('');
            await queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
        },
        onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to disable MFA'),
    });

    const regenCodesMutation = useMutation({
        mutationFn: (payload) => settingsAPI.regenerateBackupCodes(payload),
        onSuccess: (res) => {
            setRevealedBackupCodes(res.data?.data?.backupCodes || []);
            setShowMfaModal(true);
            setMfaStep(3);
            toast.success('Backup codes regenerated');
        },
        onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to regenerate backup codes'),
    });

    const revokeDeviceMutation = useMutation({
        mutationFn: (deviceId) => settingsAPI.revokeTrustedDevice(deviceId),
        onSuccess: async () => { toast.success('Trusted device revoked'); await queryClient.invalidateQueries({ queryKey: ['settings-trusted-devices'] }); },
        onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to revoke device'),
    });

    const revokeAllDevicesMutation = useMutation({
        mutationFn: () => settingsAPI.revokeAllTrustedDevices(),
        onSuccess: async () => { toast.success('All trusted devices revoked'); await queryClient.invalidateQueries({ queryKey: ['settings-trusted-devices'] }); },
        onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to revoke all devices'),
    });

    const passwordStrength = getPasswordStrength(passwordData.newPassword || '');
    const trustedDevices = trustedDevicesData || [];
    const otpValue = otpDigits.join('');

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

    return (
        <div className="w-full space-y-5">
            <CardShell>
                <CardHeader
                    icon={Lock}
                    title="Password"
                    right={<span className="text-xs text-[#7a87a8]">Last changed: {daysSince(user?.passwordChangedAt)}</span>}
                />
                <div className="px-6 py-5 space-y-4">
                    <PasswordField label="Current Password" value={passwordData.currentPassword} onChange={(value) => setPasswordData((prev) => ({ ...prev, currentPassword: value }))} visible={passwordVisibility.currentPassword} onToggle={() => setPasswordVisibility((prev) => ({ ...prev, currentPassword: !prev.currentPassword }))} error={passwordErrors.currentPassword} />
                    <div>
                        <PasswordField label="New Password" value={passwordData.newPassword} onChange={(value) => setPasswordData((prev) => ({ ...prev, newPassword: value }))} visible={passwordVisibility.newPassword} onToggle={() => setPasswordVisibility((prev) => ({ ...prev, newPassword: !prev.newPassword }))} error={passwordErrors.newPassword} />
                        <div className="mt-2 flex items-center gap-2">
                            <div className="w-full h-1.5 bg-[#f0f2f8] rounded-full overflow-hidden">
                                <div className={classNames('h-full transition-all', passwordStrength.color)} style={{ width: `${passwordStrength.pct}%` }} />
                            </div>
                            <span className={classNames('text-xs font-medium', passwordStrength.textColor)}>{passwordStrength.label}</span>
                        </div>
                    </div>
                    <PasswordField label="Confirm Password" value={passwordData.confirmPassword} onChange={(value) => setPasswordData((prev) => ({ ...prev, confirmPassword: value }))} visible={passwordVisibility.confirmPassword} onToggle={() => setPasswordVisibility((prev) => ({ ...prev, confirmPassword: !prev.confirmPassword }))} error={passwordErrors.confirmPassword} />
                </div>
                <div className="px-6 pb-5 flex justify-end">
                    <button type="button" onClick={() => changePasswordMutation.mutate(passwordData)} className="px-4 py-2 rounded-lg text-sm bg-[#4f46e5] text-white hover:bg-[#3730a3]" disabled={changePasswordMutation.isPending}>Update Password</button>
                </div>
            </CardShell>

            <CardShell>
                <CardHeader
                    icon={ShieldCheck}
                    title="Two-Factor Authentication"
                    right={(
                        <span className={classNames('text-xs font-semibold px-2 py-1 rounded-full', user?.mfaEnabled ? 'bg-[#16a34a]/10 text-[#16a34a]' : 'bg-[#dc2626]/10 text-[#dc2626]')}>
                            {user?.mfaEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                    )}
                />

                {user?.mfaEnabled ? (
                    <div className="px-6 py-5 space-y-4">
                        <div className="bg-[#16a34a]/5 border border-[#16a34a]/15 rounded-xl px-4 py-3">
                            <p className="text-[13px] text-[#1f5e34]">Configured with Authenticator App</p>
                        </div>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => { const password = globalThis.prompt('Confirm your password to regenerate backup codes'); if (password) regenCodesMutation.mutate({ password }); }} className="px-3 py-2 text-sm border border-[#d0d7e8] rounded-lg text-[#3a4560] hover:bg-[#f4f6fb]">View Backup Codes</button>
                            <button type="button" onClick={() => setShowDisablePrompt(true)} className="px-3 py-2 text-sm border border-red-200 text-[#dc2626] rounded-lg hover:bg-red-50">Disable MFA</button>
                        </div>
                        {showDisablePrompt ? (
                            <div className="border border-[#d0d7e8] rounded-xl p-3 bg-[#f8f9fd]">
                                <label htmlFor="disable-mfa-password" className="text-xs text-[#7a87a8] block mb-1">Confirm password</label>
                                <div className="flex gap-2">
                                    <input id="disable-mfa-password" type="password" value={disablePassword} onChange={(e) => setDisablePassword(e.target.value)} className="flex-1 border border-[#d0d7e8] rounded-lg px-3 py-2 text-sm" />
                                    <button type="button" onClick={() => disableMfaMutation.mutate({ password: disablePassword })} className="px-3 py-2 rounded-lg text-sm bg-[#dc2626] text-white">Confirm</button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <div className="px-6 py-5">
                        <div className="bg-[#dc2626]/5 border border-[#dc2626]/15 rounded-xl px-4 py-3 flex items-start gap-3">
                            <AlertTriangle size={16} className="text-[#dc2626] mt-0.5" />
                            <div className="flex-1"><p className="text-[13px] text-[#7a1b1b]">Your account is not protected by two-factor authentication.</p></div>
                            <button type="button" onClick={() => mfaSetupMutation.mutate()} className="px-3 py-1.5 rounded-lg text-sm bg-[#4f46e5] text-white hover:bg-[#3730a3]">Enable MFA</button>
                        </div>
                    </div>
                )}
                <div className="px-6 py-3 border-t border-[#f0f2f8]">
                    <a href="/dashboard/audit-logs" className="text-sm text-[#4f46e5] hover:underline">View Full Audit Log →</a>
                </div>
            </CardShell>

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
                            <button type="button" onClick={() => revokeDeviceMutation.mutate(device.id)} className="text-xs text-[#dc2626] hover:underline">Revoke</button>
                        </div>
                    ))}
                    {trustedDevices.length === 0 ? <div className="px-6 py-4 text-sm text-[#7a87a8]">No trusted devices found.</div> : null}
                </div>
                <div className="px-6 py-3 border-t border-[#f0f2f8]">
                    <button type="button" onClick={() => revokeAllDevicesMutation.mutate()} className="px-3 py-1.5 text-xs border border-red-200 text-[#dc2626] rounded-lg hover:bg-red-50">Revoke All Devices</button>
                </div>
            </CardShell>

            {showMfaModal ? (
                <Modal title="MFA Setup" icon={ShieldCheck} onClose={() => { setShowMfaModal(false); setMfaStep(1); }}>
                    {mfaStep === 1 ? (
                        <div className="space-y-4">
                            <p className="text-sm text-[#3a4560]">Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password).</p>
                            <div className="flex justify-center">
                                <img src={mfaSetup?.qrCodeUrl} alt="MFA QR" className="w-[180px] h-[180px] border border-[#d0d7e8] rounded-xl" />
                            </div>
                            <div className="bg-[#f4f6fb] border border-[#d0d7e8] rounded-xl p-3">
                                <p className="text-xs text-[#7a87a8] mb-1">Manual Secret</p>
                                <p className="font-mono text-sm break-all text-[#0f1623]">{mfaSetup?.secret}</p>
                            </div>
                            <div className="flex justify-end">
                                <button type="button" onClick={() => setMfaStep(2)} className="px-4 py-2 text-sm bg-[#4f46e5] text-white rounded-lg">Next</button>
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
                                        onChange={(e) => {
                                            const clean = e.target.value.replace(/\D/g, '').slice(-1);
                                            setOtpDigits((prev) => { const next = [...prev]; next[index] = clean; return next; });
                                            if (clean && index < 5) document.getElementById(OTP_INPUT_IDS[index + 1])?.focus();
                                        }}
                                        id={OTP_INPUT_IDS[index]}
                                        maxLength={1}
                                        className="w-10 h-12 text-center text-lg font-mono border border-[#d0d7e8] rounded-xl focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/25"
                                    />
                                ))}
                            </div>
                            <div className="flex justify-end">
                                <button type="button" onClick={() => verifyMfaMutation.mutate({ token: otpValue, secret: mfaSetup?.secret, stateToken: mfaSetup?.stateToken })} className="px-4 py-2 text-sm bg-[#4f46e5] text-white rounded-lg" disabled={otpValue.length !== 6 || verifyMfaMutation.isPending}>Verify & Enable</button>
                            </div>
                        </div>
                    ) : null}

                    {mfaStep === 3 ? (
                        <div className="space-y-4">
                            <p className="text-sm text-[#3a4560]">Save these codes somewhere safe. Each can only be used once.</p>
                            <div className="grid grid-cols-2 gap-2">
                                {revealedBackupCodes.map((code) => (
                                    <div key={code} className="font-mono text-sm bg-[#f4f6fb] border border-[#d0d7e8] rounded-lg px-4 py-2 text-center">{code}</div>
                                ))}
                            </div>
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={downloadBackupCodes} className="px-3 py-2 text-sm border border-[#d0d7e8] rounded-lg">Download Codes</button>
                                <button type="button" onClick={() => setShowMfaModal(false)} className="px-3 py-2 text-sm bg-[#4f46e5] text-white rounded-lg">Done</button>
                            </div>
                        </div>
                    ) : null}
                </Modal>
            ) : null}
        </div>
    );
}

SecurityTab.propTypes = {
    user: PropTypes.shape({
        mfaEnabled: PropTypes.bool,
        passwordChangedAt: PropTypes.string,
        hasPassword: PropTypes.bool,
    }),
};
