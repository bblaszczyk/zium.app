import { forwardRef, useRef } from "react";
import { PlayerAPI, PlayerEvent } from "bitmovin-player";
import { SpeakerWaveIcon } from "@heroicons/react/20/solid";
import cn from "classnames";
import { useStreamVideo } from "../../../hooks/useStreamVideo/useStreamVideo";
import { MainGridWindow } from "../../../types/GridWindow";
import { VideoWindowProps } from "../../../types/VideoWindowBaseProps";
import { onVideoWindowReadyBase } from "../../../utils/onVideoWindowReady";
import { setRef } from "../../../utils/setRef";
// import { attachUseBestQuality } from "../../../utils/attachUseBestQuality";
// import { attachStartAt } from "../../../utils/attachStartAt";
import { AdditionalVideoJSOptions, VideoJS } from "../../VideoJS/VideoJS";
import { VideoWindowWrapper } from "../VideoWindowWrapper/VideoWindowWrapper";
import styles from "./MainVideoWindow.module.scss";

interface MainVideoWindowProps extends VideoWindowProps {
  gridWindow: MainGridWindow;
  onPlayingChange: (isPaused: boolean) => void;
  onWindowAudioFocus: () => void;
  isAudioFocused: boolean;
  volume: number;
  setVolume: (newVolume: number) => void;
  executeOnAll: (cb: (player: PlayerAPI) => void, callerId: string) => void;
}

export const MainVideoWindow = forwardRef<PlayerAPI | null, MainVideoWindowProps>(
  (
    {
      gridWindow,
      streamUrl,
      executeOnAll,
      onPlayingChange,
      isPaused,
      isAudioFocused,
      onWindowAudioFocus,
      volume,
      setVolume,
    },
    forwardedRef,
  ) => {
    const playerRef = useRef<PlayerAPI | null>(null);
    const streamVideoState = useStreamVideo(streamUrl);

    const ref = (r: PlayerAPI | null) => {
      setRef(forwardedRef, r);
      playerRef.current = r;
    };

    const onReady = (player: PlayerAPI) => {
      const callerId = gridWindow.id;
      onVideoWindowReadyBase(player);

      // player.mute();
      // attachStartAt(player);
      player.play();

      // player.on(PlayerEvent.Seek, () => {
      //   onPlayingChange(true);
      // });

      // player.on(PlayerEvent.Seeked, () => {
      //   onPlayingChange(false);
      //   // const currentTime = player.getCurrentTime(TimeMode.AbsoluteTime);
      //   // executeOnAll((p) => p.seek(currentTime), callerId);
      // });

      player.on(PlayerEvent.Paused, () => {
        onPlayingChange(true);
      });

      player.on(PlayerEvent.Play, () => {
        onPlayingChange(false);
      });

      player.on(PlayerEvent.VolumeChanged, () => {
        const newVolume = player.getVolume();
        if (newVolume === 0) {
          return;
        }

        setVolume(newVolume);
        onWindowAudioFocus();
      });

      // attachUseBestQuality(player);
    };

    if (streamVideoState.state !== "done") {
      return null;
    }

    return (
      <VideoWindowWrapper>
        <VideoJS
          videoStreamInfo={streamVideoState.data}
          options={ADDITIONAL_OPTIONS}
          ref={ref}
          onReady={onReady}
          isPaused={isPaused}
          volume={isAudioFocused ? volume : 0}
        />
        <button
          className={cn(styles.focusAudioButton, { [styles.isAudioFocused]: isAudioFocused })}
          onClick={onWindowAudioFocus}
        >
          <SpeakerWaveIcon width={20} height={20} fill="currentColor" />
        </button>
      </VideoWindowWrapper>
    );
  },
);

const ADDITIONAL_OPTIONS: AdditionalVideoJSOptions = {
  // controlBar: {
  //   playToggle: true,
  //   remainingTimeDisplay: true,
  //   progressControl: true,
  //   volumePanel: true,
  //   audioTrackButton: true,
  //   fullscreenToggle: true,
  // },
};