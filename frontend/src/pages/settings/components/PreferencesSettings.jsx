import { useState } from 'react';

export default function PreferencesSettings() {
    const [theme, setTheme] = useState('dark');
    const [notifications, setNotifications] = useState({
        emailAlerts: true,
        sessionChanges: true,
        marketing: false
    });

    const handleNotificationChange = (key) => {
        setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[#0f1623] mb-2">Preferences</h1>
                <p className="text-aws-text-dim text-sm">
                    Customize your experience and notification settings.
                </p>
            </div>

            <div className="glass rounded-xl p-6 sm:p-8 space-y-8">
                {/* Theme Selection */}
                <section>
                    <h2 className="text-lg font-bold text-[#0f1623] mb-4 flex items-center gap-2">
                        <span>🎨</span> Appearance
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <button
                            onClick={() => setTheme('light')}
                            className={`p-4 rounded-xl border flex gap-3 items-center justify-center transition-all ${theme === 'light'
                                    ? 'bg-aws-orange/10 border-aws-orange text-aws-orange shadow-[0_0_15px_rgba(255,153,0,0.1)]'
                                    : 'bg-aws-navy-light text-aws-text border-aws-border hover:border-aws-orange/30'
                                }`}
                        >
                            <span className="text-xl">☀️</span>
                            <span className="font-medium">Light</span>
                        </button>

                        <button
                            onClick={() => setTheme('dark')}
                            className={`p-4 rounded-xl border flex gap-3 items-center justify-center transition-all ${theme === 'dark'
                                    ? 'bg-aws-orange/10 border-aws-orange text-aws-orange shadow-[0_0_15px_rgba(255,153,0,0.1)]'
                                    : 'bg-aws-navy-light text-aws-text border-aws-border hover:border-aws-orange/30'
                                }`}
                        >
                            <span className="text-xl">🌙</span>
                            <span className="font-medium">Dark</span>
                        </button>

                        <button
                            onClick={() => setTheme('system')}
                            className={`p-4 rounded-xl border flex gap-3 items-center justify-center transition-all ${theme === 'system'
                                    ? 'bg-aws-orange/10 border-aws-orange text-aws-orange shadow-[0_0_15px_rgba(255,153,0,0.1)]'
                                    : 'bg-aws-navy-light text-aws-text border-aws-border hover:border-aws-orange/30'
                                }`}
                        >
                            <span className="text-xl">💻</span>
                            <span className="font-medium">System</span>
                        </button>
                    </div>
                    <p className="text-xs text-aws-text-dim mt-3">
                        * Note: Dark mode is the primary theme for this application.
                    </p>
                </section>

                <div className="h-px bg-aws-border/50 w-full my-6"></div>

                {/* Notifications */}
                <section>
                    <h2 className="text-lg font-bold text-[#0f1623] mb-4 flex items-center gap-2">
                        <span>🔔</span> Notifications
                    </h2>
                    <div className="space-y-4">

                        <label htmlFor="email-alerts" className="flex items-center justify-between p-4 bg-aws-navy-light rounded-lg border border-transparent hover:border-aws-border/50 cursor-pointer transition-colors group">
                            <div>
                                <h3 className="text-[#0f1623] font-medium mb-1">Security Alerts</h3>
                                <p className="text-xs text-aws-text-dim">Get notified about important security events</p>
                            </div>
                            <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifications.emailAlerts ? 'bg-aws-orange' : 'bg-gray-600'}`}>
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={notifications.emailAlerts}
                                    onChange={() => handleNotificationChange('emailAlerts')}
                                />
                                <span className={`inline-block h-4 w-4 transform bg-white rounded-full transition-transform ${notifications.emailAlerts ? 'translate-x-6' : 'translate-x-1'}`} />
                            </div>
                        </label>

                        <label className="flex items-center justify-between p-4 bg-aws-navy-light rounded-lg border border-transparent hover:border-aws-border/50 cursor-pointer transition-colors group">
                            <div>
                                <h3 className="text-[#0f1623] font-medium mb-1">Session Activity</h3>
                                <p className="text-xs text-aws-text-dim">Emails when a new device logs into your account</p>
                            </div>
                            <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifications.sessionChanges ? 'bg-aws-orange' : 'bg-gray-600'}`}>
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={notifications.sessionChanges}
                                    onChange={() => handleNotificationChange('sessionChanges')}
                                />
                                <span className={`inline-block h-4 w-4 transform bg-white rounded-full transition-transform ${notifications.sessionChanges ? 'translate-x-6' : 'translate-x-1'}`} />
                            </div>
                        </label>

                        <label className="flex items-center justify-between p-4 bg-aws-navy-light rounded-lg border border-transparent hover:border-aws-border/50 cursor-pointer transition-colors group">
                            <div>
                                <h3 className="text-[#0f1623] font-medium mb-1">Marketing Emails</h3>
                                <p className="text-xs text-aws-text-dim">Receive updates, tips, and promotional content</p>
                            </div>
                            <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifications.marketing ? 'bg-aws-orange' : 'bg-gray-600'}`}>
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={notifications.marketing}
                                    onChange={() => handleNotificationChange('marketing')}
                                />
                                <span className={`inline-block h-4 w-4 transform bg-white rounded-full transition-transform ${notifications.marketing ? 'translate-x-6' : 'translate-x-1'}`} />
                            </div>
                        </label>

                    </div>
                </section>

                <div className="flex justify-end pt-4 border-t border-aws-border/50">
                    <button className="px-4 py-2 rounded-lg text-sm font-medium bg-aws-orange text-black font-semibold hover:bg-aws-orange-dark transition-colors shadow-lg shadow-aws-orange/20">
                        Save Preferences
                    </button>
                </div>
            </div>
        </div>
    );
}


ark transition-colors shadow-lg shadow-aws-orange/20">
                        Save Preferences
                    </button>
                </div>
            </div>
        </div>
    );
}


