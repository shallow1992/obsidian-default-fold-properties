import {
	MarkdownView,
	Plugin,
	TFile,
} from 'obsidian';

interface Fold {
	from: number;
	to: number;
}

interface FoldedProperties {
	folds: Fold[];
	lines: number;
}

interface FoldManager {
	loadPath: (path: string) => FoldedProperties | null;
	savePath: (path: string, folds: FoldedProperties) => void;
}

interface InternalApp {
	foldManager?: FoldManager;
	commands: {
		executeCommandById(commandId: string): boolean;
	};
}

export default class FoldPropertiesPlugin extends Plugin {
	private originalLoadPath: ((path: string) => FoldedProperties | null) | null = null;
	private pendingFoldTimeout: number | null = null;
	private static readonly RETRY_DELAY_MS = 30;
	private static readonly MAX_FOLD_ATTEMPTS = 15;

	async onload() {
		this.patchFoldManager();

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

			const initialFile = this.app.workspace.getActiveFile();
			if (initialFile) {
				this.handleFileOrLeafChange(initialFile);
			}
		});
	}

	onunload() {
		this.unpatchFoldManager();
		this.clearPendingFold();
	}

	/**
	 * Patches app.foldManager.loadPath so that notes without prior fold history
	 * default to collapsed ({ from: 0, to: 0 }) BEFORE Obsidian renders the DOM.
	 * This prevents any visual layout shifts or slow-closing animations.
	 */
	private patchFoldManager() {
		const internalApp = this.app as unknown as InternalApp;
		const foldManager = internalApp.foldManager;

		if (!foldManager || typeof foldManager.loadPath !== 'function') {
			return;
		}

		const originalMethod = foldManager.loadPath;
		this.originalLoadPath = originalMethod;

		foldManager.loadPath = (path: string): FoldedProperties | null => {
			const saved = originalMethod.call(foldManager, path);

			// If the user or Obsidian already has saved fold state for this note, respect it
			if (saved !== null) {
				return saved;
			}

			// For notes with no prior fold state, check if frontmatter exists at open time
			const abstractFile = this.app.vault.getAbstractFileByPath(path);
			if (abstractFile instanceof TFile) {
				const cache = this.app.metadataCache.getFileCache(abstractFile);
				if (cache?.frontmatter) {
					// Default to collapsed for notes that have frontmatter!
					return {
						folds: [{ from: 0, to: 0 }],
						lines: 0,
					};
				}
			}

			return null;
		};
	}

	private unpatchFoldManager() {
		const internalApp = this.app as unknown as InternalApp;
		const foldManager = internalApp.foldManager;

		if (foldManager && this.originalLoadPath) {
			foldManager.loadPath = this.originalLoadPath;
			this.originalLoadPath = null;
		}
	}

	/**
	 * Fallback / synchronization handler in case foldManager is unavailable
	 * or for dynamically rendered views.
	 */
	private handleFileOrLeafChange(file: TFile | null) {
		this.clearPendingFold();

		if (!file) {
			return;
		}

		const fileCache = this.app.metadataCache.getFileCache(file);
		if (!fileCache?.frontmatter) {
			return;
		}

		this.scheduleFold(file, 0);
	}

	private scheduleFold(file: TFile, attempt: number) {
		this.pendingFoldTimeout = window.setTimeout(() => {
			this.pendingFoldTimeout = null;

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

			// If properties are not collapsed, trigger fold instantly
			if (!metadataContainer.classList.contains('is-collapsed')) {
				const internalApp = this.app as unknown as InternalApp;
				internalApp.commands.executeCommandById(
					'editor:toggle-fold-properties',
				);
			}
		}, FoldPropertiesPlugin.RETRY_DELAY_MS);
	}

	private clearPendingFold() {
		if (this.pendingFoldTimeout !== null) {
			window.clearTimeout(this.pendingFoldTimeout);
			this.pendingFoldTimeout = null;
		}
	}
}
