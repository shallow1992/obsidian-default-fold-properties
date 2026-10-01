import { describe, it, expect, vi, beforeEach } from "vitest";
import MyPlugin from "../src/main";
import { App } from "obsidian";

describe("MyPlugin", () => {
	let plugin: MyPlugin;
	let app: App;

	beforeEach(() => {
		vi.clearAllMocks();
		(globalThis as any).window = globalThis;
		(globalThis as any).activeDocument = {
			addEventListener: vi.fn(),
		};
		app = new App();
		plugin = new MyPlugin(app, {
			id: "obsidian-plugin-template",
			name: "Template Plugin",
			version: "1.0.0",
			minAppVersion: "1.0.0",
			description: "Template",
			author: "shallow1992",
		});
	});

	it("should load settings and register commands on onload", async () => {
		await plugin.onload();

		expect(plugin.settings).toBeDefined();
		expect(plugin.settings.mySetting).toBe("default");
		expect(plugin.addRibbonIcon).toHaveBeenCalledWith("dice", "Sample", expect.any(Function));
		expect(plugin.addStatusBarItem).toHaveBeenCalled();
		expect(plugin.addCommand).toHaveBeenCalled();
		expect(plugin.addSettingTab).toHaveBeenCalled();
		expect(plugin.registerDomEvent).toHaveBeenCalled();
		expect(plugin.registerInterval).toHaveBeenCalled();
	});

	it("should save settings correctly", async () => {
		await plugin.onload();
		plugin.settings.mySetting = "updated-setting";
		const saveSpy = vi.spyOn(plugin, "saveData");

		await plugin.saveSettings();
		expect(saveSpy).toHaveBeenCalledWith({ mySetting: "updated-setting" });
	});
});
