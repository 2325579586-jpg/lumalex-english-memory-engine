import { Bell, Cloud, Download, Eye, LogOut, RefreshCcw, Settings, Upload, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCloudSyncStatus } from "@/hooks/use-cloud-sync-status";
import { cn } from "@/lib/utils";
import { getLastCloudSyncedAt, syncCloudData } from "@/services/cloud-sync-service";
import {
  clearLocalData,
  exportAllData,
  importDataPayload,
  readImportFile,
  type ImportPreview,
} from "@/services/data-maintenance-service";
import { readStorage, writeStorage } from "@/services/storage";
import { useAuthStore } from "@/stores/auth-store";
import { useSettingsStore } from "@/stores/settings-store";

const NOTIFICATION_SETTINGS_KEY = "notification-settings";
const DEFAULT_REVIEW_MODE_KEY = "default-review-mode";

const groups = [
  "账号与同步",
  "学习设置",
  "界面设置",
  "发音设置",
  "AI 设置",
  "数据设置",
  "通知设置",
] as const;

type Group = (typeof groups)[number];

type NotificationSettings = {
  enabled: boolean;
  time: string;
};

type ImportDraft = {
  fileName: string;
  payload: Record<string, unknown>;
  preview: ImportPreview;
};

function formatSyncTime(value?: number) {
  if (!value) return "尚未同步";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function downloadJson(payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `lumalex-export-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function formatImportSummary(preview: ImportPreview) {
  const formatLabel = preview.format === "legacy_progress" ? "旧版本地进度" : "新版导出文件";
  return `${formatLabel}，预计导入 ${preview.decks} 个词库、${preview.words} 条词条、${preview.learnRecords} 条学习记录、${preview.reviewRecords} 条复习记录、${preview.sessions} 条会话记录。`;
}

export function SettingsPage() {
  const [active, setActive] = useState<Group>(groups[0]);
  const { settings, updateSettings, reset: resetSettings, hydrate: hydrateSettings } = useSettingsStore();
  const { session, logout } = useAuthStore();
  const [message, setMessage] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | undefined>();
  const [importDraft, setImportDraft] = useState<ImportDraft | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(() =>
    readStorage<NotificationSettings>(NOTIFICATION_SETTINGS_KEY, { enabled: false, time: "20:30" }),
  );
  const [defaultReviewMode, setDefaultReviewMode] = useState<"en_to_zh" | "zh_to_en">(() =>
    readStorage<"en_to_zh" | "zh_to_en">(DEFAULT_REVIEW_MODE_KEY, "en_to_zh"),
  );
  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const syncState = useCloudSyncStatus();

  useEffect(() => {
    getLastCloudSyncedAt().then(setLastSyncedAt).catch(() => undefined);
  }, []);

  async function refreshSyncedAt() {
    setLastSyncedAt(await getLastCloudSyncedAt());
  }

  async function handleManualSync() {
    setMessage("");
    setSyncing(true);
    try {
      await syncCloudData({ pushFirst: true });
      await refreshSyncedAt();
      resetSettings(session?.userId);
      await hydrateSettings();
      setMessage("云端同步完成，手机端和电脑端会使用同一份账号数据、词库和学习记录。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "同步失败，请稍后重试。");
    } finally {
      setSyncing(false);
    }
  }

  async function handleLogout() {
    setMessage("");
    try {
      await syncCloudData({ pushFirst: true }).catch(() => undefined);
    } finally {
      logout();
    }
  }

  async function handleExport() {
    const payload = await exportAllData();
    downloadJson(payload);
    setMessage("本地学习数据已导出。");
  }

  async function handleReadImportFile(file?: File | null) {
    if (!file) return;
    setMessage("");
    try {
      const result = await readImportFile(file);
      setImportDraft({
        fileName: file.name,
        payload: result.payload,
        preview: result.preview,
      });
    } catch (error) {
      setImportDraft(null);
      setMessage(error instanceof Error ? error.message : "导入预览失败，请检查文件格式。");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleConfirmImport() {
    if (!importDraft) return;
    setMessage("");
    setImporting(true);
    try {
      const summary = await importDataPayload(importDraft.payload);
      await handleManualSync();
      setImportDraft(null);
      setMessage(
        `导入完成：词库 ${summary.decks} 个，词条 ${summary.words} 条，学习记录 ${summary.learnRecords} 条，复习记录 ${summary.reviewRecords} 条，会话 ${summary.sessions} 条。`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "导入失败，请稍后重试。");
    } finally {
      setImporting(false);
    }
  }

  async function handleClearAndRebuild() {
    if (!window.confirm("确认清空当前设备上的本地缓存并重新初始化吗？云端账号数据不会被删除。")) {
      return;
    }
    await clearLocalData();
    await handleManualSync();
    window.location.reload();
  }

  async function handleEnableNotifications() {
    if (typeof Notification === "undefined") {
      setMessage("当前浏览器不支持系统通知。");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    const next = { ...notificationSettings, enabled: permission === "granted" };
    setNotificationSettings(next);
    writeStorage(NOTIFICATION_SETTINGS_KEY, next);
    setMessage(permission === "granted" ? "通知已开启。应用打开时会按你的提醒时间提示学习。" : "通知权限未开启。");
  }

  function updateNotificationSettings(patch: Partial<NotificationSettings>) {
    const next = { ...notificationSettings, ...patch };
    setNotificationSettings(next);
    writeStorage(NOTIFICATION_SETTINGS_KEY, next);
  }

  function updateDefaultReviewMode(value: "en_to_zh" | "zh_to_en") {
    setDefaultReviewMode(value);
    writeStorage(DEFAULT_REVIEW_MODE_KEY, value);
    setMessage("默认复习模式已保存。");
  }

  const content = useMemo(() => {
    if (active === "账号与同步") {
      return (
        <section className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-3xl border border-border/70 bg-panel/60 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <UserRound className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">当前账号</p>
                <h2 className="text-xl font-semibold">{session?.username || "未登录"}</h2>
              </div>
            </div>
            <div className="mt-5 grid gap-3 text-sm">
              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-muted-foreground">账号 ID</p>
                <p className="mt-1 break-all font-medium">{session?.userId || "-"}</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-muted-foreground">最近云同步</p>
                <p className="mt-1 font-medium">{formatSyncTime(lastSyncedAt)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border/70 bg-panel/60 p-5">
            <div className="flex items-center gap-3">
              <Cloud className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">跨设备同步</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  词库、学习记录、复习进度、设置和进行中的会话都会跟随账号同步。
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Button disabled={syncing} onClick={() => void handleManualSync()}>
                <RefreshCcw className="h-4 w-4" />
                {syncing ? "同步中..." : "立即同步"}
              </Button>
              <Button variant="outline" onClick={() => void handleLogout()}>
                <LogOut className="h-4 w-4" />
                退出账号
              </Button>
            </div>
          </div>
        </section>
      );
    }

    if (active === "学习设置") {
      return (
        <section className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">每日新词目标</label>
            <Input type="number" min={1} max={100} value={settings.dailyNewWordTarget} onChange={(event) => updateSettings({ dailyNewWordTarget: Number(event.target.value) || 20 })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">每日复习目标</label>
            <Input type="number" min={1} max={200} value={settings.dailyReviewTarget} onChange={(event) => updateSettings({ dailyReviewTarget: Number(event.target.value) || 40 })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">首次复习延迟（分钟）</label>
            <Input type="number" min={1} value={settings.firstReviewDelayMinutes} onChange={(event) => updateSettings({ firstReviewDelayMinutes: Number(event.target.value) || 10 })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">默认复习模式</label>
            <select value={defaultReviewMode} onChange={(event) => updateDefaultReviewMode(event.target.value as "en_to_zh" | "zh_to_en")} className="h-11 w-full rounded-2xl border border-border bg-panel px-4 text-sm">
              <option value="en_to_zh">英文到中文</option>
              <option value="zh_to_en">中文到英文</option>
            </select>
          </div>
        </section>
      );
    }

    if (active === "界面设置") {
      return (
        <section className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">界面模式</label>
            <select value={settings.uiMode} onChange={(event) => updateSettings({ uiMode: event.target.value as "focus" | "full" })} className="h-11 w-full rounded-2xl border border-border bg-panel px-4 text-sm">
              <option value="full">完整模式</option>
              <option value="focus">专注模式</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">语言</label>
            <select value={settings.language} onChange={(event) => updateSettings({ language: event.target.value as "zh" | "en" })} className="h-11 w-full rounded-2xl border border-border bg-panel px-4 text-sm">
              <option value="zh">中文</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">主题</label>
            <select value={settings.theme} onChange={(event) => updateSettings({ theme: event.target.value as "dark" | "light" })} className="h-11 w-full rounded-2xl border border-border bg-panel px-4 text-sm">
              <option value="dark">深色模式</option>
              <option value="light">浅色模式</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">默认显示记忆提示</label>
            <select value={String(settings.showMemoryHint)} onChange={(event) => updateSettings({ showMemoryHint: event.target.value === "true" })} className="h-11 w-full rounded-2xl border border-border bg-panel px-4 text-sm">
              <option value="true">开启</option>
              <option value="false">关闭</option>
            </select>
          </div>
        </section>
      );
    }

    if (active === "发音设置") {
      return (
        <section className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">偏好口音</label>
            <select value={settings.preferredAccent} onChange={(event) => updateSettings({ preferredAccent: event.target.value as "uk" | "us" })} className="h-11 w-full rounded-2xl border border-border bg-panel px-4 text-sm">
              <option value="uk">英音</option>
              <option value="us">美音</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">自动播放发音</label>
            <select value={String(settings.autoPlayPronunciation)} onChange={(event) => updateSettings({ autoPlayPronunciation: event.target.value === "true" })} className="h-11 w-full rounded-2xl border border-border bg-panel px-4 text-sm">
              <option value="false">关闭</option>
              <option value="true">开启</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">自动播放例句发音</label>
            <select
              value={String(settings.autoPlayExampleSentence)}
              onChange={(event) => updateSettings({ autoPlayExampleSentence: event.target.value === "true" })}
              className="h-11 w-full rounded-2xl border border-border bg-panel px-4 text-sm"
            >
              <option value="false">关闭</option>
              <option value="true">开启</option>
            </select>
          </div>
        </section>
      );
    }

    if (active === "AI 设置") {
      return (
        <section className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">学习辅助信息</label>
            <select value={String(settings.showMemoryHint)} onChange={(event) => updateSettings({ showMemoryHint: event.target.value === "true" })} className="h-11 w-full rounded-2xl border border-border bg-panel px-4 text-sm">
              <option value="true">显示 AI 记忆提示</option>
              <option value="false">隐藏 AI 记忆提示</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">例句默认状态</label>
            <select value={String(settings.showExampleByDefault)} onChange={(event) => updateSettings({ showExampleByDefault: event.target.value === "true" })} className="h-11 w-full rounded-2xl border border-border bg-panel px-4 text-sm">
              <option value="true">默认展开</option>
              <option value="false">默认折叠</option>
            </select>
          </div>
        </section>
      );
    }

    if (active === "数据设置") {
      return (
        <section className="space-y-5">
          <div className="grid gap-3 md:grid-cols-4">
            <Button variant="secondary" onClick={() => void handleExport()}>
              <Download className="h-4 w-4" />
              导出学习数据
            </Button>
            <Button variant="secondary" disabled={syncing} onClick={() => void handleManualSync()}>
              <RefreshCcw className="h-4 w-4" />
              云端同步
            </Button>
            <Button variant="secondary" disabled={importing} onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              {importing ? "导入中..." : "导入旧数据"}
            </Button>
            <Button variant="outline" onClick={() => void handleClearAndRebuild()}>
              清空本机缓存并重建
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(event) => void handleReadImportFile(event.target.files?.[0])}
          />

          <div className="rounded-2xl border border-border/70 bg-panel/60 p-4 text-sm leading-6 text-muted-foreground">
            当前支持导入两类文件：
            <br />
            1. 本应用“导出学习数据”生成的 JSON 文件
            <br />
            2. 旧版本本地存储导出的 <code>lumalex-progress-v3</code> JSON
            <br />
            导入后会先显示预览，再由你确认是否真正写入当前账号。
          </div>

          {importDraft && (
            <div className="rounded-3xl border border-primary/30 bg-primary/5 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-primary">
                    <Eye className="h-4 w-4" />
                    <p className="text-sm font-medium">导入预览</p>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold">{importDraft.fileName}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{formatImportSummary(importDraft.preview)}</p>
                </div>
                <Badge variant="muted">{importDraft.preview.format === "legacy_progress" ? "旧版进度文件" : "新版导出文件"}</Badge>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-sm text-muted-foreground">词库</p>
                  <p className="mt-2 text-2xl font-semibold">{importDraft.preview.decks}</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-sm text-muted-foreground">词条</p>
                  <p className="mt-2 text-2xl font-semibold">{importDraft.preview.words}</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-sm text-muted-foreground">记录</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {importDraft.preview.learnRecords + importDraft.preview.reviewRecords + importDraft.preview.sessions}
                  </p>
                </div>
              </div>

              {importDraft.preview.deckNames.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium">将要涉及的词库</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {importDraft.preview.deckNames.map((deckName) => (
                      <Badge key={deckName} variant="muted">
                        {deckName}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                <Button disabled={importing} onClick={() => void handleConfirmImport()}>
                  <Upload className="h-4 w-4" />
                  {importing ? "正在导入..." : "确认导入到当前账号"}
                </Button>
                <Button variant="outline" disabled={importing} onClick={() => setImportDraft(null)}>
                  取消
                </Button>
              </div>
            </div>
          )}
        </section>
      );
    }

    return (
      <section className="grid gap-5 md:grid-cols-2">
        <div className="rounded-3xl border border-border/70 bg-panel/60 p-5">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">学习提醒</p>
              <p className="mt-1 text-sm text-muted-foreground">浏览器通知权限：{notificationPermission}</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            <Button variant="secondary" onClick={() => void handleEnableNotifications()}>
              开启通知权限
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (typeof Notification !== "undefined" && Notification.permission === "granted") {
                  new Notification("LumaLex 学习提醒", { body: "到时间回顾今天的单词了。" });
                } else {
                  setMessage("请先开启通知权限。");
                }
              }}
            >
              发送测试提醒
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">每日提醒时间</label>
          <Input type="time" value={notificationSettings.time} onChange={(event) => updateNotificationSettings({ time: event.target.value })} />
          <div className="flex items-center gap-2 pt-2">
            <input
              id="notification-enabled"
              type="checkbox"
              checked={notificationSettings.enabled}
              onChange={(event) => updateNotificationSettings({ enabled: event.target.checked })}
            />
            <label htmlFor="notification-enabled" className="text-sm text-muted-foreground">
              应用打开时启用学习提醒
            </label>
          </div>
        </div>
      </section>
    );
  }, [
    active,
    defaultReviewMode,
    hydrateSettings,
    importDraft,
    importing,
    lastSyncedAt,
    notificationPermission,
    notificationSettings,
    resetSettings,
    session,
    settings,
    syncing,
    updateSettings,
  ]);

  return (
    <div className="grid gap-5 pb-4 xl:grid-cols-[280px_1fr] xl:gap-6">
      <Card className="h-fit">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>设置</CardTitle>
              <CardDescription>账号、同步、学习节奏和设备偏好都集中在这里。</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="scrollbar-subtle flex gap-2 overflow-x-auto xl:block xl:space-y-2">
            {groups.map((group) => (
              <button
                key={group}
                type="button"
                onClick={() => setActive(group)}
                className={cn(
                  "flex shrink-0 items-center rounded-2xl px-4 py-3 text-left text-sm font-medium transition-all xl:w-full",
                  active === group ? "bg-white text-slate-950" : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                )}
              >
                {group}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{active}</CardTitle>
              <CardDescription>手机端也可以完整管理账号、同步和学习偏好。</CardDescription>
            </div>
            <Badge
              variant={
                syncState.status === "error"
                  ? "warning"
                  : syncState.status === "success"
                    ? "default"
                    : syncState.status === "syncing"
                      ? "secondary"
                      : "muted"
              }
            >
              {syncState.status === "queued"
                ? "待同步"
                : syncState.status === "syncing"
                  ? "同步中"
                  : syncState.status === "success"
                    ? `已同步 ${formatSyncTime(lastSyncedAt)}`
                    : syncState.status === "error"
                      ? "同步失败"
                      : "未同步"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {message && (
            <div
              className={cn(
                "rounded-2xl border px-4 py-3 text-sm shadow-sm",
                /fail|error|失败|错误/i.test(message)
                  ? "border-red-500/40 bg-red-50 text-red-950 dark:bg-red-500/15 dark:text-red-50"
                  : "border-emerald-500/40 bg-emerald-50 text-emerald-950 dark:bg-emerald-500/15 dark:text-emerald-50",
              )}
            >
              {message}
            </div>
          )}
          {content}
        </CardContent>
      </Card>
    </div>
  );
}
