import {
	Plugin,
	TFile,
} from 'obsidian';
import {
	DEFAULT_SETTINGS,
	FoldPropertiesSettings,
	FoldPropertiesSettingTab,
} from './settings';

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
	settings: FoldPropertiesSettings = DEFAULT_SETTINGS;
	private originalLoadPath: ((path: string) => FoldedProperties | null) | null = null;
	private originalSavePath: ((path: string, folds: FoldedProperties) => void) | null = null;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new FoldPropertiesSettingTab(this.app, this));
		this.patchFoldManager();
	}

	onunload() {
		this.unpatchFoldManager();
	}

	async loadSettings() {
		const loaded = (await this.loadData()) as Partial<FoldPropertiesSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded);
	}

	async saveSettings() {
		await this.saveData(this.settings);
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
				const abstractFile = this.app.vault.getAbstractFileByPath(path);
				const hasFrontmatter = abstractFile instanceof TFile &&
					Boolean(this.app.metadataCache.getFileCache(abstractFile)?.frontmatter);

				if (!hasFrontmatter || this.settings.foldMode === 'always') {
					return originalSave.call(foldManager, path, folds);
				}

				const currentFolds = Array.isArray(folds?.folds) ? folds.folds : [];
				const isFrontmatterFoldedInEditor = currentFolds.some(
					(f) => f.from === 0 && f.to === 0
				);

				let invertedFolds: Fold[];
				if (isFrontmatterFoldedInEditor) {
					// Editor is folded: Invert to Obsidian's default (unfolded, omitting from:0)
					invertedFolds = currentFolds.filter(
						(f) => !(f.from === 0 && f.to === 0)
					);
				} else {
					// Editor is unfolded: Invert to stored folded marker ({ from: 0, to: 0 })
					invertedFolds = [{ from: 0, to: 0 }, ...currentFolds];
				}

				return originalSave.call(foldManager, path, {
					folds: invertedFolds,
					lines: folds?.lines ?? 0,
				});
			};
		}

		foldManager.loadPath = (path: string): FoldedProperties | null => {
			const saved = originalLoad.call(foldManager, path);
			const abstractFile = this.app.vault.getAbstractFileByPath(path);
			const hasFrontmatter = abstractFile instanceof TFile &&
				Boolean(this.app.metadataCache.getFileCache(abstractFile)?.frontmatter);

			if (!hasFrontmatter) {
				return saved;
			}

			// In 'always' mode: ALWAYS return properties folded, even if user unfolded during previous visit
			if (this.settings.foldMode === 'always') {
				const currentFolds = Array.isArray(saved?.folds) ? saved.folds : [];
				const hasFold = currentFolds.some((f) => f.from === 0 && f.to === 0);
				if (hasFold) {
					return saved;
				}
				return {
					folds: [{ from: 0, to: 0 }, ...currentFolds],
					lines: saved?.lines ?? 0,
				};
			}

			// In 'remember' mode:
			// Initial state / No user manual override:
			// Invert default: return closed ({ from: 0, to: 0 })
			if (saved === null) {
				return {
					folds: [{ from: 0, to: 0 }],
					lines: 0,
				};
			}

			const currentFolds = Array.isArray(saved.folds) ? saved.folds : [];
			const hasStoredMarker = currentFolds.some(
				(f) => f.from === 0 && f.to === 0
			);

			if (hasStoredMarker) {
				// Stored marker present -> User manually opened this note!
				// Invert back: strip { from: 0, to: 0 } so the editor opens properties
				const otherFolds = currentFolds.filter(
					(f) => !(f.from === 0 && f.to === 0)
				);
				if (otherFolds.length === 0) {
					return null;
				}
				return {
					folds: otherFolds,
					lines: saved.lines,
				};
			}

			// Stored marker NOT present -> User manually closed or normal save:
			// Ensure { from: 0, to: 0 } is included so properties stay folded
			return {
				folds: [{ from: 0, to: 0 }, ...currentFolds],
				lines: saved.lines,
			};
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
