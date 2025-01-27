import { PlayerAPI } from "bitmovin-player";
import { forwardRef, useCallback, useRef } from "react";
import { useStreamVideo } from "../../../hooks/useStreamVideo/useStreamVideo";
import { BaseGridWindow } from "../../../types/GridWindow";
import { VideoWindowProps } from "../../../types/VideoWindowBaseProps";
import { setRef } from "../../../utils/setRef";
import { AdditionalVideoJSOptions, VideoJS } from "../../VideoJS/VideoJS";
import { StreamVideoError } from "../../../hooks/useStreamVideo/useStreamVideo.utils";
import { VideoWindowWrapper } from "../VideoWindowWrapper/VideoWindowWrapper";
import { NoFeed } from "../NoFeed/NoFeed";
import { FeedError } from "../FeedError/FeedError";
import { VideoWindowButtons } from "../VideoWindowButtons/VideoWindowButtons";
import { useReactiveUserOffsets, useUserOffsets } from "../../../hooks/useUserOffests/useUserOffests";
import { SourceButton } from "../../SourceButton/SourceButton";
import { getIconForStreamInfo } from "../../../utils/getIconForStreamInfo";
import { useStreamPicker } from "../../../hooks/useStreamPicker/useStreamPicker";

interface DriverTrackerVideoWindowProps extends VideoWindowProps {
  gridWindow: BaseGridWindow;
  onDelete: () => void;
  onSourceChange: (streamId: string) => void;
}

export const DriverTrackerVideoWindow = forwardRef<PlayerAPI | null, DriverTrackerVideoWindowProps>(
  ({ isPaused, streamUrl, onDelete, fillMode, updateFillMode, onSourceChange }, forwardedRef) => {
    const playerRef = useRef<PlayerAPI | null>(null);
    const streamVideoState = useStreamVideo(streamUrl);
    const { updateOffset } = useUserOffsets();
    const offsets = useReactiveUserOffsets();

    const ref = (r: PlayerAPI | null) => {
      setRef(forwardedRef, r);
      playerRef.current = r;
    };

    const { requestStream } = useStreamPicker();
    const onRequestSourceChange = async () => {
      const chosenDriverData = await requestStream("all", ["driver-tracker"]);

      if (chosenDriverData == null) {
        return;
      }

      const [chosenStreamId] = chosenDriverData;

      onSourceChange(chosenStreamId);
    };
    const onOffsetChange = useCallback(
      (value: number) => {
        updateOffset("driver-tracker", value);
      },
      [updateOffset],
    );

    if (streamVideoState.state === "loading") {
      return null;
    }

    if (
      streamVideoState.state === "error" &&
      streamVideoState.error instanceof StreamVideoError &&
      streamVideoState.error.type === "NO_PLAYBACK_URL"
    ) {
      return <NoFeed onDelete={onDelete} />;
    }

    if (streamVideoState.state === "error") {
      return <FeedError error={streamVideoState.error} onDelete={onDelete} />;
    }

    return (
      <VideoWindowWrapper>
        <VideoJS
          videoStreamInfo={streamVideoState.data}
          options={ADDITIONAL_OPTIONS}
          ref={ref}
          isPaused={isPaused}
          fillMode={fillMode}
        />
        <VideoWindowButtons
          onOffsetChange={onOffsetChange}
          currentOffset={offsets?.additionalStreams["driver-tracker"] ?? 0}
          usesZiumOffsets={offsets?.isUserDefined === false}
          updateFillMode={() => updateFillMode(fillMode === "fill" ? "fit" : "fill")}
          fillMode={fillMode}
          onClose={onDelete}
          streamPill={
            <SourceButton
              onClick={onRequestSourceChange}
              label="Tracker"
              icon={getIconForStreamInfo("driver-tracker", "mini")}
              hideWhenUiHidden
            />
          }
        />
      </VideoWindowWrapper>
    );
  },
);

const ADDITIONAL_OPTIONS: AdditionalVideoJSOptions = {
  ui: false,
  playback: {
    muted: true,
  },
};
