import { useEffect, useState } from "react";
import { getCloudSyncState, getLastCloudSyncedAt, subscribeCloudSyncState, type CloudSyncState } from "@/services/cloud-sync-service";

export function useCloudSyncStatus() {
  const [state, setState] = useState<CloudSyncState>(() => getCloudSyncState());

  useEffect(() => {
    let mounted = true;

    getLastCloudSyncedAt()
      .then((lastSyncedAt) => {
        if (!mounted || !lastSyncedAt) return;
        setState((current) => ({
          ...current,
          lastSyncedAt: current.lastSyncedAt ?? lastSyncedAt,
          status: current.status === "idle" ? "success" : current.status,
        }));
      })
      .catch(() => undefined);

    return subscribeCloudSyncState((next) => {
      if (mounted) {
        setState(next);
      }
    });
  }, []);

  return state;
}
