import { useParams } from 'react-router-dom';
import SettingsPage from '../settings/SettingsPage';

export default function SecurityPage() {
    return <SettingsPage initialTabOverride="security" />;
}
