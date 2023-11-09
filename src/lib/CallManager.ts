import AgoraRTC, {type EncryptionMode} from 'agora-rtc-sdk-ng';
import type {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IRemoteAudioTrack,
  IRemoteVideoTrack,
} from 'agora-rtc-sdk-ng';
import {VideoRecorderFrames, type VideoFrameSource} from './VideoCallRecorder';

export class CallManager implements VideoFrameSource {
  private agoraEngine?: IAgoraRTCClient;
  private localVideoTrack: ICameraVideoTrack | null = null;
  private localAudioTrack: IMicrophoneAudioTrack | null = null;
  private remoteVideoTrack: IRemoteVideoTrack | null = null;
  private remoteAudioTrack: IRemoteAudioTrack | null = null;
  public isRecording = false;
  private joined = false;

  private onAddAudioTrack: ((track: MediaStreamTrack) => void) | null = null;

  setOnAddAudioTrack(callback: (track: MediaStreamTrack) => void) {
    this.onAddAudioTrack = callback;
  }

  createEngine() {
    const client = AgoraRTC.createClient({mode: 'rtc', codec: 'h264'});

    client.on('user-joined', user => {
      console.log('user joined!', user);
    });
    client.on('user-published', async (user, mediaType) => {
      console.log('user-published', user, mediaType);
      await client.subscribe(user, mediaType);
      if (mediaType === 'video') {
        const remoteVideo = user.videoTrack;
        remoteVideo?.play(`theirVideo`);
        if (remoteVideo) {
          this.remoteVideoTrack = remoteVideo;
          console.log('play remote video');
        }
      }
      if (mediaType === 'audio') {
        const remoteAudio = user.audioTrack;
        remoteAudio?.play();
        if (remoteAudio) {
          this.remoteAudioTrack = remoteAudio;
          if (this.onAddAudioTrack) {
            this.onAddAudioTrack(remoteAudio.getMediaStreamTrack());
          }
        }
      }
    });
    client.on('user-info-updated', (uid, msg) => {
      // if (msg === 'mute-audio' || msg === 'mute-video') otherUserIsMuted = true;
      // if (msg === 'unmute-audio' || msg === 'unmute-video') otherUserIsMuted = false;
    });

    client.on('user-unpublished', async user => {
      console.log('unpublish receiver');
      const videoEl = document.getElementById('theirVideo');
      this.remoteAudioTrack = this.remoteVideoTrack = null;
      videoEl?.remove();
    });
    return client;
  }

  async joinChannel(channel: string, token: string) {
    console.log('joinChannel: ', channel, token);
    if (!this.agoraEngine) {
      this.agoraEngine = this.createEngine();
    }
    const appID = import.meta.env.VITE_AGORA_APP_ID;
    const uid = await this.agoraEngine?.join(appID, channel, token);
    console.log('joined agora', uid);
    const localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    const localVideoTrack = await AgoraRTC.createCameraVideoTrack({encoderConfig: '720p_2'});
    await this.agoraEngine.publish([localAudioTrack, localVideoTrack]);
    console.log('publish video');
    localVideoTrack.play('myVideo');
    this.localAudioTrack = localAudioTrack;
    this.localVideoTrack = localVideoTrack;
    this.joined = true;
    if (this.onAddAudioTrack) this.onAddAudioTrack(localAudioTrack.getMediaStreamTrack());
  }

  requestFrames(): VideoRecorderFrames {
    const localFrame = this.localVideoTrack?.getCurrentFrameData();
    const remoteFrame = this.remoteVideoTrack?.getCurrentFrameData();
    const frames = new VideoRecorderFrames(localFrame, remoteFrame);
    return frames;
  }

  leaveChannel() {
    this.joined = false;
    this.localVideoTrack?.close();
    this.localAudioTrack?.close();
    this.localAudioTrack = this.localVideoTrack = this.remoteAudioTrack = this.remoteVideoTrack = null;
    this.agoraEngine?.leave();
  }
}
