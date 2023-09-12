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
} from 'agora-electron-sdk';
import {ipcRenderer} from 'electron';

export class CallManager {
  private agoraEngine?: IRtcEngineEx;
  public isRecording = false;

  eventHandler: IRtcEngineEventHandler = {
    onJoinChannelSuccess: (connection: any, elapsed: number) => {
      console.log('success!!!');
    },
    // // Listen for the onUserJoined to setup the remote view.
    // onUserJoined: (connection: string, remoteUid, elapsed) =>
    // {
    //     // Save the remote UID for reuse.
    //     remoteUID = remoteUid;
    //     // Assign the remote UID to the local video container.
    //     remoteVideoContainer.textContent = "Remote user " + remoteUID.toString();
    //     // Setup remote video to display the remote video.
    //     agoraEngine.setupRemoteVideoEx(
    //     {
    //         sourceType: VideoSourceType.VideoSourceRemote,
    //         uid: remoteUid,
    //         view:remoteVideoContainer,
    //         renderMode: RenderModeType.RenderModeFit,
    //     },
    //     {
    //         channelId: connection.channelId
    //     });
    // },
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
      if (this.isRecording) ipcRenderer.send('on-local-video-frame', videoFrame);
      return true;
    },
    onPreEncodeVideoFrame: (sourceType: VideoSourceType, videoFrame: VideoFrame) => {
      return false;
    },
    onMediaPlayerVideoFrame: (videoFrame: VideoFrame, i: number) => {
      return false;
    },
    onRenderVideoFrame: (channelId: string, remoteUid: number, videoFrame: VideoFrame) => {
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
      SAMPLES_PER_CALL = 512;
    this.agoraEngine?.setMixedAudioFrameParameters(SAMPLE_RATE, SAMPLE_NUM_OF_CHANNEL, SAMPLES_PER_CALL);
    this.agoraEngine?.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
    this.agoraEngine?.setClientRole(ClientRoleType.ClientRoleBroadcaster);

    if (localVideoContainer) {
      console.log('found localVideoContainer: ', localVideoContainer);
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
