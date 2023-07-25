import { ContainerConfig, Container } from "bitmovin-player-ui/dist/js/framework/components/container";
import { UIInstanceManager } from "bitmovin-player-ui/dist/js/framework/uimanager";
import { PlayerAPI } from "bitmovin-player";
import { VideoStreamInfo } from "../../hooks/useStreamVideo/useStreamVideo.api";

/**
 * Configuration interface for the {@link MediaStatsOverlay} component.
 */
export type MediaStatsOverlayConfig = ContainerConfig;

/**
 * Overlays the player and displays media statistics.
 */
export class MediaStatsOverlay extends Container<MediaStatsOverlayConfig> {
  private videoStreamInfo?: VideoStreamInfo;
  private numberOfDroppedFrames = 0;
  private prevDroppedVideoFramesSum = 0;

  constructor(config: MediaStatsOverlayConfig = {}, videoStreamInfo: VideoStreamInfo) {
    super(config);

    this.config = this.mergeConfig(
      config,
      <MediaStatsOverlayConfig>{
        cssClass: "ui-media-stats-overlay",
        hidden: true,
      },
      this.config,
    );
    this.videoStreamInfo = videoStreamInfo;
  }

  updateMediaStats(statsData: any) {
    const statsOverlayElement = this.getDomElement().get(0);
    statsOverlayElement.textContent = `
    MEDIA STATS:
    channelId: ${statsData.channelId} 
    video quality: ${statsData.videoLabel} 
    audio quality: ${statsData.audioLabel}
    target fps: ${statsData.fps}
    dropped frames / sec: ${statsData.droppedFrames}  
    frame width: ${statsData.width}
    frame height: ${statsData.height}
    video codec: ${statsData.videoCodec}
    target video bitrate: ${statsData.video_bitrate} kbps
    target audio bitrate: ${statsData.audio_bitrate} kbps
    audio codec: ${statsData.audioCodec}
    `;
  }

  configure(player: PlayerAPI, uimanager: UIInstanceManager): void {
    super.configure(player, uimanager);

    player.on(player.exports.PlayerEvent.Ready, () => {
      const mediaStatsData = {};
      this.updateMediaStats(mediaStatsData);

      setInterval(() => {
        const droppedVideoFramesSum = player.getDroppedVideoFrames();
        if (droppedVideoFramesSum > this.prevDroppedVideoFramesSum) {
          this.numberOfDroppedFrames = droppedVideoFramesSum - this.prevDroppedVideoFramesSum;
          this.prevDroppedVideoFramesSum = droppedVideoFramesSum;
        } else {
          this.numberOfDroppedFrames = 0;
        }
        const videoLabelString =
          player.getVideoQuality().id == "auto"
            ? "auto"
            : player.getAvailableVideoQualities().find((x) => x.id === player.getVideoQuality().id)?.label;
        const audioLabelString = player.getAudioQuality().id;
        const downloadedVideoData = player.getDownloadedVideoData();
        const downloadedAudioData = player.getDownloadedAudioData();
        const videoCodec = player.getVideoQuality().id == "auto" ? "auto" : player.getVideoQuality().codec;
        const audioCodec = player.getAudioQuality().id == "auto" ? "auto" : player.getAudioQuality().codec;
        this.updateMediaStats({
          channelId: this.videoStreamInfo?.channelId,
          droppedFrames: this.numberOfDroppedFrames,
          videoLabel: videoLabelString,
          audioLabel: audioLabelString,
          videoCodec: videoCodec,
          audioCodec: audioCodec,
          video_bitrate: downloadedVideoData.bitrate / 1000,
          audio_bitrate: downloadedAudioData.bitrate / 1000,
          height: downloadedVideoData.height,
          width: downloadedVideoData.width,
          fps: player.getVideoQuality().frameRate,
        });
      }, 1000);
    });
  }
}
