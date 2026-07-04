import { create } from "zustand";
import type { LoginResponse, UserDTO } from "@portal/shared";
import { api, setAccessToken } from "../lib/api";

interface AuthState {
  user: UserDTO | null;
  status: "loading" | "authenticated" | "anonymous";
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  bootstrap: () => Promise<void>;
  can: (permission: string) => boolean;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  status: "loading",

  login: async (email, password) => {
    const res = await api.post<LoginResponse>("/auth/login", { email, password });
    setAccessToken(res.accessToken);
    set({ user: res.user, status: "authenticated" });
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setAccessToken(null);
      set({ user: null, status: "anonymous" });
    }
  },

  /** Restaura a sessão no load usando o cookie de refresh. */
  bootstrap: async () => {
    try {
      const res = await api.post<LoginResponse>("/auth/refresh");
      setAccessToken(res.accessToken);
      set({ user: res.user, status: "authenticated" });
    } catch {
      set({ user: null, status: "anonymous" });
    }
  },

  can: (permission) => {
    const user = get().user;
    if (!user) return false;
    const [module] = permission.split(":");
    return user.permissions.includes(permission) || user.permissions.includes(`${module}:manage`);
  },
}));
