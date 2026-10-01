export interface Fold {
	from: number;
	to: number;
}

export interface FoldedProperties {
	folds: Fold[];
	lines: number;
}

export interface FoldManager {
	loadPath: (path: string) => FoldedProperties | null;
	savePath: (path: string, folds: FoldedProperties) => void;
}

export interface InternalApp {
	appId?: string;
	foldManager?: FoldManager;
}

export type FoldMode = 'remember' | 'always';

export interface FoldPropertiesSettings {
	foldMode: FoldMode;
}
