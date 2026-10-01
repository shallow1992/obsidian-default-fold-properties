import { Plugin } from 'obsidian';
import { FoldManagerService } from './foldManager';
import { DEFAULT_SETTINGS, FoldPropertiesSettingTab } from './settings';
import type { FoldPropertiesSettings } from './types';

export default class FoldPropertiesPlugin extends Plugin {
	settings: FoldPropertiesSettings = DEFAULT_SETTINGS;
	private foldService: FoldManagerService | null = null;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new FoldPropertiesSettingTab(this.app, this));

		this.foldService = new FoldManagerService(this.app, () => this.settings);
		this.foldService.patch();
	}

	onunload() {
		if (this.foldService) {
			this.foldService.unpatch();
			this.foldService = null;
		}
	}

	async loadSettings() {
		const loaded = (await this.loadData()) as Partial<FoldPropertiesSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	resetAllPropertyFolds(): number {
		if (this.foldService) {
			return this.foldService.resetAllPropertyFolds();
		}
		const tempService = new FoldManagerService(this.app, () => this.settings);
		return tempService.resetAllPropertyFolds();
	}
}
