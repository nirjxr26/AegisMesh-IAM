import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

export default function AuthLayout({ children, title, subtitle }) {
    return (
        <div className="relative min-h-screen overflow-hidden bg-aws-dark">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-aws-orange/3 rounded-full blur-[120px]"></div>
                <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-aws-blue/3 rounded-full blur-[120px]"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-aws-orange/2 rounded-full blur-[200px]"></div>
            </div>

            {/* Grid Pattern */}
            <div
                className="absolute inset-0 opacity-[0.02]"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,153,0,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,153,0,0.3) 1px, transparent 1px)`,
                    backgroundSize: '60px 60px',
                }}
            ></div>

            <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
                <div className="hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:px-12 lg:py-12">
                    <Link to="/" className="inline-flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-aws-orange/12 text-lg font-black text-aws-orange">
                            A
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-black">AegisMesh</h1>
                            <p className="mt-1 text-sm text-black/80">Enterprise Identity &amp; Access Management</p>
                        </div>
                    </Link>

                    <div className="max-w-xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-black">Identity Control Surface</p>
                        <h2 className="mt-6 text-5xl font-black leading-[0.95] tracking-tight text-black">
                            Secure every login, session, and access decision.
                        </h2>
                        <p className="mt-6 max-w-lg text-base leading-7 text-black">
                            Operate identity with live audit visibility, adaptive security, and policy controls built for high-trust environments.
                        </p>
                    </div>

                    <p className="text-xs text-black/80">© 2026 AegisMesh · Secure Authentication Platform</p>
                </div>

                <div className="flex w-full items-center justify-center px-6 py-8 lg:w-1/2 lg:px-12 lg:py-12">
                    <div className="w-full max-w-md animate-fade-in-up">
                        <Link to="/" className="mb-6 inline-flex items-center gap-3 lg:hidden">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-aws-orange/12 text-sm font-black text-aws-orange">
                                A
                            </div>
                            <div>
                                <h1 className="text-xl font-black tracking-tight text-black">AegisMesh</h1>
                                <p className="text-xs text-black/80">Enterprise Identity &amp; Access Management</p>
                            </div>
                        </Link>

                        <div className="glass rounded-2xl p-6 py-8 shadow-2xl shadow-black/40 sm:p-8 lg:px-12 lg:py-12">
                            {(title || subtitle) && (
                                <div className="mb-8 text-center">
                                    {title ? <h2 className="mb-2 text-2xl font-bold text-[#0f1623]">{title}</h2> : null}
                                    {subtitle ? <p className="text-sm text-aws-text-dim">{subtitle}</p> : null}
                                </div>
                            )}
                            {children}
                        </div>

                        <p className="mt-6 text-center text-xs text-aws-text-dim lg:hidden">
                            © 2026 AegisMesh · Secure Authentication Platform
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

AuthLayout.propTypes = {
    children: PropTypes.node,
    title: PropTypes.string,
    subtitle: PropTypes.string,
};


