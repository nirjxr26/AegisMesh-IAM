import PropTypes from 'prop-types';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
    const { user, isLoading, loading } = useAuth();
    const location = useLocation();
    const loadingState = isLoading ?? loading;

    if (loadingState) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-aws-dark">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-3 border-aws-orange border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-aws-text-dim text-sm animate-pulse">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children || <Outlet />;
}

ProtectedRoute.propTypes = {
    children: PropTypes.node,
};


