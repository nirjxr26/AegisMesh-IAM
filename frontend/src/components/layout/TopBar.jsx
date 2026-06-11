import { useEffect, useRef, useState } from 'react';
import { LogOut, Menu, MoreVertical, Search, Settings, Shield } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import NotificationBell from '../notifications/NotificationBell';
import PropTypes from 'prop-types';

export default function TopBar({ onMenuClick, onOpenSettings, onSignOut }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const mobileMenuRef = useRef(null);
    const location = useLocation();
    const isDashboard = location.pathname === '/dashboard';

    useEffect(() => {
        if (!mobileMenuOpen) {
            return undefined;
        }

        const handleClickAway = (event) => {
            if (!mobileMenuRef.current?.contains(event.target)) {
                setMobileMenuOpen(false);
            }
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setMobileMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickAway);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickAway);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [mobileMenuOpen]);

    const handleOpenSettings = () => {
        setMobileMenuOpen(false);
        onOpenSettings?.();
    };

    const handleSignOut = () => {
        setMobileMenuOpen(false);
        onSignOut?.();
    };

    return (
        <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-white/5 bg-[#10141C] px-4 md:px-6 backdrop-blur-md">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3 animate-in fade-in duration-300">
                <button
                    type="button"
                    onClick={onMenuClick}
                    className="mr-1 rounded-lg p-2.5 text-white/40 transition-colors hover:bg-white/5 hover:text-white lg:hidden"
                    aria-label="Open navigation menu"
                >
                    <Menu size={20} />
                </button>

                {isDashboard ? (
                    <div className="flex flex-col min-w-0 justify-center">
                        <div className="flex items-center gap-2">
                            <span className="text-base md:text-lg font-bold tracking-tight text-white/95 flex items-center gap-2 truncate">
                                <Shield className="text-indigo-500 shrink-0" size={16} />
                                <span className="truncate">Security Operations Center</span>
                            </span>
                        </div>
                        <span className="hidden md:block text-[10px] text-white/30 font-medium truncate mt-0.5 tracking-wide uppercase">
                            Real-time identity threat detection & access pulse
                        </span>
                    </div>
                ) : (
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-sm font-black text-indigo-400 border border-indigo-500/20">
                            A
                        </div>
                        <span className="hidden truncate text-sm font-bold tracking-tight text-white/90 sm:block md:text-base">
                            AegisMesh Intelligence
                        </span>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
                <button
                    type="button"
                    aria-label="Search"
                    className="hidden h-9 w-40 items-center gap-2 rounded-lg border border-white/5 bg-[#0F1117] px-3 text-xs text-white/30 transition-colors hover:bg-white/10 md:flex lg:w-48"
                >
                    <Search size={13} />
                    <span className="text-white/40">Search...</span>
                    <kbd className="ml-auto hidden rounded border border-white/10 bg-[#161B26] px-1.5 py-0.5 text-[9px] font-bold text-white/20 lg:inline-flex">
                        ⌘K
                    </kbd>
                </button>

                <NotificationBell />

                <span className="hidden h-5 w-px bg-white/5 sm:block" />

                <button
                    type="button"
                    onClick={handleOpenSettings}
                    className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-widest text-white/40 transition-colors hover:bg-white/5 hover:text-white sm:flex"
                >
                    <Settings size={14} />
                    <span>Settings</span>
                </button>

                <span className="hidden h-5 w-px bg-white/5 sm:block" />

                <button
                    type="button"
                    onClick={handleSignOut}
                    className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-widest text-white/30 transition-colors hover:bg-red-500/10 hover:text-red-400 sm:flex"
                >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                </button>

                <div className="relative sm:hidden" ref={mobileMenuRef}>
                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen((current) => !current)}
                        className="rounded-lg p-2.5 text-white/40 transition-colors hover:bg-white/5 hover:text-white"
                        aria-label="Open account menu"
                    >
                        <MoreVertical size={18} />
                    </button>

                    {mobileMenuOpen ? (
                        <div className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-white/10 bg-[#161B26] p-1.5 shadow-2xl backdrop-blur-xl">
                            <button
                                type="button"
                                onClick={handleOpenSettings}
                                className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-bold uppercase tracking-widest text-white/40 transition-colors hover:bg-white/5 hover:text-white"
                            >
                                <Settings size={14} />
                                <span>Settings</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleSignOut}
                                className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-bold uppercase tracking-widest text-red-400/60 transition-colors hover:bg-red-500/10 hover:text-red-400"
                            >
                                <LogOut size={14} />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>
        </header>
    );
}
TopBar.propTypes = {
    onMenuClick: PropTypes.func,
    onOpenSettings: PropTypes.func,
    onSignOut: PropTypes.func,
};