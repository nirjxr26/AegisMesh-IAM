import ConnectedApps from '../../../components/security/ConnectedApps';

export default function ConnectedAppsTab() {
    return (
        <div className="w-full">
            <div className="mb-5">
                <h3 className="text-[18px] font-bold text-[#0f172a]">Connected Apps</h3>
                <p className="mt-1 text-[13px] text-[#64748b]">Apps and API tokens with access to your account</p>
            </div>
            <ConnectedApps />
        </div>
    );
}
