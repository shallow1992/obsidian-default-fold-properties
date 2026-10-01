import {
	MarkdownView,
	Plugin,
	TFile,
} from 'obsidian';
import {
	DEFAULT_SETTINGS,
	FoldPropertiesPluginSettings,
	FoldPropertiesSettingTab,
} from './settings';

declare module 'obsidian' {
	interface App {
		commands: {
			executeCommandById(commandId: string): boolean;
		};
	}
}

export default class FoldPropertiesPlugin extends Plugin {
	settings!: FoldPropertiesPluginSettings;

	private pendingFoldTimeout: number | null = null;
	private manuallyExpandedPaths: Set<string> = new Set();
	private activeObservedContainer: Element | null = null;
	private mutationObserver: MutationObserver | null = null;

	private static readonly RETRY_DELAY_MS = 50;
	private static readonly MAX_FOLD_ATTEMPTS = 15;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new FoldPropertiesSettingTab(this.app, this));

		this.setupObserver();

		this.app.workspace.onLayoutReady(() => {
			this.registerEvent(
				this.app.workspace.on('file-open', (file: TFile | null) => {
					this.handleFileOrLeafChange(file);
				}),
			);

			this.registerEvent(
				this.app.workspace.on('active-leaf-change', () => {
					const activeFile = this.app.workspace.getActiveFile();
					this.handleFileOrLeafChange(activeFile);
				}),
			);

			this.registerEvent(
				this.app.workspace.on('layout-change', () => {
					const activeFile = this.app.workspace.getActiveFile();
					this.handleFileOrLeafChange(activeFile);
				}),
			);

			// Trigger for initially active file
			const initialFile = this.app.workspace.getActiveFile();
			if (initialFile) {
				this.handleFileOrLeafChange(initialFile);
			}
		});
	}

	onunload() {
		this.clearPendingFold();
		if (this.mutationObserver) {
			this.mutationObserver.disconnect();
			this.mutationObserver = null;
		}
		this.manuallyExpandedPaths.clear();
	}

	private handleFileOrLeafChange(file: TFile | null) {
		this.clearPendingFold();

		if (!file) {
			return;
		}

		// If configured to keep state and user previously expanded this note, don't auto-fold
		if (
			this.settings.reactivationBehavior === 'keep' &&
			this.manuallyExpandedPaths.has(file.path)
		) {
			this.attachObserverToActiveLeaf(file);
			return;
		}

		this.scheduleFold(file, 0);
	}

	private scheduleFold(file: TFile, attempt: number) {
		this.pendingFoldTimeout = window.setTimeout(() => {
			this.pendingFoldTimeout = null;

			// Ensure active file hasn't changed during delay
			if (this.app.workspace.getActiveFile()?.path !== file.path) {
				return;
			}

			const activeView =
				this.app.workspace.getActiveViewOfType(MarkdownView);
			if (!activeView) {
				if (attempt < FoldPropertiesPlugin.MAX_FOLD_ATTEMPTS) {
					this.scheduleFold(file, attempt + 1);
				}
				return;
			}

			const leafEl = activeView.containerEl;
			const metadataContainer = leafEl.querySelector('.metadata-container');

			if (!metadataContainer) {
				if (attempt < FoldPropertiesPlugin.MAX_FOLD_ATTEMPTS) {
					this.scheduleFold(file, attempt + 1);
				}
				return;
			}

			// If properties are not collapsed, trigger fold
			if (!metadataContainer.classList.contains('is-collapsed')) {
				this.app.commands.executeCommandById(
					'editor:toggle-fold-properties',
				);
			}

			this.attachObserverToContainer(metadataContainer, file.path);
		}, FoldPropertiesPlugin.RETRY_DELAY_MS);
	}

	private setupObserver() {
		this.mutationObserver = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				if (
					mutation.type === 'attributes' &&
					mutation.attributeName === 'class'
				) {
					const target = mutation.target as HTMLElement;
					const activeFile = this.app.workspace.getActiveFile();
					if (!activeFile) continue;

					if (!target.classList.contains('is-collapsed')) {
						// User manually expanded it
						this.manuallyExpandedPaths.add(activeFile.path);
					} else {
						// User manually collapsed it
						this.manuallyExpandedPaths.delete(activeFile.path);
					}
				}
			}
		});
	}

	private attachObserverToActiveLeaf(file: TFile) {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) return;
		const metadataContainer =
			activeView.containerEl.querySelector('.metadata-container');
		if (metadataContainer) {
			this.attachObserverToContainer(metadataContainer, file.path);
		}
	}

	private attachObserverToContainer(
		container: Element,
		_filePath: string,
	) {
		if (this.activeObservedContainer === container) {
			return;
		}

		if (this.mutationObserver) {
			this.mutationObserver.disconnect();
			this.mutationObserver.observe(container, {
				attributes: true,
				attributeFilter: ['class'],
			});
			this.activeObservedContainer = container;
		}
	}

	private clearPendingFold() {
		if (this.pendingFoldTimeout !== null) {
			window.clearTimeout(this.pendingFoldTimeout);
			this.pendingFoldTimeout = null;
		}
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<FoldPropertiesPluginSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
