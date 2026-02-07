import { writable } from 'svelte/store';

export type MineIcon = 'asterisk' | 'skull' | 'radiation' | 'flame';

export const mineIcon = writable<MineIcon>('asterisk');
