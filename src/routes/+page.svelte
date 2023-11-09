<script lang="ts">
  import {onMount} from 'svelte';
  import Video from '$lib/components/Video.svelte';
  import type {AgoraTokenResult} from '../lib/types';
  import {CallManager} from '../lib/CallManager';
  import {VideoCallRecorder} from '../lib/VideoCallRecorder';

  const uid = '111';

  let data: AgoraTokenResult;
  let fetchError = '';
  let joined = false;
  let recording = false;
  let callManager = new CallManager();
  let videoCallRecorder = new VideoCallRecorder(callManager);
  $: btnTitle = (joined ? 'Leave' : 'Join') + ' Channel';
  $: recordTitle = (recording ? 'Stop' : 'Start') + ' Recording';
  $: fps = videoCallRecorder.fps;

  onMount(() => {
    callManager.setOnAddAudioTrack(videoCallRecorder.addAudioTrack);
    getToken();
  });

  function videoComplete(e: {detail: string}) {
    console.log('video complete', e.detail);
  }

  async function getToken() {
    const res = await fetch(`https://stage.api.app.motiapp.com/agora/get-token?uid=${uid}`, {
      headers: {
        'x-moti-dev-api-key': import.meta.env.VITE_MOTI_DEV_API_KEY,
      },
    });
    const json = await res.json();
    if (res.status !== 200) {
      fetchError = json.message;
    } else if (json.token) {
      data = json.token as AgoraTokenResult;
      console.log('token', data);
    } else {
      fetchError = 'No token returned';
    }
  }

  function joinChannel(token: string, channel: string) {
    console.log('joining');
    callManager.joinChannel(channel, token);
    joined = true;
  }

  function leaveChannel() {
    console.log('leaving');
    callManager.leaveChannel();
    joined = false;
  }
</script>

<svelte:head>
  <title>Demo</title>
</svelte:head>

{#if data?.token}
  {@const {token, channel} = data}

  <div class="wrap">
    <Video
      id="myVideo"
      on:complete={videoComplete}
    />
    <Video
      id="theirVideo"
      on:complete={videoComplete}
    />

    <div class="user">

      <button
        on:click={e => {
          if (!joined) {
            joinChannel(token, channel);
          } else {
            leaveChannel();
          }
        }}
        class:joined
      >
        {btnTitle}
      </button>
      <button
        on:click={e => {
          if (!recording) {
            videoCallRecorder.start();
            recording = true;
          } else {
            videoCallRecorder.stop();
            recording = false;
          }
        }}
      >
        {recordTitle}
      </button>
      {#if joined}
        <p>FPS: {$fps.toFixed(2)}</p>
      {/if}
    </div>
  </div>
{:else if fetchError}
  <div class="page">
    <h1 class="error">Error: {fetchError}</h1>
  </div>
{:else}
  <div class="page">
    <h1>loading...</h1>
  </div>
{/if}

<style>
  .page {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
  }
  h1 {
    text-align: center;
  }
  .error {
    color: #ff5b5b;
  }
  .wrap {
    display: flex;
    /* height: 50%;
    width: 100%; */
  }
  .wrap :global(.video) {
    width: 400px;
    height: 400px;
    margin: 0.5em;
    border-style: solid;
    border-radius: 5px;
  }
  .wrap :global(#myVideo) {
    border-color: red;
  }
  .wrap :global(#theirVideo) {
    border-color: blue;
  }

  .user {
    margin: 1em 1em;
  }

  button {
    background: black;
    color: white;
    border: 0;
    border-radius: 10px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 600;
    padding: 0.75em 1em;
    margin: 1em;
    align-items: center;
    justify-content: center;
    display: flex;
  }
</style>
