import { PlayerAPI, PlayerEvent, TimeMode } from "bitmovin-player";
import { MutableRefObject, useEffect } from "react";
import { PlaybackOffsets } from "../../../hooks/useVideoRaceDetails/useVideoRaceDetails.types";
import { GridWindow } from "../../../types/GridWindow";
import { UserOffsets, useUserOffsets } from "../../../hooks/useUserOffests/useUserOffests";

interface UseSyncVideosArguments {
  windows: GridWindow[];
  windowVideojsRefMapRef: MutableRefObject<Record<string, PlayerAPI | null>>;
  isLive: boolean;
  playbackOffsets: PlaybackOffsets;
}
export const useSyncVideos = ({ windows, windowVideojsRefMapRef, isLive, playbackOffsets }: UseSyncVideosArguments) => {
  const { offsets: userOffsetsRef, offsetEmitter } = useUserOffsets();

  useEffect(() => {
    const syncVideos = (forceSync = false) => {
      const mainWindow = windows.find((w) => w.type === "main");

      if (mainWindow == null) {
        return;
      }

      const mainWindowPlayer = windowVideojsRefMapRef.current[mainWindow.id];

      if (mainWindowPlayer == null) {
        return;
      }

      windows.forEach((w) => {
        if (w.id === mainWindow.id) {
          return;
        }

        const player = windowVideojsRefMapRef.current[w.id];

        if (player == null) {
          return;
        }

        const offset = getOffset(playbackOffsets, userOffsetsRef.current, w, mainWindow);

        if (player.isPaused() !== mainWindowPlayer.isPaused()) {
          if (mainWindowPlayer.isPaused()) {
            player.pause();
          } else {
            player.play();
          }
        }

        if (isLive) {
          const diff = Math.abs(player.getTimeShift() + offset + mainWindowPlayer.getTimeShift());

          if (diff < 1 && !forceSync) {
            return;
          }

          player.timeShift(-offset + mainWindowPlayer.getTimeShift());
          return;
        }

        const targetTime = mainWindowPlayer.getCurrentTime(TimeMode.AbsoluteTime) - offset;
        const diff = Math.abs(player.getCurrentTime(TimeMode.AbsoluteTime) - targetTime);

        if (!forceSync) {
          if (diff < 1 || targetTime < 0) {
            return;
          }
        }

        player.seek(targetTime);
      });
    };

    let cleanupFunction: (() => void) | null = null;
    const setupPlayerListeners = () => {
      const mainWindow = windows.find((w) => w.type === "main");

      if (mainWindow == null) {
        return;
      }

      const mainWindowPlayer = windowVideojsRefMapRef.current[mainWindow.id];

      if (mainWindowPlayer == null) {
        return;
      }
      let mainWindowsPlayerDestroyed = false;

      const forceSync = () => syncVideos(true);
      mainWindowPlayer.on(PlayerEvent.Seek, forceSync);
      mainWindowPlayer.on(PlayerEvent.TimeShift, forceSync);
      mainWindowPlayer.on(PlayerEvent.Destroy, () => {
        mainWindowsPlayerDestroyed = true;
      });
      offsetEmitter.addEventListener("change", forceSync);

      cleanupFunction = () => {
        if (!mainWindowsPlayerDestroyed) {
          mainWindowPlayer.off(PlayerEvent.Seek, forceSync);
          mainWindowPlayer.off(PlayerEvent.TimeShift, forceSync);
        }
        offsetEmitter.removeEventListener("change", forceSync);
      };
    };

    const interval = window.setInterval(
      () => {
        syncVideos();

        if (cleanupFunction == null) {
          setupPlayerListeners();
        }
      },
      isLive ? 5_000 : 100,
    );

    const onVisibilityChange = () => {
      if (!document.hidden) {
        syncVideos(true);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      cleanupFunction?.();
    };
  }, [isLive, offsetEmitter, playbackOffsets, userOffsetsRef, windowVideojsRefMapRef, windows]);
};

const getOffset = (
  playbackOffsets: PlaybackOffsets,
  userOffsets: UserOffsets | null,
  w: GridWindow,
  mainWindow: GridWindow,
): number => {
  let userOffset = 0;
  if (w.type === "driver") {
    userOffset = userOffsets?.additionalStreams[w.driverId] ?? 0;
  } else {
    userOffset = userOffsets?.additionalStreams[w.type] ?? 0;
  }

  const f1Offset = playbackOffsets.f1[w.type]?.[mainWindow.type] ?? 0;

  return f1Offset + userOffset;
};
