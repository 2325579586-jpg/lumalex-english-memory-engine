import { create } from "zustand";
import { getCurrentSession, loginAccount, logoutAccount, registerAccount, syncLegacyLocalAccountToBackend } from "@/services/auth-service";
import type { AuthSession } from "@/types/domain";

type AuthStatus = "unknown" | "authenticated" | "guest";

type AuthStoreState = {
  status: AuthStatus;
  session: AuthSession | null;
  loading: boolean;
  hydrate: () => void;
  register: (username: string, password: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

export const useAuthStore = create<AuthStoreState>((set) => ({
  status: "unknown",
  session: null,
  loading: false,
  hydrate: () => {
    const session = getCurrentSession();
    if (session) {
      void syncLegacyLocalAccountToBackend(session.userId)
        .then((syncedSession) => {
          if (syncedSession) set({ session: syncedSession, status: "authenticated" });
        })
        .catch(() => undefined);
    }
    set({
      session,
      status: session ? "authenticated" : "guest",
    });
  },
  register: async (username, password) => {
    set({ loading: true });
    try {
      await registerAccount(username, password);
      set({ loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
  login: async (username, password) => {
    set({ loading: true });
    try {
      const session = await loginAccount(username, password);
      set({
        session,
        status: "authenticated",
        loading: false,
      });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
  logout: () => {
    logoutAccount();
    set({
      session: null,
      status: "guest",
      loading: false,
    });
  },
}));
