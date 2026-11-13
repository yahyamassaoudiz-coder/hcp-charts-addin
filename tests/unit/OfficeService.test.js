import { describe, it, expect } from "vitest";
import { pptState } from "../mocks/setup.js";
import OfficeService from "../../src/services/OfficeService.js";

describe("OfficeService", () => {
  it("inserts after the selected slide with the destination theme and selects it", async () => {
    const caps = await OfficeService.initialize();
    expect(caps.canInsertSlides && caps.canTargetSlide).toBe(true);
    const res = await OfficeService.smartInsert("UEsDBA==");
    expect(res.position).toBe("after-current");
    const call = pptState.inserts.at(-1);
    expect(call.opts).toEqual({ formatting: "UseDestinationTheme", targetSlideId: "257#" });
    expect(pptState.slides.map(s => s.id).indexOf(pptState.selectedAfter[0])).toBe(2);
  });
});
