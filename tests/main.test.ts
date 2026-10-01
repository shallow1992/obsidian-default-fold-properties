import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import FoldPropertiesPlugin from "../src/main";
import { App, MarkdownView, TFile } from "obsidian";

describe("FoldPropertiesPlugin", () => {
	let plugin: FoldPropertiesPlugin;
	let app: App;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();

		// Mock window and timer functions
		(globalThis as any).window = {
			setTimeout: (fn: Function, ms: number) => setTimeout(fn, ms),
			clearTimeout: (id: any) => clearTimeout(id),
		};
		(globalThis as any).MutationObserver = vi.fn().mockImplementation(() => ({
			observe: vi.fn(),
			disconnect: vi.fn(),
		}));

		// Mock minimal DOM structure
		(globalThis as any).document = {
			createElement: vi.fn().mockImplementation((tag: string) => {
				const listeners: Record<string, Function[]> = {};
				const classes = new Set<string>();
				const children: any[] = [];
				const el: any = {
					tagName: tag.toUpperCase(),
					className: "",
					classList: {
						add: (cls: string) => classes.add(cls),
						remove: (cls: string) => classes.delete(cls),
						contains: (cls: string) =>
							classes.has(cls) || (el.className && el.className.split(" ").includes(cls)),
					},
					appendChild: (child: any) => children.push(child),
					querySelector: vi.fn().mockImplementation((sel: string) => {
						if (sel === ".metadata-container") {
							return children.find(
								(c) =>
									c.className &&
									c.className.includes("metadata-container")
							) || null;
						}
						return null;
					}),
					addEventListener: vi.fn((event, handler) => {
						listeners[event] = listeners[event] || [];
						listeners[event].push(handler);
					}),
				};
				return el;
			}),
		};

		app = new App();
		plugin = new FoldPropertiesPlugin(app, {
			id: "obsidian-fold-properties",
			name: "Fold Properties",
			version: "0.1.0",
			minAppVersion: "1.0.0",
			description: "Fold frontmatter properties by default when opening notes.",
			author: "shallow1992",
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should load default settings and register event listeners on onload", async () => {
		await plugin.onload();

		expect(plugin.settings).toBeDefined();
		expect(plugin.settings.reactivationBehavior).toBe("always");
		expect(plugin.addSettingTab).toHaveBeenCalled();
		expect(plugin.registerEvent).toHaveBeenCalled();
	});

	it("should save settings correctly", async () => {
		await plugin.onload();
		plugin.settings.reactivationBehavior = "keep";
		const saveSpy = vi.spyOn(plugin, "saveData");

		await plugin.saveSettings();
		expect(saveSpy).toHaveBeenCalledWith({ reactivationBehavior: "keep" });
	});

	it("should fold properties when an unfolded note is opened", async () => {
		const mockFile = { path: "test.md" } as TFile;
		(app.workspace.getActiveFile as any).mockReturnValue(mockFile);

		const metadataContainer = document.createElement("div");
		metadataContainer.className = "metadata-container";

		const leafContainer = document.createElement("div");
		leafContainer.appendChild(metadataContainer);

		const mockView = {
			containerEl: leafContainer,
		} as unknown as MarkdownView;

		(app.workspace.getActiveViewOfType as any).mockReturnValue(mockView);

		await plugin.onload();

		// Fast forward timer for scheduleFold
		vi.advanceTimersByTime(100);

		expect(app.commands.executeCommandById).toHaveBeenCalledWith(
			"editor:toggle-fold-properties"
		);
	});

	it("should not fold properties if already collapsed", async () => {
		const mockFile = { path: "collapsed.md" } as TFile;
		(app.workspace.getActiveFile as any).mockReturnValue(mockFile);

		const metadataContainer = document.createElement("div");
		metadataContainer.className = "metadata-container is-collapsed";

		const leafContainer = document.createElement("div");
		leafContainer.appendChild(metadataContainer);

		const mockView = {
			containerEl: leafContainer,
		} as unknown as MarkdownView;

		(app.workspace.getActiveViewOfType as any).mockReturnValue(mockView);

		await plugin.onload();

		vi.advanceTimersByTime(100);

		expect(app.commands.executeCommandById).not.toHaveBeenCalled();
	});
});
