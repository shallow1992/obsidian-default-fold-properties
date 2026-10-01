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

interface FoldPropertiesData {
	unfoldedPaths: Record<string, boolean>;
}

const DEFAULT_DATA: FoldPropertiesData = {
	unfoldedPaths: {},
};

export default class FoldPropertiesPlugin extends Plugin {
	private data: FoldPropertiesData = DEFAULT_DATA;
	private originalLoadPath: ((path: string) => FoldedProperties | null) | null = null;
	private originalSavePath: ((path: string, folds: FoldedProperties) => void) | null = null;

	async onload() {
		await this.loadPluginData();
		this.patchFoldManager();
	}

	onunload() {
		this.unpatchFoldManager();
	}

	private async loadPluginData() {
		const loaded = (await this.loadData()) as Partial<FoldPropertiesData> | null;
		this.data = Object.assign({}, DEFAULT_DATA, loaded);
		if (!this.data.unfoldedPaths) {
			this.data.unfoldedPaths = {};
		}
	}

	private async savePluginData() {
		await this.saveData(this.data);
	}

	private patchFoldManager() {
		const internalApp = this.app as unknown as InternalApp;
		const foldManager = internalApp.foldManager;

		if (!foldManager || typeof foldManager.loadPath !== 'function') {
			return;
		}

		const originalLoad = foldManager.loadPath;
		this.originalLoadPath = originalLoad;

		const originalSave = foldManager.savePath;
		this.originalSavePath = originalSave;

		if (typeof originalSave === 'function') {
			foldManager.savePath = (path: string, folds: FoldedProperties) => {
				// If user unfolded properties (folds is empty [] or has no frontmatter fold from:0),
				// Obsidian will remove the entry from its storage on unload.
				// We record that the user intentionally opened this note so we don't re-fold it!
				const hasFold = Array.isArray(folds?.folds) && folds.folds.length > 0;
				if (!hasFold) {
					if (!this.data.unfoldedPaths[path]) {
						this.data.unfoldedPaths[path] = true;
						void this.savePluginData();
					}
				} else {
					if (this.data.unfoldedPaths[path]) {
						delete this.data.unfoldedPaths[path];
						void this.savePluginData();
					}
				}

				return originalSave.call(foldManager, path, folds);
			};
		}

		foldManager.loadPath = (path: string): FoldedProperties | null => {
			const saved = originalLoad.call(foldManager, path);

			// 1. If Obsidian has a saved state, respect it
			if (saved !== null) {
				return saved;
			}

			// 2. If user previously opened this note (unfolded), respect that choice and return null
			if (this.data.unfoldedPaths[path]) {
				return null;
			}

			// 3. For unrecorded notes, invert the default:
			// If frontmatter exists when opened, default to collapsed
			const abstractFile = this.app.vault.getAbstractFileByPath(path);
			if (abstractFile instanceof TFile) {
				const cache = this.app.metadataCache.getFileCache(abstractFile);
				if (cache?.frontmatter) {
					return {
						folds: [{ from: 0, to: 0 }],
						lines: 0,
					};
				}
			}

			// Notes without frontmatter remain open (null)
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
