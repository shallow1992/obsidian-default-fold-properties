import { App, PluginSettingTab, Setting } from 'obsidian';
import FoldPropertiesPlugin from './main';

export type ReactivationBehavior = 'always' | 'keep';

export interface FoldPropertiesPluginSettings {
	reactivationBehavior: ReactivationBehavior;
}

export const DEFAULT_SETTINGS: FoldPropertiesPluginSettings = {
	reactivationBehavior: 'always',
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
			.setName('Re-fold on note reactivation')
			.setDesc(
				'Choose whether to always fold properties when switching back to a note, or preserve its opened state during the current session.',
			)
			.addDropdown((dropdown) =>
				dropdown
					.addOption('always', 'Always fold properties')
					.addOption('keep', 'Keep opened state in current session')
					.setValue(this.plugin.settings.reactivationBehavior)
					.onChange(async (value) => {
						this.plugin.settings.reactivationBehavior =
							value as ReactivationBehavior;
						await this.plugin.saveSettings();
					}),
			);
	}
}
