import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Key, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { settingsAPI } from '../../../services/api';
import { formatDate } from '../../../utils/formatters';
import { classNames, API_SCOPE_OPTIONS, Field, Modal } from './shared';

export default function ApiKeysTab() {
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [createdToken, setCreatedToken] = useState(null);

    const [tokenForm, setTokenForm] = useState({ name: '', expiresIn: 30, scopes: ['read:users'] });

    const { data: apiKeys = [] } = useQuery({
        queryKey: ['settings-api-keys'],
        queryFn: () => settingsAPI.getApiKeys().then((res) => res.data?.data || []),
    });

    const createMutation = useMutation({
        mutationFn: (payload) => settingsAPI.createApiKey(payload),
        onSuccess: async (res) => { setCreatedToken(res.data?.data?.token || null); await queryClient.invalidateQueries({ queryKey: ['settings-api-keys'] }); toast.success('API key created'); },
        onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to create API key'),
    });

    const revokeMutation = useMutation({
        mutationFn: (tokenId) => settingsAPI.revokeApiKey(tokenId),
        onSuccess: async () => { toast.success('API key revoked'); await queryClient.invalidateQueries({ queryKey: ['settings-api-keys'] }); },
        onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to revoke API key'),
    });

    const toggleScope = (scopeValue) => {
        setTokenForm((prev) => {
            const exists = prev.scopes.includes(scopeValue);
            const nextScopes = exists ? prev.scopes.filter((item) => item !== scopeValue) : [...prev.scopes, scopeValue];
            return { ...prev, scopes: nextScopes };
        });
    };

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h3 className="text-[15px] font-semibold text-[#0f1623]">API Keys</h3>
                    <p className="text-xs text-[#7a87a8] mt-0.5">Manage machine credentials and scoped token access.</p>
                </div>
                <button type="button" onClick={() => { setShowModal(true); setCreatedToken(null); }} className="px-4 py-2 rounded-lg text-sm bg-[#4f46e5] text-white hover:bg-[#3730a3]">+ New API Key</button>
            </div>

            <div className="bg-white border border-[#d0d7e8] rounded-2xl overflow-hidden shadow-sm">
                <div className="grid grid-cols-[1.1fr_0.9fr_1.4fr_0.9fr_0.9fr_0.9fr_0.6fr] px-5 py-3 border-b border-[#f0f2f8] text-[10px] font-semibold tracking-widest uppercase text-[#7a87a8]">
                    <span>Name</span><span>Prefix</span><span>Scopes</span><span>Created</span><span>Last Used</span><span>Expires</span><span>Actions</span>
                </div>
                <div>
                    {apiKeys.map((token) => {
                        const expired = token.expiresAt && new Date(token.expiresAt) < new Date();
                        return (
                            <div key={token.id} className={classNames('grid grid-cols-[1.1fr_0.9fr_1.4fr_0.9fr_0.9fr_0.9fr_0.6fr] px-5 py-3 border-b border-[#f0f2f8] items-center text-sm', expired ? 'opacity-50' : '')}>
                                <div className="font-medium text-[#0f1623]">{token.name}</div>
                                <div><span className="font-mono text-xs bg-[#f4f6fb] px-2 py-0.5 rounded border border-[#d0d7e8]">{token.tokenPrefix}</span></div>
                                <div className="flex flex-wrap gap-1">
                                    {token.scopes?.map((scope) => (<span key={scope} className="bg-[#4f46e5]/8 text-[#4f46e5] text-[10px] px-2 py-0.5 rounded-full">{scope}</span>))}
                                </div>
                                <div className="text-xs text-[#7a87a8]">{formatDate(token.createdAt)}</div>
                                <div className="text-xs text-[#7a87a8]">{token.lastUsedAt ? formatDate(token.lastUsedAt) : 'Never'}</div>
                                <div className="text-xs text-[#7a87a8] flex items-center gap-2">
                                    {token.expiresAt ? formatDate(token.expiresAt) : 'Never'}
                                    {expired ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#dc2626]/10 text-[#dc2626]">Expired</span> : null}
                                </div>
                                <div><button type="button" onClick={() => revokeMutation.mutate(token.id)} className="text-[#dc2626] hover:text-[#b91c1c]"><Trash2 size={14} /></button></div>
                            </div>
                        );
                    })}
                    {apiKeys.length === 0 ? <div className="px-5 py-6 text-sm text-[#7a87a8]">No API keys created yet.</div> : null}
                </div>
            </div>

            {showModal ? (
                <Modal title="Create API Key" icon={Key} onClose={() => setShowModal(false)}>
                    {createdToken ? (
                        <div className="space-y-4">
                            <div className="bg-[#f4f6fb] border border-[#d0d7e8] rounded-xl p-4 font-mono text-sm break-all relative">
                                {createdToken}
                                <button type="button" onClick={() => navigator.clipboard.writeText(createdToken)} className="absolute top-2 right-2 text-xs px-2 py-1 border border-[#d0d7e8] rounded bg-white">Copy</button>
                            </div>
                            <div className="bg-[#d97706]/10 border border-[#d97706]/20 rounded-xl px-4 py-3 flex gap-2 text-sm text-[#92400e]">
                                <AlertTriangle size={16} />
                                <span>This token will not be shown again. Copy it now and store it securely.</span>
                            </div>
                            <div className="flex justify-end">
                                <button type="button" onClick={() => { setShowModal(false); setCreatedToken(null); setTokenForm({ name: '', expiresIn: 30, scopes: ['read:users'] }); }} className="px-4 py-2 rounded-lg text-sm bg-[#4f46e5] text-white hover:bg-[#3730a3]">Done</button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <Field label="Token Name">
                                <input value={tokenForm.name} onChange={(e) => setTokenForm((prev) => ({ ...prev, name: e.target.value }))} className="w-full border border-[#d0d7e8] rounded-xl px-3 py-2 text-sm" />
                            </Field>
                            <Field label="Expiry">
                                <select value={String(tokenForm.expiresIn)} onChange={(e) => setTokenForm((prev) => ({ ...prev, expiresIn: e.target.value === 'null' ? null : Number(e.target.value) }))} className="w-full border border-[#d0d7e8] rounded-xl px-3 py-2 text-sm">
                                    <option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option><option value={365}>1 year</option><option value="null">Never</option>
                                </select>
                            </Field>
                            <div>
                                <p className="text-xs text-[#7a87a8] font-medium block mb-2">Scopes</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {API_SCOPE_OPTIONS.map((scope) => {
                                        const checked = tokenForm.scopes.includes(scope.value);
                                        return (
                                            <button key={scope.value} type="button" onClick={() => toggleScope(scope.value)} className={classNames('border border-[#d0d7e8] rounded-xl px-4 py-3 text-left hover:bg-[#f8f9fd]', checked ? 'border-[#4f46e5] bg-[#4f46e5]/5' : '')}>
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
                                <button type="button" onClick={() => createMutation.mutate(tokenForm)} className="px-4 py-2 rounded-lg text-sm bg-[#4f46e5] text-white hover:bg-[#3730a3]" disabled={!tokenForm.name || !tokenForm.scopes.length || createMutation.isPending}>Create API Key</button>
                            </div>
                        </div>
                    )}
                </Modal>
            ) : null}
        </div>
    );
}
