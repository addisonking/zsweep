<script lang="ts">
	import { Search, ChevronRight, Palette, Hash } from 'lucide-svelte';
	import { THEMES, type Theme } from '$lib/themes';
	import { currentTheme } from '$lib/themeStore';
	import { lineNumbers, type LineNumberMode } from '$lib/lineNumberStore';
	import { tick } from 'svelte';

	export let show = false;

	let paletteView: 'root' | 'themes' | 'linenumbers' = 'root';

	const LINE_NUMBER_OPTIONS: { id: LineNumberMode; label: string }[] = [
		{ id: 'off', label: 'Off' },
		{ id: 'normal', label: 'Normal' },
		{ id: 'relative', label: 'Relative' },
		{ id: 'hybrid', label: 'Hybrid' }
	];
	let searchQuery = '';
	let searchInputEl: HTMLInputElement;

	let selectedIndex = 0;

	$: if (show) {
		paletteView = 'root';
		searchQuery = '';
		selectedIndex = 0;
		tick().then(() => searchInputEl?.focus());
	}

	$: filteredThemes = THEMES.filter((t) =>
		t.label.toLowerCase().includes(searchQuery.toLowerCase())
	);

	$: filteredLineNumbers = LINE_NUMBER_OPTIONS.filter((o) =>
		o.label.toLowerCase().includes(searchQuery.toLowerCase())
	);

	const COMMANDS = [
		{
			id: 'theme',
			label: 'Theme...',
			icon: Palette,
			action: () => {
				paletteView = 'themes';
				searchQuery = '';
				selectedIndex = 0;
				tick().then(() => searchInputEl?.focus());
			}
		},
		{
			id: 'linenumbers',
			label: 'Line Numbers...',
			icon: Hash,
			action: () => {
				paletteView = 'linenumbers';
				searchQuery = '';
				selectedIndex = 0;
				tick().then(() => searchInputEl?.focus());
			}
		}
	];

	$: filteredCommands = COMMANDS.filter((c) =>
		c.label.toLowerCase().includes(searchQuery.toLowerCase())
	);

	$: currentItems =
		paletteView === 'root'
			? filteredCommands
			: paletteView === 'themes'
				? filteredThemes
				: filteredLineNumbers;

	function handleKeydown(e: KeyboardEvent) {
		if (!show) return;

		if (['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(e.key)) {
			e.stopPropagation();
		}

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = (selectedIndex + 1) % currentItems.length;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = (selectedIndex - 1 + currentItems.length) % currentItems.length;
		} else if (e.key === 'Enter') {
			e.preventDefault();
			executeSelection(currentItems[selectedIndex]);
		} else if (e.key === 'Escape') {
			e.preventDefault();
			// If in submenu, go back; otherwise close
			if (paletteView !== 'root') {
				paletteView = 'root';
				searchQuery = '';
				selectedIndex = 0;
			} else {
				close();
			}
		}
	}

	function executeSelection(item: any) {
		if (!item) return;

		if (paletteView === 'root') {
			item.action();
		} else if (paletteView === 'themes') {
			$currentTheme = item;
			close();
		} else if (paletteView === 'linenumbers') {
			$lineNumbers = item.id;
			close();
		}
	}

	function close() {
		show = false;
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if show}
	<div
		role="dialog"
		aria-modal="true"
		class="animate-in fade-in fixed inset-0 z-[100] flex items-start justify-center bg-black/60 backdrop-blur-sm duration-150"
		on:mousedown|self={close}
	>
		<div
			class="mt-[15vh] flex max-h-[50vh] w-[450px] flex-col overflow-hidden rounded-lg border border-sub/20 bg-bg font-mono text-text shadow-2xl"
		>
			<div class="flex items-center gap-3 border-b border-sub/10 p-3">
				<Search size={14} class="text-main" />
				<input
					bind:this={searchInputEl}
					bind:value={searchQuery}
					on:input={() => (selectedIndex = 0)}
					type="text"
					placeholder={paletteView === 'root'
						? 'Type to search...'
						: paletteView === 'themes'
							? 'Search themes...'
							: 'Select line number mode...'}
					class="h-full w-full border-none bg-transparent text-xs text-text outline-none placeholder:text-sub/50"
				/>
			</div>

			<div class="overflow-y-auto p-1.5">
				{#if currentItems.length === 0}
					<div class="p-4 text-center text-xs text-sub/50">No results found.</div>
				{:else}
					{#each currentItems as item, i}
						<button
							class="group flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors
                            {i === selectedIndex
								? 'bg-sub/20 text-text'
								: 'text-sub hover:bg-sub/10 hover:text-text'}"
							on:click={() => executeSelection(item)}
							on:mouseenter={() => (selectedIndex = i)}
						>
							{#if paletteView === 'root'}
								<div class="flex items-center gap-3">
									<svelte:component
										this={'icon' in item ? item.icon : Palette}
										size={12}
										class={i === selectedIndex ? 'text-main' : 'text-sub'}
									/>
									<span>{item.label}</span>
								</div>
								<ChevronRight size={12} class="opacity-50" />
							{:else if paletteView === 'themes'}
								{@const theme = item as Theme}
								<div class="flex items-center gap-3">
									<div class="flex items-center gap-0.5">
										{#each [theme.colors.bg, theme.colors.main, theme.colors.sub] as color}
											<span
												class="h-2.5 w-2.5 rounded-full border border-white/10"
												style="background-color: rgb({color})"
											></span>
										{/each}
									</div>
									<span>{theme.label}</span>
								</div>
							{:else}
								<div class="flex items-center gap-3">
									<span>{item.label}</span>
									{#if $lineNumbers === (item as { id: LineNumberMode; label: string }).id}
										<span class="text-main">✓</span>
									{/if}
								</div>
							{/if}
						</button>
					{/each}
				{/if}
			</div>
		</div>
	</div>
{/if}
