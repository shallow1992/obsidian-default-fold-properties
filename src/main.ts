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

	onload() {
		this.patchFoldManager();
	}

	onunload() {
		this.unpatchFoldManager();
	}

	/**
	 * Patches app.foldManager.loadPath so that notes without prior fold history
	 * default to collapsed ({ from: 0, to: 0 }) BEFORE Obsidian renders the DOM.
	 *
	 * If the user has manually opened or closed the properties on a note,
	 * Obsidian saves that state (loadPath returns non-null), and this patch
	 * respects the user's manual choice without overriding it.
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

			// If Obsidian has a saved state (e.g. user manually opened or folded), respect it 100%
			if (saved !== null) {
				return saved;
			}

			// For unrecorded notes, invert the default:
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

		if (foldManager && this.originalLoadPath) {
			foldManager.loadPath = this.originalLoadPath;
			this.originalLoadPath = null;
		}
	}
}
