import { App, TFile } from 'obsidian';
import type {
	Fold,
	FoldedProperties,
	FoldManager,
	FoldPropertiesSettings,
	InternalApp,
} from './types';

export class FoldManagerService {
	private app: App;
	private settingsProvider: () => FoldPropertiesSettings;
	private originalLoadPath: ((path: string) => FoldedProperties | null) | null = null;
	private originalSavePath: ((path: string, folds: FoldedProperties) => void) | null = null;

	constructor(app: App, settingsProvider: () => FoldPropertiesSettings) {
		this.app = app;
		this.settingsProvider = settingsProvider;
	}

	private getFoldManager(): FoldManager | null {
		const internalApp = this.app as unknown as InternalApp;
		const foldManager = internalApp.foldManager;
		if (
			foldManager &&
			typeof foldManager.loadPath === 'function' &&
			typeof foldManager.savePath === 'function'
		) {
			return foldManager;
		}
		return null;
	}

	private hasFrontmatter(path: string): boolean {
		const file = this.app.vault.getAbstractFileByPath(path);
		return (
			file instanceof TFile &&
			Boolean(this.app.metadataCache.getFileCache(file)?.frontmatter)
		);
	}

	patch(): void {
		const foldManager = this.getFoldManager();
		if (!foldManager) {
			return;
		}

		const originalLoad = foldManager.loadPath;
		const originalSave = foldManager.savePath;
		this.originalLoadPath = originalLoad;
		this.originalSavePath = originalSave;

		foldManager.savePath = (path: string, folds: FoldedProperties) => {
			const settings = this.settingsProvider();
			if (!this.hasFrontmatter(path) || settings.foldMode === 'always') {
				return originalSave.call(foldManager, path, folds);
			}

			const currentFolds = Array.isArray(folds?.folds) ? folds.folds : [];
			const isFoldedInEditor = currentFolds.some(
				(f) => f.from === 0 && f.to === 0
			);

			let invertedFolds: Fold[];
			if (isFoldedInEditor) {
				// Editor is folded: Invert to Obsidian default (unfolded, omitting from:0)
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

		foldManager.loadPath = (path: string): FoldedProperties | null => {
			const saved = originalLoad.call(foldManager, path);
			if (!this.hasFrontmatter(path)) {
				return saved;
			}

			const settings = this.settingsProvider();

			// In 'always' mode: ALWAYS return properties folded, even if user unfolded previously
			if (settings.foldMode === 'always') {
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
			// 1. Initial state (no user manual operation): default to collapsed
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
				// Invert back: strip { from: 0, to: 0 } so properties are displayed unfolded
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

			// Stored marker NOT present -> User manually closed:
			// Ensure { from: 0, to: 0 } is included so properties stay folded
			return {
				folds: [{ from: 0, to: 0 }, ...currentFolds],
				lines: saved.lines,
			};
		};
	}

	unpatch(): void {
		const foldManager = this.getFoldManager();
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

	/**
	 * Scans localStorage for Obsidian's note-fold entries and removes
	 * any frontmatter fold marker ({ from: 0, to: 0 }).
	 * If no other folds remain on that note, the localStorage key is removed.
	 */
	resetAllPropertyFolds(): number {
		let resetCount = 0;
		if (typeof window === 'undefined' || !window.localStorage) {
			return resetCount;
		}

		const internalApp = this.app as unknown as InternalApp;
		const appId = internalApp.appId;
		const prefix = appId ? `${appId}-note-fold-` : '-note-fold-';

		const keysToProcess: string[] = [];
		for (let i = 0; i < window.localStorage.length; i++) {
			const key = window.localStorage.key(i);
			if (key && (key.includes('-note-fold-') || (appId && key.startsWith(prefix)))) {
				keysToProcess.push(key);
			}
		}

		for (const key of keysToProcess) {
			try {
				const item = window.localStorage.getItem(key);
				if (!item) continue;

				const data = JSON.parse(item) as FoldedProperties;
				if (Array.isArray(data?.folds)) {
					const hasFrontmatterFold = data.folds.some((f) => f.from === 0 && f.to === 0);
					if (hasFrontmatterFold) {
						const remainingFolds = data.folds.filter((f) => !(f.from === 0 && f.to === 0));
						if (remainingFolds.length === 0) {
							window.localStorage.removeItem(key);
						} else {
							data.folds = remainingFolds;
							window.localStorage.setItem(key, JSON.stringify(data));
						}
						resetCount++;
					}
				}
			} catch {
				// Ignore non-JSON entries
			}
		}

		return resetCount;
	}
}
