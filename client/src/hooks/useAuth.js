import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export function useAuth() {
  const { user, accessToken, isAuthenticated, setAuth, logout: storeLogout } = useAuthStore();
  const navigate = useNavigate();

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (_) {}
    storeLogout();
    navigate('/');
    toast.success('Signed out');
  };

  return {
    user,
    accessToken,
    isAuthenticated,
    isAdmin: user?.role === 'admin',
    logout,
  };
}
