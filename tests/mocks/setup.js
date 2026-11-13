/**
 * setup.js — test globals (v1.2): localStorage, Office.js and a PowerPoint
 * mock that records insertSlidesFromBase64 calls and supports selection (1.5).
 */
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
  get length() { return store.size; },
  key: (i) => [...store.keys()][i] ?? null
};

export const pptState = { slides: [{ id: "256#" }, { id: "257#" }, { id: "258#" }], selected: ["257#"], inserts: [], selectedAfter: null };

globalThis.Office = {
  onReady: (cb) => cb({ host: "PowerPoint", platform: "PC" }),
  HostType: { PowerPoint: "PowerPoint" },
  context: {
    requirements: { isSetSupported: (name, v) => name === "PowerPointApi" && parseFloat(v) <= 1.5 },
    diagnostics: { version: "16.0.0.0" }
  }
};

globalThis.PowerPoint = {
  InsertSlideFormatting: { useDestinationTheme: "UseDestinationTheme", keepSourceFormatting: "KeepSourceFormatting" },
  run: async (cb) => {
    const coll = (getIds) => ({ items: [], load() { this.items = getIds().map(id => ({ id })); } });
    const context = {
      presentation: {
        get slides() { return coll(() => pptState.slides.map(s => s.id)); },
        getSelectedSlides: () => coll(() => pptState.selected),
        insertSlidesFromBase64: (b64, opts) => {
          pptState.inserts.push({ b64, opts });
          const idx = opts.targetSlideId ? pptState.slides.findIndex(s => s.id === opts.targetSlideId) + 1 : pptState.slides.length;
          pptState.slides.splice(idx, 0, { id: `${300 + pptState.inserts.length}#` });
        },
        setSelectedSlides: (ids) => { pptState.selectedAfter = ids; }
      },
      sync: async () => {}
    };
    await cb(context);
  }
};
