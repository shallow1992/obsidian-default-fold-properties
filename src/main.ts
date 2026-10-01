import {
	MarkdownView,
	Plugin,
	TFile,
} from 'obsidian';

declare module 'obsidian' {
	interface App {
		commands: {
			executeCommandById(commandId: string): boolean;
		};
	}
}

export default class FoldPropertiesPlugin extends Plugin {
	private pendingFoldTimeout: number | null = null;
	private static readonly RETRY_DELAY_MS = 30;
	private static readonly MAX_FOLD_ATTEMPTS = 15;

	async onload() {
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

			// Trigger for initially active file on startup
			const initialFile = this.app.workspace.getActiveFile();
			if (initialFile) {
				this.handleFileOrLeafChange(initialFile);
			}
		});
	}

	onunload() {
		this.clearPendingFold();
	}

	private handleFileOrLeafChange(file: TFile | null) {
		this.clearPendingFold();

		if (!file) {
			return;
		}

		// Only fold if the note already has frontmatter/properties when opened.
		// If a note opens without frontmatter, we do not fold so the user can
		// add new properties during their editing session without disruption.
		const fileCache = this.app.metadataCache.getFileCache(file);
		if (!fileCache?.frontmatter) {
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

			// If properties are not collapsed, trigger fold instantly
			if (!metadataContainer.classList.contains('is-collapsed')) {
				this.app.commands.executeCommandById(
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
