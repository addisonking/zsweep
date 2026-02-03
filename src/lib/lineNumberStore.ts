import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type LineNumberMode = 'off' | 'normal' | 'relative' | 'hybrid';

const saved = browser ? localStorage.getItem('zsweep_linenumbers') : null;
const initial: LineNumberMode = (saved as LineNumberMode) || 'off';

export const lineNumbers = writable<LineNumberMode>(initial);

lineNumbers.subscribe((mode) => {
	if (!browser) return;
	localStorage.setItem('zsweep_linenumbers', mode);
});
