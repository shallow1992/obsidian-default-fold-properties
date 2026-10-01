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
			version: "0.5.1",
			minAppVersion: "1.0.0",
			description: "Fold frontmatter properties by default when opening notes.",
			author: "shallow1992",
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should patch app.foldManager.loadPath and default to collapsed for notes with frontmatter", async () => {
		const mockFile = Object.assign(new TFile(), { path: "with-frontmatter.md" });
		(app.vault.getAbstractFileByPath as any).mockReturnValue(mockFile);
		(app.metadataCache.getFileCache as any).mockReturnValue({
			frontmatter: { title: "Test" },
		});

		await plugin.onload();

		// Calling loadPath on a note without previous save should return { from: 0, to: 0 }
		const foldData = (app as any).foldManager.loadPath("with-frontmatter.md");
		expect(foldData).toEqual({
			folds: [{ from: 0, to: 0 }],
			lines: 0,
		});
	});

	it("should NOT default to collapsed when note has NO frontmatter", async () => {
		const mockFile = Object.assign(new TFile(), { path: "no-frontmatter.md" });
		(app.vault.getAbstractFileByPath as any).mockReturnValue(mockFile);
		(app.metadataCache.getFileCache as any).mockReturnValue(null);

		await plugin.onload();

		const foldData = (app as any).foldManager.loadPath("no-frontmatter.md");
		expect(foldData).toBeNull();
	});

	it("should respect existing saved fold state if user manually operated", async () => {
		const mockFile = Object.assign(new TFile(), { path: "existing.md" });
		(app.vault.getAbstractFileByPath as any).mockReturnValue(mockFile);
		(app.metadataCache.getFileCache as any).mockReturnValue({
			frontmatter: { title: "Existing" },
		});

		// Mock that foldManager already has saved data (e.g. user unfolded it, so folds is empty)
		const savedData = { folds: [], lines: 50 };
		const originalLoad = (app as any).foldManager.loadPath;
		originalLoad.mockReturnValue(savedData);

		await plugin.onload();

		const result = (app as any).foldManager.loadPath("existing.md");
		expect(result).toBe(savedData);
	});

	it("should restore original foldManager.loadPath on onunload", async () => {
		const originalLoad = (app as any).foldManager.loadPath;

		await plugin.onload();
		expect((app as any).foldManager.loadPath).not.toBe(originalLoad);

		plugin.onunload();
		expect((app as any).foldManager.loadPath).toBe(originalLoad);
	});
});
