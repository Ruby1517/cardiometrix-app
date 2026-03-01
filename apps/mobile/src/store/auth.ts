import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import {
  login as apiLogin,
  loginWithGoogle as apiLoginWithGoogle,
  logout as apiLogout,
  register as apiRegister,
} from '../api/auth';
import { setAuthToken } from '../api/token';
import { User } from '../api/types';

const TOKEN_KEY = 'cmx_token';
const USER_KEY = 'cmx_user';

type LogoutOptions = {
  remote?: boolean;
};

type AuthState = {
  token: string | null;
  user: User | null;
  status: 'idle' | 'loading' | 'ready';
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: (options?: LogoutOptions) => Promise<void>;
  restoreSession: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  status: 'idle',
  login: async (email, password) => {
    set({ status: 'loading' });
    const response = await apiLogin({ email, password });
    await SecureStore.setItemAsync(TOKEN_KEY, response.token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(response.user));
    setAuthToken(response.token);
    set({ token: response.token, user: response.user, status: 'ready' });
  },
  register: async (name, email, password) => {
    set({ status: 'loading' });
    const response = await apiRegister({ name, email, password });
    await SecureStore.setItemAsync(TOKEN_KEY, response.token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(response.user));
    setAuthToken(response.token);
    set({ token: response.token, user: response.user, status: 'ready' });
  },
  loginWithGoogle: async (idToken) => {
    set({ status: 'loading' });
    const response = await apiLoginWithGoogle(idToken);
    await SecureStore.setItemAsync(TOKEN_KEY, response.token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(response.user));
    setAuthToken(response.token);
    set({ token: response.token, user: response.user, status: 'ready' });
  },
  logout: async (options = {}) => {
    const { remote = true } = options;
    if (remote) {
      await apiLogout().catch(() => undefined);
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    setAuthToken(null);
    set({ token: null, user: null, status: 'ready' });
  },
  restoreSession: async () => {
    set({ status: 'loading' });
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    const userRaw = await SecureStore.getItemAsync(USER_KEY);
    const user = userRaw ? (JSON.parse(userRaw) as User) : null;
    const envToken = process.env.EXPO_PUBLIC_API_TOKEN;
    const resolvedToken = token ?? envToken ?? null;
    setAuthToken(resolvedToken);
    set({ token: resolvedToken, user, status: 'ready' });
  },
}));
