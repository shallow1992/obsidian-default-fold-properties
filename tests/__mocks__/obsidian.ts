import { vi } from "vitest";

export const Platform = {
	isMobile: false,
	isDesktop: true,
	isMacOS: true,
	isWin: false,
	isLinux: false,
	isIosApp: false,
	isAndroidApp: false,
};

export class App {
	workspace = {
		getActiveViewOfType: vi.fn(),
		on: vi.fn(),
		openLinkText: vi.fn(),
	};
	vault = {
		cachedRead: vi.fn().mockResolvedValue("test content"),
		read: vi.fn().mockResolvedValue("test content"),
		modify: vi.fn().mockResolvedValue(undefined),
		on: vi.fn(),
	};
}

export class Plugin {
	app: App;
	manifest: any;

	constructor(app?: any, manifest?: any) {
		this.app = app || new App();
		this.manifest = manifest || { id: "test-plugin", name: "Test Plugin" };
	}

	addCommand = vi.fn();
	addRibbonIcon = vi.fn().mockReturnValue({ remove: vi.fn() });
	addStatusBarItem = vi.fn().mockReturnValue({
		setText: vi.fn(),
	});
	addSettingTab = vi.fn();
	registerView = vi.fn();
	registerEvent = vi.fn();
	registerDomEvent = vi.fn();
	registerInterval = vi.fn();

	loadData() {
		return Promise.resolve({});
	}

	saveData(_data: any) {
		return Promise.resolve();
	}
}

export class Notice {
	constructor(public message: string) {}
}

export class Modal {
	contentEl = {
		setText: vi.fn(),
		empty: vi.fn(),
		createDiv: vi.fn().mockReturnValue({
			setText: vi.fn(),
			createEl: vi.fn(),
		}),
		createEl: vi.fn(),
	};

	constructor(public app: App) {}

	open = vi.fn(() => this.onOpen());
	close = vi.fn(() => this.onClose());
	onOpen() {}
	onClose() {}
}

export class PluginSettingTab {
	containerEl = {
		empty: vi.fn(),
		createDiv: vi.fn().mockReturnValue({
			setText: vi.fn(),
		}),
		createEl: vi.fn(),
	};

	constructor(public app: App, public plugin: any) {}
	display() {}
	hide() {}
}

export class Setting {
	constructor(public containerEl: any) {}

	setName = vi.fn().mockReturnThis();
	setDesc = vi.fn().mockReturnThis();
	addText = vi.fn().mockImplementation((cb) => {
		cb({
			setPlaceholder: vi.fn().mockReturnThis(),
			setValue: vi.fn().mockReturnThis(),
			onChange: vi.fn().mockReturnThis(),
		});
		return this;
	});
	addToggle = vi.fn().mockImplementation((cb) => {
		cb({
			setValue: vi.fn().mockReturnThis(),
			onChange: vi.fn().mockReturnThis(),
		});
		return this;
	});
	addButton = vi.fn().mockImplementation((cb) => {
		cb({
			setButtonText: vi.fn().mockReturnThis(),
			onClick: vi.fn().mockReturnThis(),
		});
		return this;
	});
}

export class ItemView {
	contentEl = {
		empty: vi.fn(),
		addClass: vi.fn(),
		createDiv: vi.fn().mockReturnValue({
			createDiv: vi.fn().mockReturnValue({
				createEl: vi.fn(),
			}),
			createEl: vi.fn(),
		}),
	};
	constructor(public leaf: any) {}
}

export class WorkspaceLeaf {}
export class MarkdownView {}
export class Editor {}
