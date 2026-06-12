/**
 * BillDEE Thai Tax Calculation Engine
 *
 * Handles VAT 7% and Withholding Tax (ภาษีหัก ณ ที่จ่าย)
 * per Thai Revenue Department rules.
 *
 * WHT base = subtotal (pre-VAT). The payer withholds from the payable amount.
 * Net payable = (subtotal + VAT) - WHT
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface LineItem {
  description: string;
  quantity: number;      // must be > 0
  unitPrice: number;     // must be >= 0
}

/** Allowed Withholding Tax rates under Thai law */
export type WHTRate = 0 | 1 | 1.5 | 3 | 5 | 10;

export interface TaxInput {
  items: LineItem[];
  includeVat: boolean;  // whether to add VAT 7%
  whtRate: WHTRate;     // withholding tax rate (applied on pre-VAT subtotal)
}

export interface TaxResult {
  subtotal: number;      // ยอดก่อน VAT (sum of items)
  vatAmount: number;     // ภาษีมูลค่าเพิ่ม 7%
  totalWithVat: number;  // ยอดรวม VAT
  whtAmount: number;     // ภาษีหัก ณ ที่จ่าย
  netPayable: number;    // ยอดที่ลูกค้าต้องโอน (totalWithVat - whtAmount)
  itemTotals: number[];  // แต่ละบรรทัด (qty × unitPrice)
}

export interface ExtractedVat {
  amountBeforeVat: number;  // ยอดก่อน VAT
  vatAmount: number;        // VAT 7%
}

// ── Constants ────────────────────────────────────────────────────────────────

export const VAT_RATE = 0.07;
export const VALID_WHT_RATES: readonly WHTRate[] = [0, 1, 1.5, 3, 5, 10];

// ── Private helpers ───────────────────────────────────────────────────────────

/**
 * Round to 2 decimal places using "round half away from zero"
 * (standard Thai banking rounding).
 */
function roundBaht(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function validateItems(items: LineItem[]): void {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('ต้องมีรายการสินค้า/บริการอย่างน้อย 1 รายการ');
  }

  items.forEach((item, index) => {
    const pos = `รายการที่ ${index + 1}`;

    if (!item || typeof item !== 'object') {
      throw new Error(`${pos}: ข้อมูลรายการไม่ถูกต้อง`);
    }
    if (!item.description || !item.description.trim()) {
      throw new Error(`${pos}: ต้องระบุรายละเอียดสินค้า/บริการ`);
    }
    if (typeof item.quantity !== 'number' || !isFinite(item.quantity) || item.quantity <= 0) {
      throw new Error(`${pos} "${item.description}": จำนวนต้องเป็นตัวเลขมากกว่า 0`);
    }
    if (typeof item.unitPrice !== 'number' || !isFinite(item.unitPrice) || item.unitPrice < 0) {
      throw new Error(`${pos} "${item.description}": ราคาต่อหน่วยต้องเป็นตัวเลขไม่ติดลบ`);
    }
  });
}

function validateWhtRate(rate: WHTRate): void {
  if (!(VALID_WHT_RATES as readonly number[]).includes(rate)) {
    throw new Error(
      `อัตราภาษีหัก ณ ที่จ่ายไม่ถูกต้อง: ${rate}% (ที่รองรับ: ${VALID_WHT_RATES.join(', ')}%)`
    );
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Calculate full Thai tax breakdown for a document (quotation / invoice / tax invoice).
 *
 * @example
 * const result = calculateTax({
 *   items: [{ description: 'ออกแบบโลโก้', quantity: 1, unitPrice: 10000 }],
 *   includeVat: true,
 *   whtRate: 3,
 * });
 * // subtotal=10000, vatAmount=700, totalWithVat=10700, whtAmount=300, netPayable=10400
 */
export function calculateTax(input: TaxInput): TaxResult {
  if (!input || typeof input !== 'object') {
    throw new Error('ข้อมูลอินพุตไม่ถูกต้อง');
  }

  validateItems(input.items);
  validateWhtRate(input.whtRate);

  const itemTotals = input.items.map(item =>
    roundBaht(item.quantity * item.unitPrice)
  );

  const subtotal = roundBaht(itemTotals.reduce((sum, t) => sum + t, 0));
  const vatAmount = input.includeVat ? roundBaht(subtotal * VAT_RATE) : 0;
  const totalWithVat = roundBaht(subtotal + vatAmount);

  // WHT is computed on the pre-VAT subtotal per Thai Revenue Code § 3 Terdecim
  const whtAmount = input.whtRate > 0 ? roundBaht(subtotal * (input.whtRate / 100)) : 0;
  const netPayable = roundBaht(totalWithVat - whtAmount);

  return {
    subtotal,
    vatAmount,
    totalWithVat,
    whtAmount,
    netPayable,
    itemTotals,
  };
}

/**
 * Back-calculate the pre-VAT amount and VAT from a VAT-inclusive total.
 * Formula: amountBeforeVat = total / 1.07
 *
 * @example
 * extractVatFromInclusive(10700) // => { amountBeforeVat: 10000, vatAmount: 700 }
 */
export function extractVatFromInclusive(amountWithVat: number): ExtractedVat {
  if (typeof amountWithVat !== 'number' || !isFinite(amountWithVat)) {
    throw new Error('ยอดเงินต้องเป็นตัวเลข');
  }
  if (amountWithVat < 0) {
    throw new Error('ยอดเงินต้องไม่ติดลบ');
  }

  const amountBeforeVat = roundBaht(amountWithVat / (1 + VAT_RATE));
  const vatAmount = roundBaht(amountWithVat - amountBeforeVat);

  return { amountBeforeVat, vatAmount };
}

/**
 * Add VAT on top of a pre-VAT amount.
 *
 * @example
 * addVat(10000) // => { totalWithVat: 10700, vatAmount: 700 }
 */
export function addVat(subtotal: number): { totalWithVat: number; vatAmount: number } {
  if (typeof subtotal !== 'number' || !isFinite(subtotal)) {
    throw new Error('ยอดเงินต้องเป็นตัวเลข');
  }
  if (subtotal < 0) {
    throw new Error('ยอดเงินต้องไม่ติดลบ');
  }

  const vatAmount = roundBaht(subtotal * VAT_RATE);
  const totalWithVat = roundBaht(subtotal + vatAmount);

  return { totalWithVat, vatAmount };
}

/**
 * Calculate the withholding tax amount.
 * WHT is computed on the pre-VAT subtotal.
 *
 * @example
 * calcWHT(10000, 3) // => 300
 */
export function calcWHT(subtotal: number, rate: WHTRate): number {
  if (typeof subtotal !== 'number' || !isFinite(subtotal)) {
    throw new Error('ยอดเงินต้องเป็นตัวเลข');
  }
  if (subtotal < 0) {
    throw new Error('ยอดเงินต้องไม่ติดลบ');
  }

  validateWhtRate(rate);

  return rate > 0 ? roundBaht(subtotal * (rate / 100)) : 0;
}

/**
 * Format a number as Thai Baht string.
 * @example formatBaht(1234567.5) // => "1,234,567.50"
 */
export function formatBaht(amount: number, decimals: 0 | 2 = 2): string {
  if (typeof amount !== 'number' || !isFinite(amount)) return '0.00';

  return Math.abs(amount).toLocaleString('th-TH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
