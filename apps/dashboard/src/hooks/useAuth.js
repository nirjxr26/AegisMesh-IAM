import { useAuth } from '../context/AuthContext';

export default function useAuthHook() {
    return useAuth();
}
