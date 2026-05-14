import { CloudOff, CloudUpload, RotateCw, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCloudSyncStatus } from "@/hooks/use-cloud-sync-status";

function getStatusMeta(state: ReturnType<typeof useCloudSyncStatus>) {
  switch (state.status) {
    case "queued":
      return { label: "待同步", icon: CloudUpload };
    case "syncing":
      return { label: "同步中", icon: RotateCw };
    case "success":
      return { label: "已同步", icon: CheckCircle2 };
    case "error":
      return { label: "同步失败", icon: CloudOff };
    default:
      return { label: "未同步", icon: CloudUpload };
  }
}

function formatLastSyncedAt(value?: number) {
  if (!value) return "等待首次同步";
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export function MobileSyncBar() {
  const syncState = useCloudSyncStatus();
  const meta = getStatusMeta(syncState);
  const Icon = meta.icon;

  return (
    <div className="sticky top-0 z-10 mb-3 flex items-center justify-between rounded-xl border border-border/70 bg-card/92 px-3 py-2 text-xs backdrop-blur lg:hidden">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <span className="text-muted-foreground">云同步</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{formatLastSyncedAt(syncState.lastSyncedAt)}</span>
        <Badge variant={syncState.status === "error" ? "warning" : syncState.status === "success" ? "default" : syncState.status === "syncing" ? "secondary" : "muted"}>
          {meta.label}
        </Badge>
      </div>
    </div>
  );
}
