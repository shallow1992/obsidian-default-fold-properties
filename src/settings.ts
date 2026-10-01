import { App, PluginSettingTab, Setting } from 'obsidian';
import type FoldPropertiesPlugin from './main';

export type FoldMode = 'remember' | 'always';

export interface FoldPropertiesSettings {
	foldMode: FoldMode;
}

export const DEFAULT_SETTINGS: FoldPropertiesSettings = {
	foldMode: 'remember',
};

export class FoldPropertiesSettingTab extends PluginSettingTab {
	plugin: FoldPropertiesPlugin;

	constructor(app: App, plugin: FoldPropertiesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Fold behavior')
			.setDesc(
				'Choose whether to remember manually opened properties or always fold properties when opening a note.'
			)
			.addDropdown((dropdown) => {
				dropdown
					.addOption('remember', 'Remember state (default folded)')
					.addOption('always', 'Always fold')
					.setValue(this.plugin.settings.foldMode)
					.onChange(async (value) => {
						this.plugin.settings.foldMode = value as FoldMode;
						await this.plugin.saveSettings();
					});
			});
	}
}
