import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import type FoldPropertiesPlugin from './main';
import type { FoldMode, FoldPropertiesSettings } from './types';

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

		new Setting(containerEl)
			.setName('Reset all fold states')
			.setDesc(
				'Clear stored fold states for frontmatter properties in Obsidian storage. Use this before uninstalling or to restore Obsidian default behavior.'
			)
			.addButton((button) => {
				button
					.setButtonText('Reset fold states')
					.setWarning()
					.onClick(() => {
						const count = this.plugin.resetAllPropertyFolds();
						new Notice(`Reset property fold states for ${count} notes.`);
					});
			});
	}
}
