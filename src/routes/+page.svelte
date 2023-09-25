<script lang="ts">
  import {onMount} from 'svelte';
  import type {PageServerData} from './$types';
  import Video from '../lib/components/Video.svelte';
  export let data: PageServerData;

  var joined = false, recording = false;
  $: joinTitle = joined ? 'Leave' : 'Join';
  $: recordTitle = (recording ? 'Stop' : 'Start') + ' Recording';

  onMount(() => {
    console.log(data.token.token);
  });

  function videoComplete(e: {detail: string}) {
    console.log('video complete', e.detail);
  }
</script>

<svelte:head>
  <title>Demo</title>
</svelte:head>

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
  <p>channel: {data.token.channel}</p>
  <p>token: {data.token.token}</p>
  <button
    on:click={e => {
      if (!joined) {
        console.log('joining');
        window.agoraAPI.joinChannel(data.token.channel, data.token.token);
        joined = true;
      } else {
        console.log('leaving');
        window.agoraAPI.leaveChannel();
        joined = false;
      }
    }}
    class:joined
  >
    {joinTitle}
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

<style>
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
