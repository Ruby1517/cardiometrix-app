import { apiPost } from './http';
import { User } from './types';

type LoginRequest = {
  email: string;
  password: string;
};

type LoginResponse = {
  token: string;
  user: User;
};

const USE_STUB = process.env.EXPO_PUBLIC_USE_STUB === 'true';

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  if (USE_STUB) {
    return {
      token: 'stub-token',
      user: {
        id: 'stub-user',
        name: 'Demo User',
        email: payload.email,
        role: 'patient',
      },
    };
  }
  return apiPost<LoginResponse>('/api/auth/login', payload);
}

type RegisterRequest = {
  name: string;
  email: string;
  password: string;
};

export async function register(payload: RegisterRequest): Promise<LoginResponse> {
  if (USE_STUB) {
    return {
      token: 'stub-register-token',
      user: {
        id: 'stub-user',
        name: payload.name,
        email: payload.email,
        role: 'patient',
      },
    };
  }
  return apiPost<LoginResponse>('/api/auth/register', payload);
}

export async function loginWithGoogle(idToken: string): Promise<LoginResponse> {
  if (USE_STUB) {
    return {
      token: 'stub-google-token',
      user: {
        id: 'stub-user',
        name: 'Demo Google User',
        email: 'google@example.com',
        role: 'patient',
      },
    };
  }
  return apiPost<LoginResponse>('/api/auth/google/mobile', { idToken });
}

export async function logout(): Promise<void> {
  if (USE_STUB) return;
  await apiPost('/api/auth/logout');
}
