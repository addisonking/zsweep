import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const savedZenMode = browser ? localStorage.getItem('zsweep_zen_mode') === 'true' : false;

export const zenMode = writable<boolean>(savedZenMode);

zenMode.subscribe((value) => {
	if (!browser) return;
	localStorage.setItem('zsweep_zen_mode', value.toString());
});
