import {
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
}

export default class FoldPropertiesPlugin extends Plugin {
	private originalLoadPath: ((path: string) => FoldedProperties | null) | null = null;
	private originalSavePath: ((path: string, folds: FoldedProperties) => void) | null = null;

	onload() {
		console.log('[FoldProperties] Plugin loaded');
		this.patchFoldManager();
	}

	onunload() {
		console.log('[FoldProperties] Plugin unloaded');
		this.unpatchFoldManager();
	}

	private patchFoldManager() {
		const internalApp = this.app as unknown as InternalApp;
		const foldManager = internalApp.foldManager;

		console.log('[FoldProperties] Checking foldManager:', foldManager);

		if (!foldManager || typeof foldManager.loadPath !== 'function') {
			console.warn('[FoldProperties] foldManager or loadPath not found!');
			return;
		}

		const originalLoad = foldManager.loadPath;
		this.originalLoadPath = originalLoad;

		const originalSave = foldManager.savePath;
		this.originalSavePath = originalSave;

		if (typeof originalSave === 'function') {
			foldManager.savePath = (path: string, folds: FoldedProperties) => {
				console.log(`[FoldProperties] savePath called for "${path}":`, JSON.stringify(folds));
				return originalSave.call(foldManager, path, folds);
			};
		}

		foldManager.loadPath = (path: string): FoldedProperties | null => {
			const saved = originalLoad.call(foldManager, path);
			console.log(`[FoldProperties] loadPath called for "${path}". Original returned:`, JSON.stringify(saved));

			// If Obsidian has a saved state (e.g. user manually opened or folded), respect it 100%
			if (saved !== null) {
				console.log(`[FoldProperties] Returning saved state for "${path}":`, JSON.stringify(saved));
				return saved;
			}

			// For unrecorded notes, invert the default:
			// If frontmatter exists when opened, default to collapsed
			const abstractFile = this.app.vault.getAbstractFileByPath(path);
			if (abstractFile instanceof TFile) {
				const cache = this.app.metadataCache.getFileCache(abstractFile);
				console.log(`[FoldProperties] File cache for "${path}":`, cache?.frontmatter);
				if (cache?.frontmatter) {
					const defaultFold = {
						folds: [{ from: 0, to: 0 }],
						lines: 0,
					};
					console.log(`[FoldProperties] Applying default collapsed state for "${path}":`, JSON.stringify(defaultFold));
					return defaultFold;
				}
			}

			// Notes without frontmatter remain open (null)
			console.log(`[FoldProperties] No frontmatter or not TFile for "${path}", returning null`);
			return null;
		};
	}

	private unpatchFoldManager() {
		const internalApp = this.app as unknown as InternalApp;
		const foldManager = internalApp.foldManager;

		if (foldManager) {
			if (this.originalLoadPath) {
				foldManager.loadPath = this.originalLoadPath;
				this.originalLoadPath = null;
			}
			if (this.originalSavePath) {
				foldManager.savePath = this.originalSavePath;
				this.originalSavePath = null;
			}
		}
	}
}
