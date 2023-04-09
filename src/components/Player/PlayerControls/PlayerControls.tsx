import {
  ArrowDownIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  PauseIcon,
  PlayIcon,
  SpeakerWaveIcon,
} from "@heroicons/react/20/solid";
import { PlayerAPI, PlayerEvent, UserInteractionEvent } from "bitmovin-player";
import {
  AdClickOverlay,
  AdMessageLabel,
  AdSkipButton,
  AirPlayToggleButton,
  AudioQualitySelectBox,
  AudioTrackSelectBox,
  BufferingOverlay,
  CastStatusOverlay,
  CastToggleButton,
  Container,
  ControlBar,
  ErrorMessageOverlay,
  FullscreenToggleButton,
  i18n,
  Label,
  PictureInPictureToggleButton,
  PlaybackSpeedSelectBox,
  PlaybackTimeLabel,
  PlaybackTimeLabelMode,
  PlaybackToggleButton,
  PlaybackToggleOverlay,
  PlayerUtils,
  RecommendationOverlay,
  SeekBar,
  SeekBarLabel,
  SettingsPanel,
  SettingsPanelItem,
  SettingsPanelPage,
  SettingsPanelPageOpenButton,
  SettingsToggleButton,
  Spacer,
  SubtitleOverlay,
  SubtitleSelectBox,
  SubtitleSettingsLabel,
  SubtitleSettingsPanelPage,
  TitleBar,
  UIContainer,
  UIManager,
  VideoQualitySelectBox,
  VolumeSlider,
  VolumeToggleButton,
  VRToggleButton,
  Watermark,
} from "bitmovin-player-ui";
import { UIConfig } from "bitmovin-player-ui/dist/js/framework/uiconfig";
import { useEffect, useRef, useState } from "react";
import { useStateWithRef } from "../../../hooks/useStateWithRef/useStateWithRef";
import { Button } from "../../Button/Button";
import { ArrowLeft30Icon, ArrowRight30Icon } from "../../CustomIcons/CustomIcons";
import styles from "./PlayerControls.module.scss";

interface PlayerControlsProps {
  player: PlayerAPI | null;
  toggleCollapse: () => void;
}

export const PlayerControls = ({ player, toggleCollapse }: PlayerControlsProps) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const $wrapper = wrapperRef.current;
    if (player === null || $wrapper === null) {
      return;
    }

    const mainSettingsPanelPage = new SettingsPanelPage({
      components: [
        new SettingsPanelItem(i18n.getLocalizer("settings.video.quality"), new VideoQualitySelectBox()),
        new SettingsPanelItem(i18n.getLocalizer("speed"), new PlaybackSpeedSelectBox()),
        new SettingsPanelItem(i18n.getLocalizer("settings.audio.quality"), new AudioQualitySelectBox()),
      ],
    });

    const settingsPanel = new SettingsPanel({
      components: [mainSettingsPanelPage],
      hidden: true,
    });

    const seekBar = new SeekBar({ label: new SeekBarLabel() });

    const controlBar = new ControlBar({
      components: [
        // settingsPanel,
        new Container({
          components: [
            new PlaybackTimeLabel({
              timeLabelMode: PlaybackTimeLabelMode.CurrentTime,
              cssClasses: ["current-time"],
              hideInLivePlayback: true,
            }),
            new Spacer(),
            new PlaybackTimeLabel({
              timeLabelMode: PlaybackTimeLabelMode.TotalTime,
              cssClasses: ["total-time"],
              hideInLivePlayback: true,
            }),
          ],
          cssClasses: ["controlbar-top"],
        }),
        new Container({
          components: [seekBar],
          cssClasses: ["controlbar-bottom"],
        }),
        // new Container({
        //   components: [
        //     new VolumeToggleButton(),
        //     new VolumeSlider(),
        //     new Spacer(),
        //     new SettingsToggleButton({ settingsPanel: settingsPanel }),
        //     new FullscreenToggleButton(),
        //   ],
        //   cssClasses: ["controlbar-bottom"],
        // }),
      ],
    });

    const myUi = new UIContainer({
      components: [controlBar],
      // components: [new BufferingOverlay(), controlBar],
      hideDelay: -1,
    });

    const myUiConfig: UIConfig = {
      container: $wrapper,
    };

    const myUiManager = new UIManager(player, myUi, myUiConfig);

    return () => {
      myUiManager.release();
    };
  }, [player]);

  return (
    <div className={styles.wrapper}>
      <PlaybackButtons player={player} />
      <div className={styles.bitmovinWrapper} ref={wrapperRef} />
      <OptionsButtons player={player} toggleCollapse={toggleCollapse} />
    </div>
  );
};

interface PlaybackButtonsProps {
  player: PlayerAPI | null;
}
const PlaybackButtons = ({ player }: PlaybackButtonsProps) => {
  const [isPlaying, isPlayingRef, setIsPlaying] = useStateWithRef(player?.isPlaying() ?? false);
  const [hasStartedSeeking, setHasStartedSeeking] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [wasPlayingBeforeSeekStart, setWasPlayingBeforeSeekStart] = useState(false);

  useEffect(() => {
    if (player == null) {
      return;
    }

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

  const onPlayClick = () => {
    if (player == null) {
      return;
    }

    if (player.isPlaying()) {
      player.pause("ui");
    } else {
      player.play("ui");
    }
  };

  const onSkipAhead = () => {
    player?.seek(player.getCurrentTime() + 30);
  };

  const onSkipBackwards = () => {
    player?.seek(player.getCurrentTime() - 30);
  };

  const displayedIsPlaying = isSeeking || hasStartedSeeking ? wasPlayingBeforeSeekStart : isPlaying;
  return (
    <div className={styles.buttonsWrapper}>
      <Button iconLeft={ArrowLeft30Icon} variant="Tertiary" onClick={onSkipBackwards} />
      <Button iconLeft={displayedIsPlaying ? PauseIcon : PlayIcon} variant="Secondary" onClick={onPlayClick} />
      <Button iconLeft={ArrowRight30Icon} variant="Tertiary" onClick={onSkipAhead} />
    </div>
  );
};

interface OptionsButtonsProps {
  player: PlayerAPI | null;
  toggleCollapse: () => void;
}
const OptionsButtons = ({ toggleCollapse }: OptionsButtonsProps) => {
  const [isFullScreen, setIsFullScreen] = useState(document.fullscreenElement != null);
  useEffect(() => {
    const onFullScreenChange = () => {
      setIsFullScreen(document.fullscreenElement != null);
    };

    document.addEventListener("fullscreenchange", onFullScreenChange);
    () => document.removeEventListener("fullscreenchange", onFullScreenChange);
  }, []);

  const toggleFullScreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  };

  return (
    <div className={styles.buttonsWrapper}>
      <Button iconLeft={SpeakerWaveIcon} variant="Tertiary" />
      <Button
        iconLeft={isFullScreen ? ArrowsPointingInIcon : ArrowsPointingOutIcon}
        variant="Tertiary"
        onClick={toggleFullScreen}
      />
      <Button iconLeft={ArrowDownIcon} variant="Tertiary" onClick={toggleCollapse} />
    </div>
  );
};
