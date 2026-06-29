import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AlertTriangle, Building2, Lock, Monitor, ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { settingsAPI } from '../../../services/api';
import { CardShell, CardHeader, DangerRow, Field, Modal, PolicyToggleRow } from './shared';

export default function OrganizationTab() {
    const queryClient = useQueryClient();

    const { data: organization } = useQuery({
        queryKey: ['settings-organization'],
        queryFn: () => settingsAPI.getOrganization().then((res) => res.data?.data),
    });

    const [form, setForm] = useState(null);
    const [showResetModal, setShowResetModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [resetConfirmText, setResetConfirmText] = useState('');
    const [resetPassword, setResetPassword] = useState('');
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    const working = form || organization || {};

    const updateMutation = useMutation({
        mutationFn: (payload) => settingsAPI.updateOrganization(payload),
        onSuccess: async () => { toast.success('Organization settings updated'); setForm(null); await queryClient.invalidateQueries({ queryKey: ['settings-organization'] }); },
        onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to update organization settings'),
    });

    const exportMutation = useMutation({
        mutationFn: () => settingsAPI.exportOrganizationData(),
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
        onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to export data'),
    });

    const resetMutation = useMutation({
        mutationFn: (payload) => settingsAPI.resetOrganizationPolicies(payload),
        onSuccess: async () => { toast.success('Organization security policies reset to defaults'); setShowResetModal(false); setResetConfirmText(''); setResetPassword(''); await queryClient.invalidateQueries({ queryKey: ['settings-organization'] }); },
        onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to reset policies'),
    });

    const updateField = (key, value) => {
        const base = form || organization || {};
        setForm({ ...base, [key]: value });
    };

    const save = () => {
        if (!form) return;
        const payload = {
            orgName: form.orgName, region: form.region,
            minPasswordLength: Number(form.minPasswordLength),
            requireUppercase: Boolean(form.requireUppercase), requireNumber: Boolean(form.requireNumber), requireSymbol: Boolean(form.requireSymbol),
            passwordExpiryDays: form.passwordExpiryDays === '' || form.passwordExpiryDays === null ? null : Number(form.passwordExpiryDays),
            maxFailedAttempts: Number(form.maxFailedAttempts), sessionTimeoutMinutes: Number(form.sessionTimeoutMinutes),
            requireMfaForAll: Boolean(form.requireMfaForAll), allowOAuthLogin: Boolean(form.allowOAuthLogin),
            ipAllowlist: String(form.ipAllowlist || '').split('\n').map((line) => line.trim()).filter(Boolean),
        };
        updateMutation.mutate(payload);
    };

    if (!organization) return <div className="text-sm text-[#7a87a8]">Loading organization settings...</div>;

    return (
        <div className="w-full space-y-5">
            <CardShell>
                <CardHeader icon={Building2} title="Organization" />
                <div className="p-6 space-y-4">
                    <Field label="Organization Name">
                        <input value={working.orgName || ''} onChange={(e) => updateField('orgName', e.target.value)} className="w-full border border-[#d0d7e8] rounded-xl px-3 py-2 text-sm" />
                    </Field>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field label="Account ID">
                            <div className="flex gap-2">
                                <input value={working.accountId || ''} readOnly className="flex-1 border border-[#d0d7e8] rounded-xl px-3 py-2 text-sm bg-[#f4f6fb]" />
                                <button type="button" onClick={() => navigator.clipboard.writeText(working.accountId || '')} className="px-3 py-2 text-xs border border-[#d0d7e8] rounded-lg">Copy</button>
                            </div>
                        </Field>
                        <Field label="Plan">
                            <div className="h-10 flex items-center px-3 text-sm rounded-xl bg-[#f4f6fb] border border-[#d0d7e8]">
                                <span className="text-[#4f46e5] font-semibold uppercase">{working.plan}</span>
                            </div>
                        </Field>
                    </div>
                    <Field label="Region">
                        <input value={working.region || ''} onChange={(e) => updateField('region', e.target.value)} className="w-full border border-[#d0d7e8] rounded-xl px-3 py-2 text-sm" />
                    </Field>
                </div>
            </CardShell>

            <CardShell>
                <CardHeader icon={Lock} title="Password Policy" />
                <div className="p-6 space-y-4">
                    <Field label="Minimum password length">
                        <input type="number" min={6} max={32} value={working.minPasswordLength ?? 8} onChange={(e) => updateField('minPasswordLength', e.target.value)} className="w-36 border border-[#d0d7e8] rounded-xl px-3 py-2 text-sm" />
                    </Field>
                    <PolicyToggleRow label="Require uppercase" value={Boolean(working.requireUppercase)} onChange={() => updateField('requireUppercase', !working.requireUppercase)} />
                    <PolicyToggleRow label="Require number" value={Boolean(working.requireNumber)} onChange={() => updateField('requireNumber', !working.requireNumber)} />
                    <PolicyToggleRow label="Require symbol" value={Boolean(working.requireSymbol)} onChange={() => updateField('requireSymbol', !working.requireSymbol)} />
                    <Field label="Password expiry">
                        <select value={working.passwordExpiryDays ?? ''} onChange={(e) => updateField('passwordExpiryDays', e.target.value === '' ? null : e.target.value)} className="w-full border border-[#d0d7e8] rounded-xl px-3 py-2 text-sm bg-white">
                            <option value="">Never</option><option value="30">30 days</option><option value="60">60 days</option><option value="90">90 days</option>
                        </select>
                    </Field>
                </div>
            </CardShell>

            <CardShell>
                <CardHeader icon={ShieldCheck} title="Access Policy" />
                <div className="p-6 space-y-4">
                    <Field label="Max failed attempts before lockout">
                        <input type="number" min={1} max={20} value={working.maxFailedAttempts ?? 5} onChange={(e) => updateField('maxFailedAttempts', e.target.value)} className="w-36 border border-[#d0d7e8] rounded-xl px-3 py-2 text-sm" />
                    </Field>
                    <Field label="Session timeout (minutes)">
                        <select value={working.sessionTimeoutMinutes ?? 480} onChange={(e) => updateField('sessionTimeoutMinutes', Number(e.target.value))} className="w-full border border-[#d0d7e8] rounded-xl px-3 py-2 text-sm bg-white">
                            <option value={60}>60 minutes</option><option value={240}>4 hours</option><option value={480}>8 hours</option><option value={1440}>24 hours</option><option value={10080}>7 days</option>
                        </select>
                    </Field>
                    <PolicyToggleRow label="Require MFA for all users" value={Boolean(working.requireMfaForAll)} onChange={() => updateField('requireMfaForAll', !working.requireMfaForAll)} />
                    {working.requireMfaForAll ? <p className="text-xs text-[#b45309]">Enabling this will lock out users without MFA configured</p> : null}
                    <PolicyToggleRow label="Allow OAuth login" value={Boolean(working.allowOAuthLogin)} onChange={() => updateField('allowOAuthLogin', !working.allowOAuthLogin)} />
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
                <DangerRow title="Export All Data" description="Download all users, roles, policies, groups, and recent audit logs." actionLabel="Export" onAction={() => exportMutation.mutate()} />
                <DangerRow title="Reset All Policies" description="Reset organization security policy fields to defaults." actionLabel="Reset" onAction={() => setShowResetModal(true)} />
                <DangerRow title="Delete Organization" description="Dangerous irreversible operation placeholder for future implementation." actionLabel="Delete" onAction={() => setShowDeleteModal(true)} />
            </CardShell>

            <div className="flex justify-end">
                <button type="button" onClick={save} className="px-4 py-2 rounded-lg text-sm bg-[#4f46e5] text-white hover:bg-[#3730a3]" disabled={!form || updateMutation.isPending}>Save Organization Settings</button>
            </div>

            {showResetModal ? (
                <Modal title="Reset Policies" icon={AlertTriangle} onClose={() => setShowResetModal(false)}>
                    <div className="space-y-4">
                        <p className="text-sm text-[#3a4560]">Type <span className="font-mono">RESET</span> and confirm your password to continue.</p>
                        <input value={resetConfirmText} onChange={(e) => setResetConfirmText(e.target.value)} placeholder="Type RESET" className="w-full border border-[#d0d7e8] rounded-xl px-3 py-2 text-sm" />
                        <input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="Password" className="w-full border border-[#d0d7e8] rounded-xl px-3 py-2 text-sm" />
                        <div className="flex justify-end">
                            <button type="button" onClick={() => resetMutation.mutate({ password: resetPassword, confirm: 'CONFIRM' })} disabled={resetConfirmText !== 'RESET' || !resetPassword} className="px-3 py-2 text-sm rounded-lg bg-[#dc2626] text-white disabled:opacity-50">Confirm Reset</button>
                        </div>
                    </div>
                </Modal>
            ) : null}

            {showDeleteModal ? (
                <Modal title="Delete Organization" icon={AlertTriangle} onClose={() => setShowDeleteModal(false)}>
                    <div className="space-y-4">
                        <p className="text-sm text-[#3a4560]">Type the organization name <span className="font-medium">{organization.orgName}</span> to confirm. This action is currently disabled.</p>
                        <input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} className="w-full border border-[#d0d7e8] rounded-xl px-3 py-2 text-sm" />
                        <div className="flex justify-end">
                            <button type="button" disabled className="px-3 py-2 text-sm rounded-lg bg-[#dc2626] text-white opacity-50 cursor-not-allowed">Delete (Not Implemented)</button>
                        </div>
                    </div>
                </Modal>
            ) : null}
        </div>
    );
}
