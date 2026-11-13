/**
 * OfficeService.js — PowerPoint integration (v1.2)
 * ================================================
 * insertSlidesFromBase64 inserts SLIDES, it cannot drop a chart into an
 * existing slide. v1.2 inserts the generated chart slide right AFTER the
 * slide the user is on (PowerPointApi 1.5 getSelectedSlides), with
 * useDestinationTheme, then selects it. On older hosts (1.2–1.4) it falls
 * back to appending at the end of the deck.
 *
 * Outside PowerPoint (opening taskpane.html in a browser while developing)
 * the .pptx is downloaded instead — a dev aid only.
 */

let isInitialized = false;
let caps = { inPowerPoint: false, canInsertSlides: false, canTargetSlide: false, platform: null, officeVersion: null };

export async function initialize() {
  if (typeof Office === "undefined") {
    caps = { ...caps, platform: "browser", officeVersion: "standalone" };
    isInitialized = true;
    return { ...caps };
  }
  return new Promise((resolve) => {
    Office.onReady((info) => {
      const req = Office.context?.requirements;
      const inPpt = info.host === Office.HostType.PowerPoint;
      caps = {
        inPowerPoint: inPpt,
        canInsertSlides: inPpt && !!req?.isSetSupported("PowerPointApi", "1.2"),
        canTargetSlide: inPpt && !!req?.isSetSupported("PowerPointApi", "1.5"),
        platform: info.platform || "unknown",
        officeVersion: Office.context?.diagnostics?.version || "unknown"
      };
      isInitialized = true;
      resolve({ ...caps });
    });
  });
}

export function getCapabilities() { return { ...caps }; }
export function isReady() { return isInitialized; }

function parseOfficeError(error) {
  const code = error?.code || error?.name || "UNKNOWN";
  const map = {
    InvalidArgument: "Les données du graphique sont invalides.",
    GeneralException: "Erreur PowerPoint générale.",
    AccessDenied: "Accès refusé — la présentation est-elle en lecture seule ?",
    ItemNotFound: "Aucune présentation active trouvée.",
    NotImplemented: "Fonctionnalité non supportée par cette version de PowerPoint.",
    Conflict: "Conflit d'édition — réessayez."
  };
  return { code, message: map[code] || error?.message || "Erreur inconnue" };
}

/**
 * Insert a one-slide PPTX after the current slide.
 * @returns {Promise<{success:boolean, message:string, position:"after-current"|"end"}>}
 */
export async function insertChart(base64Pptx, options = {}) {
  const { useTheme = true } = options;
  if (!isInitialized) throw new Error("Office.js n'est pas initialisé.");
  if (!caps.canInsertSlides) {
    throw new Error("Cette version de PowerPoint ne prend pas en charge l'insertion (PowerPointApi 1.2 requis : Microsoft 365 ou PowerPoint 2021+).");
  }
  if (!base64Pptx || typeof base64Pptx !== "string") throw new Error("Données du graphique invalides.");

  try {
    let position = "end";
    await PowerPoint.run(async (context) => {
      const insertOpts = {
        formatting: useTheme
          ? PowerPoint.InsertSlideFormatting.useDestinationTheme
          : PowerPoint.InsertSlideFormatting.keepSourceFormatting
      };

      let targetIndex = null;
      if (caps.canTargetSlide) {
        const selected = context.presentation.getSelectedSlides();
        selected.load("items/id");
        const all = context.presentation.slides;
        all.load("items/id");
        await context.sync();
        if (selected.items.length) {
          const current = selected.items[selected.items.length - 1].id;
          insertOpts.targetSlideId = current;
          targetIndex = all.items.findIndex(s => s.id === current);
          position = "after-current";
        }
      }

      context.presentation.insertSlidesFromBase64(base64Pptx, insertOpts);
      await context.sync();

      if (caps.canTargetSlide) {
        const slides = context.presentation.slides;
        slides.load("items/id");
        await context.sync();
        const newIndex = targetIndex === null ? slides.items.length - 1 : targetIndex + 1;
        const inserted = slides.items[newIndex];
        if (inserted) {
          context.presentation.setSelectedSlides([inserted.id]);
          await context.sync();
        }
      }
    });
    return {
      success: true,
      position,
      message: position === "after-current" ? "Graphique inséré après la diapositive active." : "Graphique inséré en fin de présentation."
    };
  } catch (error) {
    const info = parseOfficeError(error);
    throw new Error(`Erreur d'insertion : ${info.message} (${info.code})`);
  }
}

export function downloadPptx(base64Pptx, fileName = "hcp_chart.pptx") {
  const bytes = Uint8Array.from(atob(base64Pptx), c => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: fileName });
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export async function smartInsert(base64Pptx, options = {}) {
  if (caps.canInsertSlides) return insertChart(base64Pptx, options);
  if (caps.inPowerPoint) {
    throw new Error("PowerPoint détecté mais l'insertion de diapositives n'est pas disponible (PowerPointApi 1.2 requis).");
  }
  downloadPptx(base64Pptx, options.fileName || "hcp_chart.pptx");
  return { success: true, standalone: true, message: "Mode développement hors PowerPoint : fichier .pptx téléchargé." };
}

export async function getPresentationInfo() {
  if (!caps.canInsertSlides) return { slideCount: null, available: false };
  try {
    let count = null;
    await PowerPoint.run(async (context) => {
      const slides = context.presentation.slides;
      slides.load("items");
      await context.sync();
      count = slides.items.length;
    });
    return { slideCount: count, available: true };
  } catch (e) {
    return { slideCount: null, available: false, error: e.message };
  }
}

const OfficeService = { initialize, getCapabilities, isReady, insertChart, smartInsert, downloadPptx, getPresentationInfo };
export default OfficeService;
