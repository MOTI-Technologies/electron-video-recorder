<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';

	export let id: string;
	interface DispatchParams {
		complete: string;
	}
	const dispatch = createEventDispatcher<DispatchParams>();

	onMount(() => {
		const myInt = setTimeout(() => {
			dispatch('complete', `${id} complete`);
		}, 1000);

		return () => {
			clearTimeout(myInt);
		};
	});
</script>

<div {id} class="video"></div>

<style>
	.video {
		display: flex;
		justify-content: center;
		align-items: center;
	}
</style>
