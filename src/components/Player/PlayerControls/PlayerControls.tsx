import { PauseIcon, PlayIcon } from "@heroicons/react/20/solid";
import { PlayerAPI, PlayerEvent, UserInteractionEvent } from "bitmovin-player";
import {
  Container,
  ControlBar,
  Label,
  PlaybackTimeLabel,
  PlaybackTimeLabelMode,
  SeekBar,
  SeekBarLabel,
  UIContainer,
  UIManager,
} from "bitmovin-player-ui";

import { UIConfig } from "bitmovin-player-ui/dist/js/framework/uiconfig";
import cn from "classnames";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStateWithRef } from "../../../hooks/useStateWithRef/useStateWithRef";
import { Button } from "../../Button/Button";
import { ArrowLeft30Icon, ArrowRight30Icon } from "../../CustomIcons/CustomIcons";
import { Spinner } from "../../Spinner/Spinner";
import { OptionsButtons } from "./OptionsButtons/OptionsButtons";
import styles from "./PlayerControls.module.scss";

interface PlayerControlsProps {
  player: PlayerAPI;
  volume: number;
  setVolume: (newVolume: number) => void;
  isMuted: boolean;
  setIsMuted: (newIsMuted: boolean) => void;
}

const OVERLAY_TIMEOUT_DELAY = 100;

export const PlayerControls = ({ player, setVolume, volume, isMuted, setIsMuted }: PlayerControlsProps) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = useState(player.getBufferedRanges().length > 0);

  useEffect(() => {
    const $wrapper = wrapperRef.current;
    if ($wrapper === null) {
      return;
    }

    const seekBar = new SeekBar({
      label: new SeekBarLabel(),
      keyStepIncrements: {
        leftRight: 5,
        upDown: 5,
      },
    });

    const currentTimeLabelWrapper = new Container({
      components: [
        new Label({
          text: "--:--",
          cssClasses: ["label-placeholder"],
        }),
        new PlaybackTimeLabel({
          timeLabelMode: PlaybackTimeLabelMode.CurrentTime,
        }),
      ],
      cssClasses: ["current-time", "time-wrapper"],
    });

    const totalTimeLabelWrapper = new Container({
      components: [
        new Label({
          text: "--:--",
          cssClasses: ["label-placeholder"],
        }),
        new PlaybackTimeLabel({
          timeLabelMode: PlaybackTimeLabelMode.TotalTime,
          hideInLivePlayback: true,
        }),
      ],
      cssClasses: ["total-time", "time-wrapper"],
    });

    const controlBar = new ControlBar({
      components: [
        new Container({
          components: [currentTimeLabelWrapper, totalTimeLabelWrapper],
          cssClasses: ["controlbar-top"],
        }),
        new Container({
          components: [seekBar],
          cssClasses: ["controlbar-bottom"],
        }),
      ],
    });

    const myUi = new UIContainer({
      components: [controlBar],
      hideDelay: -1,
    });

    const myUiConfig: UIConfig = {
      container: $wrapper,
    };

    const myUiManager = new UIManager(player, myUi, myUiConfig);

    player.on(PlayerEvent.Ready, () => {
      setIsReady(true);
    });

    return () => {
      myUiManager.release();
    };
  }, [player]);

  return (
    <div className={cn(styles.wrapper)}>
      <PlaybackButtons player={player} isReady={isReady} />
      <div
        className={cn(styles.bitmovinWrapper, { [styles.isReady]: isReady })}
        ref={wrapperRef}
        inert={!isReady ? "" : undefined}
      />
      <OptionsButtons player={player} setVolume={setVolume} volume={volume} isMuted={isMuted} setIsMuted={setIsMuted} />
    </div>
  );
};

interface PlaybackButtonsProps {
  player: PlayerAPI;
  isReady: boolean;
}
const PlaybackButtons = ({ player, isReady }: PlaybackButtonsProps) => {
  const [isPlaying, isPlayingRef, setIsPlaying] = useStateWithRef(player?.isPlaying() ?? false);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnLiveEdge, setIsOnLiveEdge] = useState(player?.isLive());
  const [hasStartedSeeking, setHasStartedSeeking] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [wasPlayingBeforeSeekStart, setWasPlayingBeforeSeekStart] = useState(false);

  useEffect(() => {
    setIsPlaying(player.isPlaying());
    player.on(PlayerEvent.Paused, (event: UserInteractionEvent) => {
      if (event.issuer === "ui-seek") {
        setWasPlayingBeforeSeekStart(isPlayingRef.current);
        setHasStartedSeeking(true);
      }

      setIsPlaying(player.isPlaying());
    });
    player.on(PlayerEvent.Play, (event: UserInteractionEvent) => {
      if (event.issuer === "ui-seek") {
        setHasStartedSeeking(false);
      }

      setIsPlaying(player.isPlaying());
    });
    player.on(PlayerEvent.Playing, () => setIsPlaying(player.isPlaying()));
    player.on(PlayerEvent.SourceLoaded, () => setIsPlaying(player.isPlaying()));
    player.on(PlayerEvent.SourceUnloaded, () => setIsPlaying(player.isPlaying()));
    player.on(PlayerEvent.PlaybackFinished, () => setIsPlaying(player.isPlaying()));
    player.on(PlayerEvent.CastStarted, () => setIsPlaying(player.isPlaying()));
    player.on(PlayerEvent.Seek, () => setIsSeeking(true));
    player.on(PlayerEvent.Seeked, () => setIsSeeking(false));
  }, [isPlayingRef, player, setIsPlaying, setIsSeeking]);

  useEffect(() => {
    let overlayTimeout = -1;
    const showOverlay = () => {
      clearTimeout(overlayTimeout);
      overlayTimeout = setTimeout(() => {
        setIsLoading(true);
      }, OVERLAY_TIMEOUT_DELAY);
    };
    const hideOverlay = () => {
      clearTimeout(overlayTimeout);
      setIsLoading(false);
    };
    player.on(PlayerEvent.StallStarted, showOverlay);
    player.on(PlayerEvent.StallEnded, hideOverlay);
    player.on(PlayerEvent.Play, showOverlay);
    player.on(PlayerEvent.Playing, hideOverlay);
    player.on(PlayerEvent.Paused, hideOverlay);
    player.on(PlayerEvent.Seek, showOverlay);
    player.on(PlayerEvent.Seeked, hideOverlay);
    player.on(PlayerEvent.TimeShift, showOverlay);
    player.on(PlayerEvent.TimeShifted, hideOverlay);
    player.on(PlayerEvent.SourceUnloaded, hideOverlay);

    return () => clearTimeout(overlayTimeout);
  }, [player]);

  useEffect(() => {
    if (!player.isLive()) {
      return;
    }

    const updateLiveTimeshiftState = () => {
      const isTimeshifted = player.getTimeShift() < 0;
      const isTimeshiftAvailable = player.getMaxTimeShift() < 0;
      const isOnLiveEdge = !isTimeshifted && (!player.isPaused() || !isTimeshiftAvailable);
      setIsOnLiveEdge(isOnLiveEdge);
    };

    updateLiveTimeshiftState();
    player.on(PlayerEvent.TimeShift, updateLiveTimeshiftState);
    player.on(PlayerEvent.TimeShifted, updateLiveTimeshiftState);
    player.on(PlayerEvent.Playing, updateLiveTimeshiftState);
    player.on(PlayerEvent.Paused, updateLiveTimeshiftState);
    player.on(PlayerEvent.StallStarted, updateLiveTimeshiftState);
    player.on(PlayerEvent.StallEnded, updateLiveTimeshiftState);
  }, [player]);

  const onPlayClick = useCallback(() => {
    if (player.isPlaying()) {
      player.pause("ui");
    } else {
      player.play("ui");
    }
  }, [player]);

  const onSkipAhead = useCallback(() => {
    if (player.isLive()) {
      player.timeShift(player.getTimeShift() + 30);
    } else {
      player.seek(player.getCurrentTime() + 30);
    }
  }, [player]);

  const onSkipBackwards = useCallback(() => {
    if (player.isLive()) {
      player.timeShift(player.getTimeShift() - 30);
    } else {
      player.seek(player.getCurrentTime() - 30);
    }
  }, [player]);

  const PlayPauseIcon = useMemo(() => {
    if (isLoading || !isReady) {
      return Spinner;
    }

    const displayedIsPlaying = isSeeking || hasStartedSeeking ? wasPlayingBeforeSeekStart : isPlaying;
    return displayedIsPlaying ? PauseIcon : PlayIcon;
  }, [hasStartedSeeking, isLoading, isPlaying, isReady, isSeeking, wasPlayingBeforeSeekStart]);

  return (
    <div className={styles.buttonsWrapper}>
      <Button iconLeft={ArrowLeft30Icon} variant="Tertiary" onClick={onSkipBackwards} disabled={!isReady} />
      <Button iconLeft={PlayPauseIcon} variant="Secondary" onClick={onPlayClick} />
      <Button
        iconLeft={ArrowRight30Icon}
        variant="Tertiary"
        onClick={onSkipAhead}
        disabled={isOnLiveEdge || !isReady}
      />
    </div>
  );
};
