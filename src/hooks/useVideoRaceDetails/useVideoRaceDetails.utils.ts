import {
  BaseStreamInfo,
  DriverStreamDataDTO,
  DriverStreamInfo,
  F1PlaybackOffsetsApiResponse,
  F1PlaybackOffsetsData,
  StreamDataDTO,
  StreamInfo,
  StreamInfoWithDriver,
} from "./useVideoRaceDetails.types";

const getStreamPrettyName = (name: string) => {
  switch (name) {
    case "F1 LIVE":
      return "F1 Live";
    case "TRACKER":
      return "Tracker";
    case "DATA":
      return "Data";
    case "INTERNATIONAL":
      return "International";
    case "PIT LANE":
      return "Pit Lane";
    default:
      return name;
  }
};

const mapStreamIdentifierToType = (identifier: string, season: number): StreamInfoWithDriver["type"] => {
  if (identifier === "PRES") {
    return "main";
  }

  if (identifier === "WIF" && season <= 2021) {
    return "main";
  }

  if (identifier === "TRACKER") {
    return "driver-tracker";
  }

  if (identifier === "DATA") {
    return "data-channel";
  }

  if (identifier === "OBC") {
    return "driver";
  }

  return "other";
};

export const collectStreams = (streams: StreamDataDTO[] | undefined, season: number, raceId: string) => {
  let defaultStream: StreamInfo | null = null;
  let driverTrackerStream: StreamInfo | null = null;
  let dataChannelStream: StreamInfo | null = null;
  const driverStreams: DriverStreamInfo[] = [];
  const otherStreams: StreamInfo[] = [];

  if (streams == null) {
    defaultStream = {
      type: "main",
      channelId: 0,
      playbackUrl: `CONTENT/PLAY?contentId=${raceId}`,
      title: "main",
      identifier: "main",
    };

    return {
      defaultStream,
      driverStreams,
      otherStreams,
      driverTrackerStream,
      dataChannelStream,
    };
  }

  for (const stream of streams) {
    const streamType = mapStreamIdentifierToType(stream.identifier, season);
    const baseStreamInfo: BaseStreamInfo = {
      channelId: stream.channelId,
      playbackUrl: stream.playbackUrl,
      title: getStreamPrettyName(stream.title),
      identifier: stream.identifier,
    };

    if (streamType === "main") {
      defaultStream = {
        type: streamType,
        ...baseStreamInfo,
      };
      continue;
    }

    if (streamType === "data-channel") {
      dataChannelStream = {
        type: streamType,
        ...baseStreamInfo,
      };
      continue;
    }

    if (streamType === "driver-tracker") {
      driverTrackerStream = {
        type: streamType,
        ...baseStreamInfo,
      };
      continue;
    }

    if (isDriverStream(stream, streamType)) {
      const driverStreamInfo: DriverStreamInfo = {
        ...baseStreamInfo,
        type: "driver",
        racingNumber: stream.racingNumber,
        title: stream.title,
        reportingName: stream.reportingName,
        driverFirstName: stream.driverFirstName,
        driverLastName: stream.driverLastName,
        teamName: stream.teamName,
        constructorName: stream.constructorName,
        hex: stream.hex,
      };

      driverStreams.push(driverStreamInfo);
      continue;
    }

    otherStreams.push({
      type: "other",
      ...baseStreamInfo,
    });
  }

  return {
    defaultStream,
    driverStreams,
    otherStreams,
    driverTrackerStream,
    dataChannelStream,
  };
};

export const createF1OffsetsMap = (
  playbackOffsets: F1PlaybackOffsetsApiResponse[] | undefined,
  season: number,
): F1PlaybackOffsetsData => {
  const data: F1PlaybackOffsetsData = {};

  if (playbackOffsets == null) {
    return data;
  }

  for (const offset of playbackOffsets) {
    const key = mapStreamIdentifierToType(offset.channelToAdjust, season);
    const value = offset.delaySeconds;
    const baseChannel = offset.channels.find((channel) => channel !== offset.channelToAdjust);

    if (baseChannel === undefined) {
      continue;
    }

    const baseChannelType = mapStreamIdentifierToType(baseChannel, season);
    const otherValues: Record<StreamInfoWithDriver["type"], number | undefined> = data[key] ?? {};
    otherValues[baseChannelType] = value;

    data[key] = otherValues;
  }

  return data;
};

function isDriverStream(stream: StreamDataDTO, streamType: string): stream is DriverStreamDataDTO {
  return streamType === "driver";
}
