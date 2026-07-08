import React, { createContext, useContext, useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const TOKEN_KEY = "safepass_session_token";

type SafeUser = {
  _id: string;
  name: string;
  username: string;
  pushToken?: string;
  createdAt: number;
};

type AuthContextType = {
  user: SafeUser | null;
  sessionToken: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (name: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const loginMutation = useMutation(api.auth.login);
  const registerMutation = useMutation(api.auth.register);
  const logoutMutation = useMutation(api.auth.logout);

  // Reactively fetches the user whenever sessionToken changes
  const user = useQuery(
    api.auth.getMe,
    sessionToken !== null ? { sessionToken } : "skip"
  );

  // On mount: restore token from secure storage
  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY)
      .then((token) => {
        if (token) setSessionToken(token);
      })
      .finally(() => setIsBootstrapping(false));
  }, []);

  const login = async (username: string, password: string) => {
    const { token } = await loginMutation({ username, password });
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    setSessionToken(token);
  };

  const register = async (name: string, username: string, password: string) => {
    const { token } = await registerMutation({ name, username, password });
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    setSessionToken(token);
  };

  const logout = async () => {
    if (sessionToken) {
      await logoutMutation({ sessionToken });
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setSessionToken(null);
  };

  const isLoading = isBootstrapping || (sessionToken !== null && user === undefined);

  return (
    <AuthContext.Provider
      value={{
        user: (user as SafeUser) ?? null,
        sessionToken,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}