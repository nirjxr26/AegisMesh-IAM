import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';

export default function ProfileSettings() {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);

    // Placeholder for future profile update logic
    const handleSave = (e) => {
        e.preventDefault();
        setIsEditing(false);
        // Add API call here when backend supports profile updates
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[#0f1623] mb-2">Profile Details</h1>
                <p className="text-aws-text-dim text-sm">
                    Manage your personal information and account settings.
                </p>
            </div>

            <div className="glass flex flex-col items-center sm:flex-row sm:items-start gap-6 rounded-xl p-6 sm:p-8">
                {/* Avatar Section */}
                <div className="shrink-0">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-aws-orange/20 to-aws-orange/5 border-2 border-aws-orange/20 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer transition-all hover:border-aws-orange/40 shadow-inner">
                        <span className="text-4xl sm:text-5xl font-bold text-aws-orange group-hover:scale-110 transition-transform">
                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </span>
                        <div className="absolute inset-0 bg-black/50 flex flex-col justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[#0f1623] text-xs text-center font-medium">Change Avatar</span>
                        </div>
                    </div>
                </div>

                {/* Info Form */}
                <div className="flex-1 w-full space-y-4">
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="profile-first-name" className="block text-sm font-medium text-aws-text-dim mb-1">
                                    First Name
                                </label>
                                <input
                                    id="profile-first-name"
                                    type="text"
                                    defaultValue={user?.firstName}
                                    disabled={!isEditing}
                                    className="w-full bg-aws-navy-light border border-aws-border rounded-lg px-4 py-2 text-[#0f1623] focus:outline-none focus:border-aws-orange transition-colors disabled:opacity-50"
                                />
                            </div>
                            <div>
                                <label htmlFor="profile-last-name" className="block text-sm font-medium text-aws-text-dim mb-1">
                                    Last Name
                                </label>
                                <input
                                    id="profile-last-name"
                                    type="text"
                                    defaultValue={user?.lastName}
                                    disabled={!isEditing}
                                    className="w-full bg-aws-navy-light border border-aws-border rounded-lg px-4 py-2 text-[#0f1623] focus:outline-none focus:border-aws-orange transition-colors disabled:opacity-50"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="profile-email" className="block text-sm font-medium text-aws-text-dim mb-1">
                                Email Address
                            </label>
                            <input
                                id="profile-email"
                                type="email"
                                defaultValue={user?.email}
                                disabled
                                className="w-full bg-aws-navy-light/50 border border-transparent rounded-lg px-4 py-2 text-aws-text-dim cursor-not-allowed"
                            />
                            <p className="text-xs text-aws-text-dim mt-1 flex items-center gap-1">
                                ℹ️ <span className="text-aws-text-dim/80">Email changes must be verified. Contact admin.</span>
                            </p>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-aws-border/50">
                            {isEditing ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(false)}
                                        className="px-4 py-2 rounded-lg text-sm font-medium border border-aws-border text-aws-text hover:text-[#0f1623] hover:bg-aws-navy transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 rounded-lg text-sm font-medium bg-aws-orange text-black font-semibold hover:bg-aws-orange-dark transition-colors shadow-lg shadow-aws-orange/20"
                                    >
                                        Save Changes
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setIsEditing(true);
                                    }}
                                    className="px-4 py-2 rounded-lg text-sm font-medium border border-aws-border text-aws-text hover:border-aws-orange/30 hover:text-[#0f1623] hover:bg-aws-navy transition-colors flex items-center gap-2"
                                >
                                    <span>✏️</span> Edit Profile
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>

            {/* Account Details */}
            <div className="glass rounded-xl p-6 sm:p-8">
                <h2 className="text-lg font-bold text-[#0f1623] mb-4">Account Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="p-4 bg-aws-navy-light rounded-lg border border-transparent hover:border-aws-border/50 transition-colors">
                        <div className="text-sm text-aws-text-dim mb-1">Account Status</div>
                        <div className="flex items-center gap-2 font-medium">
                            <div className={`w-2 h-2 rounded-full ${user?.status === 'ACTIVE' ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-aws-red shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}></div>
                            <span className={user?.status === 'ACTIVE' ? 'text-green-400' : 'text-aws-red'}>
                                {user?.status}
                            </span>
                        </div>
                    </div>

                    <div className="p-4 bg-aws-navy-light rounded-lg border border-transparent hover:border-aws-border/50 transition-colors">
                        <div className="text-sm text-aws-text-dim mb-1">Member Since</div>
                        <div className="text-[#0f1623] font-medium flex items-center gap-2">
                            📅 {new Date(user?.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="border border-aws-red/20 bg-aws-red/5 rounded-xl p-6 sm:p-8">
                <h2 className="text-lg font-bold text-aws-red mb-2 text-shadow-red">Danger Zone</h2>
                <p className="text-sm text-aws-text-dim mb-4">
                    Once you delete your account, there is no going back. Please be certain.
                </p>
                <button
                    type="button"
                    className="px-4 py-2 rounded-lg text-sm font-medium border border-aws-red/30 text-aws-red hover:bg-aws-red hover:text-white transition-all hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                >
                    Delete Account
                </button>
            </div>
        </div>
    );
}


