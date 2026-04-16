import { type Computed, signal } from "../index.ts";

type ShareResult = {
  /** Whether the Web Share API is supported. */
  isSupported: boolean;
  /** Whether a share operation is currently in progress. */
  isSharing: Computed<boolean>;
  /** Share data.  Resolves when the share completes or is cancelled. */
  share(data: ShareData): Promise<void>;
};

/**
 * Reactive wrapper around the Web Share API.
 */
export function createShare(): ShareResult {
  const isSupported = typeof navigator !== "undefined" && "share" in navigator;
  const isSharing = signal(false);

  const share = async (data: ShareData): Promise<void> => {
    if (!isSupported) return;
    isSharing(true);
    try {
      await navigator.share(data);
    } finally {
      isSharing(false);
    }
  };

  return {
    isSupported,
    isSharing: isSharing as Computed<boolean>,
    share,
  };
}
