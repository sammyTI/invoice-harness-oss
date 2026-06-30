import { describe, expect, it } from "vitest";
import {
  computeTotals,
  DEFAULT_SETTINGS,
  fiscalMonths,
  fiscalYearForDate,
  formatDate,
  isValidRegistrationNumber,
  stampDuty,
  type Settings,
} from "./index";

const base: Settings = { ...DEFAULT_SETTINGS };

describe("computeTotals", () => {
  it("外税・税率別・端数切り捨て", () => {
    const t = computeTotals(
      [
        { quantity: 1, unit_price: 50000, tax_rate: 10 },
        { quantity: 4, unit_price: 994, tax_rate: 10 },
        { quantity: 10, unit_price: 260, tax_rate: 8 },
      ],
      base
    );
    expect(t.subtotal).toBe(56576); // 50000 + 3976 + 2600
    expect(t.tax_total).toBe(5605); // floor(53976*0.1)=5397 + floor(2600*0.08)=208
    expect(t.total).toBe(62181);
    expect(t.tax_by_rate).toHaveLength(2);
  });

  it("内税（税込入力）", () => {
    const t = computeTotals([{ quantity: 1, unit_price: 110000, tax_rate: 10 }], { ...base, tax_display: "inclusive" });
    expect(t.subtotal).toBe(100000);
    expect(t.tax_total).toBe(10000);
    expect(t.total).toBe(110000);
  });

  it("源泉徴収（税抜基準）", () => {
    const t = computeTotals([{ quantity: 1, unit_price: 100000, tax_rate: 10 }], { ...base, withholding: "standard" });
    expect(t.total).toBe(110000);
    expect(t.withholding).toBe(10210); // floor(100000*0.1021)
    expect(t.payable).toBe(99790);
  });
});

describe("会計年度", () => {
  it("3月決算: 6月は翌期", () => {
    const fy = fiscalYearForDate("2026-06-18", 3);
    expect(fy.endYear).toBe(2027);
    expect(fy.start).toBe("2026-04-01");
    expect(fy.label).toBe("2027年3月期");
  });
  it("3月決算: 2月は当期", () => {
    expect(fiscalYearForDate("2026-02-10", 3).endYear).toBe(2026);
  });
  it("12月決算は暦年", () => {
    const fy = fiscalYearForDate("2026-05-01", 12);
    expect(fy.start).toBe("2026-01-01");
    expect(fiscalMonths(fy)[0].ym).toBe("2026-01");
    expect(fiscalMonths(fy)).toHaveLength(12);
  });
});

describe("収入印紙", () => {
  it("5万円未満は非課税", () => expect(stampDuty(49999)).toBe(0));
  it("5万〜100万は200円", () => {
    expect(stampDuty(50000)).toBe(200);
    expect(stampDuty(1_000_000)).toBe(200);
  });
  it("100万超は400円", () => expect(stampDuty(1_000_001)).toBe(400));
});

describe("ユーティリティ", () => {
  it("日付フォーマット", () => {
    expect(formatDate("2026-06-18", "jp")).toBe("2026年06月18日");
    expect(formatDate("2026-06-18", "iso")).toBe("2026-06-18");
  });
  it("登録番号バリデーション", () => {
    expect(isValidRegistrationNumber("T1234567890123")).toBe(true);
    expect(isValidRegistrationNumber("1234567890123")).toBe(false);
    expect(isValidRegistrationNumber("")).toBe(false);
  });
});
