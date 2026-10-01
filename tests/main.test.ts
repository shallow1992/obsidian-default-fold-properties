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
			version: "0.9.0",
			minAppVersion: "1.0.0",
			description: "Fold frontmatter properties by default when opening notes.",
			author: "shallow1992",
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should return collapsed fold data for unopened note with frontmatter", async () => {
		const mockFile = Object.assign(new TFile(), { path: "initial.md" });
		(app.vault.getAbstractFileByPath as any).mockReturnValue(mockFile);
		(app.metadataCache.getFileCache as any).mockReturnValue({
			frontmatter: { title: "Initial" },
		});
		((app as any).foldManager.loadPath as any).mockReturnValue(null);

		await plugin.onload();

		// Initial note has null in foldManager -> plugin translates to collapsed
		const foldData = (app as any).foldManager.loadPath("initial.md");
		expect(foldData).toEqual({
			folds: [{ from: 0, to: 0 }],
			lines: 0,
		});
	});

	it("should return null for notes without frontmatter", async () => {
		const mockFile = Object.assign(new TFile(), { path: "no-frontmatter.md" });
		(app.vault.getAbstractFileByPath as any).mockReturnValue(mockFile);
		(app.metadataCache.getFileCache as any).mockReturnValue(null);
		((app as any).foldManager.loadPath as any).mockReturnValue(null);

		await plugin.onload();

		const foldData = (app as any).foldManager.loadPath("no-frontmatter.md");
		expect(foldData).toBeNull();
	});

	it("should translate user unfolding in editor to saving a folded marker in foldManager (remember mode)", async () => {
		const mockFile = Object.assign(new TFile(), { path: "note.md" });
		(app.vault.getAbstractFileByPath as any).mockReturnValue(mockFile);
		(app.metadataCache.getFileCache as any).mockReturnValue({
			frontmatter: { title: "Note" },
		});

		const originalSave = (app as any).foldManager.savePath;

		await plugin.onload();

		// User manually opens (unfolds) properties -> editor passes empty folds []
		(app as any).foldManager.savePath("note.md", { folds: [], lines: 100 });

		// FoldManager receives inverted marker { from: 0, to: 0 }
		expect(originalSave).toHaveBeenCalledWith("note.md", {
			folds: [{ from: 0, to: 0 }],
			lines: 100,
		});
	});

	it("should translate stored folded marker back to unfolded (null) when reopening note (remember mode)", async () => {
		const mockFile = Object.assign(new TFile(), { path: "user-opened.md" });
		(app.vault.getAbstractFileByPath as any).mockReturnValue(mockFile);
		(app.metadataCache.getFileCache as any).mockReturnValue({
			frontmatter: { title: "User Opened" },
		});

		// Stored marker { from: 0, to: 0 } in foldManager
		((app as any).foldManager.loadPath as any).mockReturnValue({
			folds: [{ from: 0, to: 0 }],
			lines: 100,
		});

		await plugin.onload();

		// When note is reopened, plugin strips { from: 0, to: 0 } -> returns null (unfolded)
		const result = (app as any).foldManager.loadPath("user-opened.md");
		expect(result).toBeNull();
	});

	it("should translate user folding in editor to saving an empty fold list in foldManager (remember mode)", async () => {
		const mockFile = Object.assign(new TFile(), { path: "note-fold.md" });
		(app.vault.getAbstractFileByPath as any).mockReturnValue(mockFile);
		(app.metadataCache.getFileCache as any).mockReturnValue({
			frontmatter: { title: "Fold" },
		});

		const originalSave = (app as any).foldManager.savePath;

		await plugin.onload();

		// User manually folds properties -> editor passes [{ from: 0, to: 0 }]
		(app as any).foldManager.savePath("note-fold.md", { folds: [{ from: 0, to: 0 }], lines: 50 });

		// FoldManager receives inverted empty folds []
		expect(originalSave).toHaveBeenCalledWith("note-fold.md", {
			folds: [],
			lines: 50,
		});
	});

	it("should ALWAYS return collapsed in 'always' mode even if saved state has no folds", async () => {
		const mockFile = Object.assign(new TFile(), { path: "always-folded.md" });
		(app.vault.getAbstractFileByPath as any).mockReturnValue(mockFile);
		(app.metadataCache.getFileCache as any).mockReturnValue({
			frontmatter: { title: "Always Folded" },
		});

		((app as any).foldManager.loadPath as any).mockReturnValue({
			folds: [],
			lines: 50,
		});

		await plugin.onload();
		plugin.settings.foldMode = "always";

		const foldData = (app as any).foldManager.loadPath("always-folded.md");
		expect(foldData).toEqual({
			folds: [{ from: 0, to: 0 }],
			lines: 50,
		});
	});

	it("should not invert folds on save in 'always' mode", async () => {
		const mockFile = Object.assign(new TFile(), { path: "always-folded-save.md" });
		(app.vault.getAbstractFileByPath as any).mockReturnValue(mockFile);
		(app.metadataCache.getFileCache as any).mockReturnValue({
			frontmatter: { title: "Always Folded" },
		});

		const originalSave = (app as any).foldManager.savePath;

		await plugin.onload();
		plugin.settings.foldMode = "always";

		(app as any).foldManager.savePath("always-folded-save.md", { folds: [], lines: 80 });
		expect(originalSave).toHaveBeenCalledWith("always-folded-save.md", {
			folds: [],
			lines: 80,
		});
	});

	it("should clean up frontmatter fold markers from localStorage when resetAllPropertyFolds is called", () => {
		const mockStorage: Record<string, string> = {
			"app123-note-fold-only-frontmatter.md": JSON.stringify({
				folds: [{ from: 0, to: 0 }],
				lines: 50,
			}),
			"app123-note-fold-with-headings.md": JSON.stringify({
				folds: [{ from: 0, to: 0 }, { from: 10, to: 20 }],
				lines: 100,
			}),
			"app123-note-fold-no-frontmatter.md": JSON.stringify({
				folds: [{ from: 15, to: 30 }],
				lines: 80,
			}),
		};

		(globalThis as any).window = {
			localStorage: {
				get length() {
					return Object.keys(mockStorage).length;
				},
				key: (index: number) => Object.keys(mockStorage)[index] || null,
				getItem: (key: string) => mockStorage[key] || null,
				setItem: (key: string, val: string) => {
					mockStorage[key] = val;
				},
				removeItem: (key: string) => {
					delete mockStorage[key];
				},
			},
		};

		(app as any).appId = "app123";

		const count = plugin.resetAllPropertyFolds();
		expect(count).toBe(2);

		// only-frontmatter was completely removed
		expect(mockStorage["app123-note-fold-only-frontmatter.md"]).toBeUndefined();

		// with-headings preserved heading fold but stripped frontmatter fold
		const updatedWithHeadings = JSON.parse(mockStorage["app123-note-fold-with-headings.md"]!);
		expect(updatedWithHeadings.folds).toEqual([{ from: 10, to: 20 }]);

		// no-frontmatter fold untouched
		const updatedNoFrontmatter = JSON.parse(mockStorage["app123-note-fold-no-frontmatter.md"]!);
		expect(updatedNoFrontmatter.folds).toEqual([{ from: 15, to: 30 }]);
	});

	it("should restore original foldManager.loadPath on onunload", async () => {
		const originalLoad = (app as any).foldManager.loadPath;

		await plugin.onload();
		expect((app as any).foldManager.loadPath).not.toBe(originalLoad);

		plugin.onunload();
		expect((app as any).foldManager.loadPath).toBe(originalLoad);
	});
});
