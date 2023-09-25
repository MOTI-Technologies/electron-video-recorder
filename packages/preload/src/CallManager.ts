import {
  RawAudioFrameOpModeType,
  createAgoraRtcEngine,
  VideoSourceType,
  RenderModeType,
  ChannelProfileType,
  ClientRoleType,
  ChannelMediaOptions,
  AudioFrame,
  VideoFrame,
  IVideoFrameObserver,
  IAudioFrameObserver,
  IRtcEngineEx,
  IRtcEngineEventHandler,
  RtcConnection,
} from 'agora-electron-sdk';
import {ipcRenderer} from 'electron';

export class CallManager {
  private agoraEngine?: IRtcEngineEx;
  public isRecording = false;

  eventHandler: IRtcEngineEventHandler = {
    onJoinChannelSuccess: (connection: RtcConnection, elapsed: number) => {
      console.log('success!!!');
    },
    // Listen for the onUserJoined to setup the remote view.
    onUserJoined: (connection: RtcConnection, remoteUid, elapsed) =>
    {
        // Save the remote UID for reuse.
        // remoteUID = remoteUid;
        let remoteVideoContainer = document.getElementById('theirVideo');

        // Setup remote video to display the remote video.
        this.agoraEngine?.setupRemoteVideoEx(
        {
            sourceType: VideoSourceType.VideoSourceRemote,
            uid: remoteUid,
            view:remoteVideoContainer,
            renderMode: RenderModeType.RenderModeFit,
        },
        {
            channelId: connection.channelId
        });
    },
  };

  audioObserver: IAudioFrameObserver = {
    onMixedAudioFrame: (channelId: string, audioFrame: AudioFrame) => {
      if (this.isRecording) ipcRenderer.send('on-mixed-audio-frame', audioFrame);
      return false;
    },
    onPlaybackAudioFrame: (channelId: string, audioFrame: AudioFrame) => {
      return false;
    },
    onRecordAudioFrame: (channelId: string, audioFrame: AudioFrame) => {
      return false;
    },
  };

  videoObserver: IVideoFrameObserver = {
    onCaptureVideoFrame: (sourceType: VideoSourceType, videoFrame: VideoFrame) => {
      if (this.isRecording) ipcRenderer.send('on-local-video-frame', videoFrame, 0);
      return true;
    },
    onPreEncodeVideoFrame: (sourceType: VideoSourceType, videoFrame: VideoFrame) => {
      return false;
    },
    onMediaPlayerVideoFrame: (videoFrame: VideoFrame, i: number) => {
      return false;
    },
    onRenderVideoFrame: (channelId: string, remoteUid: number, videoFrame: VideoFrame) => {
      if(this.isRecording) ipcRenderer.send('on-local-video-frame', videoFrame, remoteUid);
      return false;
    },
  };

  createEngine() {
    let appID = import.meta.env.VITE_AGORA_APP_ID;
    let agoraEngine = createAgoraRtcEngine();
    agoraEngine.initialize({appId: appID});
    agoraEngine.registerEventHandler(this.eventHandler);
    return agoraEngine;
  }

  joinChannel(channel: string, token: string) {
    if (!this.agoraEngine) {
      this.agoraEngine = this.createEngine();
    }

    let localVideoContainer = document.getElementById('myVideo');

    this.agoraEngine?.getMediaEngine().registerVideoFrameObserver(this.videoObserver);
    this.agoraEngine?.getMediaEngine().registerAudioFrameObserver(this.audioObserver);
    var SAMPLE_RATE = 16000,
      SAMPLE_NUM_OF_CHANNEL = 1,
      SAMPLES_PER_CALL = 1024;
    this.agoraEngine?.setMixedAudioFrameParameters(SAMPLE_RATE, SAMPLE_NUM_OF_CHANNEL, SAMPLES_PER_CALL);
    this.agoraEngine?.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
    this.agoraEngine?.setClientRole(ClientRoleType.ClientRoleBroadcaster);

    if (localVideoContainer) {
      this.agoraEngine.setupLocalVideo({
        sourceType: VideoSourceType.VideoSourceCameraPrimary,
        view: localVideoContainer,
      });
    }

    this.agoraEngine?.enableVideo();
    this.agoraEngine.startPreview();
    this.agoraEngine.joinChannel(token, channel, 0, new ChannelMediaOptions());
  }

  leaveChannel() {
    this.agoraEngine?.stopPreview();
    this.agoraEngine?.setupLocalVideo({
      sourceType: VideoSourceType.VideoSourceCameraPrimary,
      view: null,
    });
    this.agoraEngine?.leaveChannel();
    this.agoraEngine?.getMediaEngine().unregisterVideoFrameObserver(this.videoObserver);
    this.agoraEngine?.getMediaEngine().unregisterAudioFrameObserver(this.audioObserver);
  }
}
