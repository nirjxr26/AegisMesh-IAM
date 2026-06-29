import PropTypes from 'prop-types';
import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { settingsAPI } from '../../../services/api';
import { getInitials } from '../../../utils/formatters';
import { LANG_OPTIONS, TIMEZONE_OPTIONS, Field, CardShell } from './shared';

export default function ProfileTab({ user, onProfileUpdated }) {
    const queryClient = useQueryClient();
    const fileInputRef = useRef(null);

    const [form, setForm] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        jobTitle: user?.jobTitle || '',
        department: user?.department || '',
        timezone: user?.timezone || 'UTC',
        language: user?.language || 'en',
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
        onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to upload avatar'),
    });

    const removeMutation = useMutation({
        mutationFn: () => settingsAPI.deleteAvatar(),
        onSuccess: async () => {
            toast.success('Avatar removed');
            await queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
        },
        onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to remove avatar'),
    });

    const handleSave = () => updateMutation.mutate(form);

    return (
        <div className="w-full space-y-5">
            <CardShell className="p-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
                {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Avatar" className="w-20 h-20 rounded-2xl object-cover" />
                ) : (
                    <div className="w-20 h-20 rounded-2xl bg-[#4f46e5]/10 text-[#4f46e5] text-2xl font-bold flex items-center justify-center">
                        {getInitials(user?.firstName, user?.lastName)}
                    </div>
                )}
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-1.5 text-sm border border-[#d0d7e8] rounded-lg text-[#3a4560] hover:bg-[#f4f6fb]"
                            disabled={uploadMutation.isPending}
                        >
                            Upload Photo
                        </button>
                        {user?.avatarUrl ? (
                            <button type="button" onClick={() => removeMutation.mutate()} className="text-xs text-[#dc2626] hover:underline">Remove</button>
                        ) : null}
                    </div>
                    <p className="text-xs text-[#7a87a8]">JPG, PNG or WebP. Max 2MB.</p>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadMutation.mutate(file); }}
                />
            </CardShell>

            <CardShell className="p-6 space-y-4">
                <div className="pb-3 border-b border-[#f0f2f8]">
                    <h3 className="text-[15px] font-semibold text-[#0f1623]">Personal Information</h3>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="First Name" error={errors.firstName}>
                        <input value={form.firstName} onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))} className="w-full border border-[#d0d7e8] rounded-xl px-3 py-2 text-sm" />
                    </Field>
                    <Field label="Last Name" error={errors.lastName}>
                        <input value={form.lastName} onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))} className="w-full border border-[#d0d7e8] rounded-xl px-3 py-2 text-sm" />
                    </Field>
                    <div className="col-span-2">
                        <label htmlFor="profile-email" className="text-xs text-[#7a87a8] font-medium mb-1 block">Email</label>
                        <div className="relative">
                            <input id="profile-email" value={user?.email || ''} readOnly className="w-full border border-[#d0d7e8] rounded-xl px-3 py-2.5 text-sm bg-[#f4f6fb] cursor-not-allowed pr-20" />
                            <Lock size={14} className="absolute right-12 top-1/2 -translate-y-1/2 text-[#7a87a8]" />
                            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#4f46e5] hover:underline">Change Email</button>
                        </div>
                    </div>
                    <Field label="Job Title">
                        <input value={form.jobTitle} onChange={(e) => setForm((prev) => ({ ...prev, jobTitle: e.target.value }))} className="w-full border border-[#d0d7e8] rounded-xl px-3 py-2 text-sm" />
                    </Field>
                    <Field label="Department">
                        <input value={form.department} onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))} className="w-full border border-[#d0d7e8] rounded-xl px-3 py-2 text-sm" />
                    </Field>
                </div>

                <Field label="Timezone" error={errors.timezone}>
                    <select value={form.timezone} onChange={(e) => setForm((prev) => ({ ...prev, timezone: e.target.value }))} className="w-full border border-[#d0d7e8] rounded-xl px-3 py-2 text-sm bg-white">
                        {TIMEZONE_OPTIONS.map((option) => (<option key={option} value={option}>{option}</option>))}
                    </select>
                </Field>

                <Field label="Language" error={errors.language}>
                    <select value={form.language} onChange={(e) => setForm((prev) => ({ ...prev, language: e.target.value }))} className="w-full border border-[#d0d7e8] rounded-xl px-3 py-2 text-sm bg-white">
                        {LANG_OPTIONS.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
                    </select>
                </Field>

                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setForm({ firstName: user?.firstName || '', lastName: user?.lastName || '', jobTitle: user?.jobTitle || '', department: user?.department || '', timezone: user?.timezone || 'UTC', language: user?.language || 'en' })} className="px-4 py-2 rounded-lg text-sm border border-[#d0d7e8] text-[#3a4560] hover:bg-[#f4f6fb]">Cancel</button>
                    <button type="button" onClick={handleSave} className="px-4 py-2 rounded-lg text-sm bg-[#4f46e5] text-white hover:bg-[#3730a3]" disabled={updateMutation.isPending}>Save Changes</button>
                </div>
            </CardShell>
        </div>
    );
}

ProfileTab.propTypes = {
    user: PropTypes.shape({
        firstName: PropTypes.string,
        lastName: PropTypes.string,
        jobTitle: PropTypes.string,
        department: PropTypes.string,
        timezone: PropTypes.string,
        language: PropTypes.string,
        avatarUrl: PropTypes.string,
        email: PropTypes.string,
    }),
    onProfileUpdated: PropTypes.func,
};
