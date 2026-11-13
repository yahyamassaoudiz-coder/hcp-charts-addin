import { describe, it, expect } from "vitest";
import { readXlsx } from "../../src/utils/xlsxReader.js";
import { tableFromMatrix, detectHeaderRow } from "../../src/utils/table.js";
import { makeXlsx } from "../mocks/makeXlsx.js";
import { WIDE_MATRIX } from "../mocks/handlers.js";

describe("xlsxReader + table", () => {
  it("reads shared strings and numbers, skips title rows", async () => {
    const { matrix, sheetNames } = await readXlsx(await makeXlsx(WIDE_MATRIX));
    expect(sheetNames).toEqual(["Données"]);
    expect(matrix[3]).toEqual(["PIB aux prix courants", 1239.8, 1152.5, 1274.7, 1330.2]);
    expect(detectHeaderRow(matrix)).toBe(2);
    const t = tableFromMatrix(matrix);
    expect(t.headers).toEqual(["Agrégat", "2019", "2020", "2021", "2022"]);
    expect(t.rows[1]["2020"]).toBe(-7.2);
  });
  it("rejects legacy .xls with a clear message", async () => {
    await expect(readXlsx(Buffer.from("D0CF11E0A1B11AE1", "hex"))).rejects.toThrow(/xls/);
  });
});
