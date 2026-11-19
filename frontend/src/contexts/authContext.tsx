
import { useState, type ReactNode } from 'react';

import {
  AuthContext,
  type AuthContextType,
} from './auth-context';

import {
  login as loginRequest,
  logout as logoutRequest,
  type AuthUser,
} from '../services/auth.service';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const storedUser = sessionStorage.getItem('user');
      return storedUser ? (JSON.parse(storedUser) as AuthUser) : null;
    } catch {
      return null;
    }
  });

  const signIn = async (
    email: string,
    password: string,
  ): Promise<AuthUser> => {
    const response = await loginRequest(email, password);

    sessionStorage.setItem('accessToken', response.accessToken);
    sessionStorage.setItem('refreshToken', response.refreshToken);
    sessionStorage.setItem('user', JSON.stringify(response.user));

    setUser(response.user);

    return response.user;
  };

  async function signOut(): Promise<void> {
    const refreshToken = sessionStorage.getItem('refreshToken');

    try {
      if (refreshToken) {
        await logoutRequest(refreshToken);
      }
    } finally {
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('refreshToken');
      sessionStorage.removeItem('user');

      setUser(null);
    }
  }

  const contextValue: AuthContextType = {
    user,
    isAuthenticated: user !== null,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
