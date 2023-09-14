<script lang="ts">
  import {onMount} from 'svelte';
  import Video from '$lib/components/Video.svelte';
  import type { AgoraTokenResult } from '../lib/types';

  const uid = '111';

  let data: AgoraTokenResult;
  let fetchError = ''
  let joined = false;
  let recording = false;
  $: btnTitle = (joined ? 'Leave' : 'Join') + ' Channel';
  $: recordTitle = (recording ? 'Stop' : 'Start') + ' Recording';

  onMount(() => {
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
  </div>

  <div class="user">
    <p>channel: {channel}</p>
    <p>token: {token}</p>
    <button
      on:click={(e) => {
    if (!joined) {
      console.log('joining');
      window.agoraAPI.joinChannel(channel, token);
      joined = true;
    } else {
      console.log('leaving');
      window.agoraAPI.leaveChannel();
      joined = false;
    }
    
  }}
      class:joined
    >
      {btnTitle}
    </button>
    <button
      on:click={e => {
	if (!recording) {
	  window.agoraAPI.startRecording();
	  recording = true;
	} else {
	  window.agoraAPI.stopRecording();
	  recording = false;
	}
  }}
    >
      {recordTitle}
    </button>
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
    height: 50%;
    width: 100%;
  }
  .wrap :global(.video) {
    width: 50%;
    height: 100%;
    flex: 1;
    margin: 1em;
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
    margin: 2em 1em;
  }

  .wrap :global(#myVideo) {
    border-color: red;
  }
  .wrap :global(#theirVideo) {
    border-color: blue;
  }
  .user {
    margin: 2em 1em;
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
    align-items: center;
    justify-content: center;
    display: flex;
  }

</style>
