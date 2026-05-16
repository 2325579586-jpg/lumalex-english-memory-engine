import { useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { useAuthStore } from "@/stores/auth-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useUiStore } from "@/stores/ui-store";
import { flushCloudDataSync, syncCloudData } from "@/services/cloud-sync-service";
import { readStorage, writeStorage } from "@/services/storage";

const NOTIFICATION_SETTINGS_KEY = "notification-settings";
const NOTIFICATION_LAST_SENT_KEY = "notification-last-sent-day";

export function useAppBootstrap() {
  const bootstrap = useAppStore((state) => state.bootstrap);
  const bootstrapStatus = useAppStore((state) => state.bootstrapStatus);
  const bootstrapError = useAppStore((state) => state.bootstrapError);
  const resetBootstrap = useAppStore((state) => state.reset);
  const hydrateSettings = useSettingsStore((state) => state.hydrate);
  const resetSettings = useSettingsStore((state) => state.reset);
  const settings = useSettingsStore((state) => state.settings);
  const authStatus = useAuthStore((state) => state.status);
  const session = useAuthStore((state) => state.session);
  const setMode = useUiStore((state) => state.setMode);
  const setLanguage = useUiStore((state) => state.setLanguage);

  useEffect(() => {
    if (authStatus !== "authenticated" || !session) {
      resetBootstrap();
      resetSettings();
      return;
    }
    bootstrap().then(() => hydrateSettings()).catch(() => undefined);
  }, [authStatus, bootstrap, hydrateSettings, resetBootstrap, resetSettings, session]);

  useEffect(() => {
    if (authStatus !== "authenticated") {
      return;
    }
    setMode(settings.uiMode);
    setLanguage(settings.language);
    document.documentElement.classList.toggle("theme-light", settings.theme === "light");
    document.documentElement.classList.toggle("theme-dark", settings.theme !== "light");
  }, [authStatus, settings.language, settings.theme, settings.uiMode, setLanguage, setMode]);

  useEffect(() => {
    if (authStatus !== "authenticated" || !session) {
      return;
    }

    const syncNow = () => {
      void syncCloudData({ pushFirst: true }).catch(() => undefined);
    };
    const syncWhenVisible = () => {
      if (document.visibilityState === "visible") {
        syncNow();
      }
    };
    const syncWhenHidden = () => {
      if (document.visibilityState === "hidden") {
        flushCloudDataSync();
      }
    };
    const syncOnPageHide = () => {
      flushCloudDataSync();
    };

    window.addEventListener("focus", syncNow);
    window.addEventListener("online", syncNow);
    document.addEventListener("visibilitychange", syncWhenVisible);
    document.addEventListener("visibilitychange", syncWhenHidden);
    window.addEventListener("pagehide", syncOnPageHide);
    const interval = window.setInterval(syncNow, 60_000);

    return () => {
      window.removeEventListener("focus", syncNow);
      window.removeEventListener("online", syncNow);
      document.removeEventListener("visibilitychange", syncWhenVisible);
      document.removeEventListener("visibilitychange", syncWhenHidden);
      window.removeEventListener("pagehide", syncOnPageHide);
      window.clearInterval(interval);
    };
  }, [authStatus, session]);

  useEffect(() => {
    if (authStatus !== "authenticated" || typeof Notification === "undefined") {
      return;
    }

    const checkReminder = () => {
      const prefs = readStorage<{ enabled: boolean; time: string }>(NOTIFICATION_SETTINGS_KEY, {
        enabled: false,
        time: "20:30",
      });
      if (!prefs.enabled || Notification.permission !== "granted") return;

      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const todayKey = now.toISOString().slice(0, 10);
      const lastSentDay = readStorage<string | null>(NOTIFICATION_LAST_SENT_KEY, null);
      if (currentTime === prefs.time && lastSentDay !== todayKey) {
        new Notification("LumaLex 学习提醒", { body: "到时间回顾今天的单词了。" });
        writeStorage(NOTIFICATION_LAST_SENT_KEY, todayKey);
      }
    };

    checkReminder();
    const interval = window.setInterval(checkReminder, 60_000);
    return () => window.clearInterval(interval);
  }, [authStatus]);

  return { bootstrapStatus, bootstrapError };
}
