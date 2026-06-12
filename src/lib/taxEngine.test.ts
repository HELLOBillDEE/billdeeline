import {
  calculateTax,
  extractVatFromInclusive,
  addVat,
  calcWHT,
  formatBaht,
  VAT_RATE,
  VALID_WHT_RATES,
  type LineItem,
  type TaxInput,
} from './taxEngine';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const singleItem: LineItem = {
  description: 'ออกแบบโลโก้',
  quantity: 1,
  unitPrice: 10_000,
};

const multipleItems: LineItem[] = [
  { description: 'ออกแบบโลโก้', quantity: 1, unitPrice: 10_000 },
  { description: 'พิมพ์นามบัตร', quantity: 2, unitPrice: 500 },
  { description: 'ออกแบบเว็บ', quantity: 1, unitPrice: 25_000 },
];

// ── calculateTax ──────────────────────────────────────────────────────────────

describe('calculateTax', () => {
  describe('single item, with VAT, no WHT', () => {
    const result = calculateTax({ items: [singleItem], includeVat: true, whtRate: 0 });

    it('computes correct subtotal', () => expect(result.subtotal).toBe(10_000));
    it('computes VAT 7%', () => expect(result.vatAmount).toBe(700));
    it('computes totalWithVat', () => expect(result.totalWithVat).toBe(10_700));
    it('whtAmount is zero', () => expect(result.whtAmount).toBe(0));
    it('netPayable equals totalWithVat', () => expect(result.netPayable).toBe(10_700));
    it('itemTotals has one entry', () => expect(result.itemTotals).toEqual([10_000]));
  });

  describe('single item, no VAT, no WHT', () => {
    const result = calculateTax({ items: [singleItem], includeVat: false, whtRate: 0 });

    it('vatAmount is zero', () => expect(result.vatAmount).toBe(0));
    it('totalWithVat equals subtotal', () => expect(result.totalWithVat).toBe(10_000));
    it('netPayable equals subtotal', () => expect(result.netPayable).toBe(10_000));
  });

  describe('single item, with VAT, WHT 3%', () => {
    const result = calculateTax({ items: [singleItem], includeVat: true, whtRate: 3 });

    it('computes subtotal', () => expect(result.subtotal).toBe(10_000));
    it('computes VAT', () => expect(result.vatAmount).toBe(700));
    it('computes totalWithVat', () => expect(result.totalWithVat).toBe(10_700));
    it('WHT is on pre-VAT subtotal: 10000 × 3% = 300', () => expect(result.whtAmount).toBe(300));
    it('netPayable = 10700 - 300 = 10400', () => expect(result.netPayable).toBe(10_400));
  });

  describe('single item, no VAT, WHT 5%', () => {
    const result = calculateTax({ items: [singleItem], includeVat: false, whtRate: 5 });

    it('WHT = 10000 × 5% = 500', () => expect(result.whtAmount).toBe(500));
    it('netPayable = 10000 - 500 = 9500', () => expect(result.netPayable).toBe(9_500));
  });

  describe('multiple items', () => {
    // subtotal = 10000 + 1000 + 25000 = 36000
    const result = calculateTax({ items: multipleItems, includeVat: true, whtRate: 3 });

    it('itemTotals are correct', () => expect(result.itemTotals).toEqual([10_000, 1_000, 25_000]));
    it('subtotal = 36000', () => expect(result.subtotal).toBe(36_000));
    it('VAT = 36000 × 7% = 2520', () => expect(result.vatAmount).toBe(2_520));
    it('totalWithVat = 38520', () => expect(result.totalWithVat).toBe(38_520));
    it('WHT = 36000 × 3% = 1080', () => expect(result.whtAmount).toBe(1_080));
    it('netPayable = 38520 - 1080 = 37440', () => expect(result.netPayable).toBe(37_440));
  });

  describe('fractional amounts — rounding to 2 decimals', () => {
    // 1/3 of 100 = 33.333... → round to 33.33
    const item: LineItem = { description: 'บริการ', quantity: 1, unitPrice: 100 / 3 };
    const result = calculateTax({ items: [item], includeVat: true, whtRate: 0 });

    it('subtotal rounds correctly', () => expect(result.subtotal).toBe(33.33));
    it('VAT rounds correctly', () => expect(result.vatAmount).toBe(2.33));
    it('totalWithVat rounds correctly', () => expect(result.totalWithVat).toBe(35.66));
  });

  describe('all valid WHT rates', () => {
    const rates: Array<{ rate: Parameters<typeof calculateTax>[0]['whtRate']; expected: number }> = [
      { rate: 0, expected: 0 },
      { rate: 1, expected: 100 },
      { rate: 1.5, expected: 150 },
      { rate: 3, expected: 300 },
      { rate: 5, expected: 500 },
      { rate: 10, expected: 1_000 },
    ];

    rates.forEach(({ rate, expected }) => {
      it(`WHT ${rate}% on 10000 = ${expected}`, () => {
        const r = calculateTax({ items: [singleItem], includeVat: false, whtRate: rate });
        expect(r.whtAmount).toBe(expected);
      });
    });
  });

  describe('zero-price item', () => {
    const freeItem: LineItem = { description: 'ของแถม', quantity: 1, unitPrice: 0 };
    const result = calculateTax({ items: [freeItem], includeVat: true, whtRate: 0 });

    it('subtotal is 0', () => expect(result.subtotal).toBe(0));
    it('vatAmount is 0', () => expect(result.vatAmount).toBe(0));
    it('netPayable is 0', () => expect(result.netPayable).toBe(0));
  });

  describe('input validation errors', () => {
    const validInput: TaxInput = { items: [singleItem], includeVat: true, whtRate: 0 };

    it('throws when items array is empty', () => {
      expect(() => calculateTax({ ...validInput, items: [] })).toThrow(
        'ต้องมีรายการสินค้า/บริการอย่างน้อย 1 รายการ'
      );
    });

    it('throws when description is empty string', () => {
      const bad = [{ description: '  ', quantity: 1, unitPrice: 100 }];
      expect(() => calculateTax({ ...validInput, items: bad })).toThrow('ต้องระบุรายละเอียด');
    });

    it('throws when quantity is zero', () => {
      const bad = [{ description: 'สินค้า', quantity: 0, unitPrice: 100 }];
      expect(() => calculateTax({ ...validInput, items: bad })).toThrow('จำนวนต้องเป็นตัวเลขมากกว่า 0');
    });

    it('throws when quantity is negative', () => {
      const bad = [{ description: 'สินค้า', quantity: -1, unitPrice: 100 }];
      expect(() => calculateTax({ ...validInput, items: bad })).toThrow('จำนวนต้องเป็นตัวเลขมากกว่า 0');
    });

    it('throws when unitPrice is negative', () => {
      const bad = [{ description: 'สินค้า', quantity: 1, unitPrice: -50 }];
      expect(() => calculateTax({ ...validInput, items: bad })).toThrow('ราคาต่อหน่วยต้องเป็นตัวเลขไม่ติดลบ');
    });

    it('throws when WHT rate is invalid', () => {
      // @ts-expect-error intentional invalid rate
      expect(() => calculateTax({ ...validInput, whtRate: 2 })).toThrow(
        'อัตราภาษีหัก ณ ที่จ่ายไม่ถูกต้อง'
      );
    });

    it('throws when input is null', () => {
      // @ts-expect-error intentional null
      expect(() => calculateTax(null)).toThrow('ข้อมูลอินพุตไม่ถูกต้อง');
    });
  });
});

// ── extractVatFromInclusive ───────────────────────────────────────────────────

describe('extractVatFromInclusive', () => {
  it('extracts VAT from 10700 correctly', () => {
    const { amountBeforeVat, vatAmount } = extractVatFromInclusive(10_700);
    expect(amountBeforeVat).toBe(10_000);
    expect(vatAmount).toBe(700);
  });

  it('extracts VAT from 0', () => {
    const { amountBeforeVat, vatAmount } = extractVatFromInclusive(0);
    expect(amountBeforeVat).toBe(0);
    expect(vatAmount).toBe(0);
  });

  it('rounds fractional results', () => {
    // 107 / 1.07 = 100 exactly
    const { amountBeforeVat, vatAmount } = extractVatFromInclusive(107);
    expect(amountBeforeVat).toBe(100);
    expect(vatAmount).toBe(7);
  });

  it('amountBeforeVat + vatAmount equals original (within rounding)', () => {
    const original = 5_355;
    const { amountBeforeVat, vatAmount } = extractVatFromInclusive(original);
    expect(amountBeforeVat + vatAmount).toBe(original);
  });

  it('throws on negative amount', () => {
    expect(() => extractVatFromInclusive(-100)).toThrow('ยอดเงินต้องไม่ติดลบ');
  });

  it('throws on NaN', () => {
    expect(() => extractVatFromInclusive(NaN)).toThrow('ยอดเงินต้องเป็นตัวเลข');
  });

  it('throws on Infinity', () => {
    expect(() => extractVatFromInclusive(Infinity)).toThrow('ยอดเงินต้องเป็นตัวเลข');
  });

  it('VAT_RATE constant is 0.07', () => {
    expect(VAT_RATE).toBe(0.07);
  });
});

// ── addVat ────────────────────────────────────────────────────────────────────

describe('addVat', () => {
  it('adds 7% VAT to 10000', () => {
    const { totalWithVat, vatAmount } = addVat(10_000);
    expect(vatAmount).toBe(700);
    expect(totalWithVat).toBe(10_700);
  });

  it('addVat and extractVatFromInclusive are inverse operations', () => {
    const original = 15_000;
    const { totalWithVat } = addVat(original);
    const { amountBeforeVat } = extractVatFromInclusive(totalWithVat);
    expect(amountBeforeVat).toBe(original);
  });

  it('handles zero input', () => {
    const { totalWithVat, vatAmount } = addVat(0);
    expect(vatAmount).toBe(0);
    expect(totalWithVat).toBe(0);
  });

  it('throws on negative amount', () => {
    expect(() => addVat(-1)).toThrow('ยอดเงินต้องไม่ติดลบ');
  });
});

// ── calcWHT ──────────────────────────────────────────────────────────────────

describe('calcWHT', () => {
  it.each([
    [10_000, 0, 0],
    [10_000, 1, 100],
    [10_000, 1.5, 150],
    [10_000, 3, 300],
    [10_000, 5, 500],
    [10_000, 10, 1_000],
  ] as const)('calcWHT(%d, %d) = %d', (subtotal, rate, expected) => {
    expect(calcWHT(subtotal, rate)).toBe(expected);
  });

  it('rounds fractional WHT', () => {
    // 10001 × 3% = 300.03
    expect(calcWHT(10_001, 3)).toBe(300.03);
  });

  it('throws on invalid rate', () => {
    // @ts-expect-error intentional
    expect(() => calcWHT(1000, 4)).toThrow('อัตราภาษีหัก ณ ที่จ่ายไม่ถูกต้อง');
  });

  it('VALID_WHT_RATES contains all expected rates', () => {
    expect(VALID_WHT_RATES).toEqual([0, 1, 1.5, 3, 5, 10]);
  });
});

// ── formatBaht ────────────────────────────────────────────────────────────────

describe('formatBaht', () => {
  it('formats 1234567.5 with 2 decimals', () => {
    expect(formatBaht(1_234_567.5)).toBe('1,234,567.50');
  });

  it('formats 0 correctly', () => {
    expect(formatBaht(0)).toBe('0.00');
  });

  it('uses absolute value (no negative sign)', () => {
    expect(formatBaht(-500)).toBe('500.00');
  });

  it('formats with 0 decimals', () => {
    expect(formatBaht(1_500, 0)).toBe('1,500');
  });

  it('returns 0.00 for NaN', () => {
    expect(formatBaht(NaN)).toBe('0.00');
  });
});

// ── Integration: real-world scenario ─────────────────────────────────────────

describe('real-world scenario: design agency invoice', () => {
  /**
   * A design agency issues a tax invoice to a client:
   *  - UI/UX Design   1 × ฿45,000
   *  - Frontend Dev   1 × ฿80,000
   *  - Consulting     4 × ฿5,000
   * VAT registered, WHT 3% applies.
   */
  const items: LineItem[] = [
    { description: 'UI/UX Design', quantity: 1, unitPrice: 45_000 },
    { description: 'Frontend Development', quantity: 1, unitPrice: 80_000 },
    { description: 'Consulting', quantity: 4, unitPrice: 5_000 },
  ];

  const result = calculateTax({ items, includeVat: true, whtRate: 3 });

  it('subtotal = 45000 + 80000 + 20000 = 145000', () =>
    expect(result.subtotal).toBe(145_000));

  it('VAT = 145000 × 7% = 10150', () =>
    expect(result.vatAmount).toBe(10_150));

  it('totalWithVat = 155150', () =>
    expect(result.totalWithVat).toBe(155_150));

  it('WHT = 145000 × 3% = 4350', () =>
    expect(result.whtAmount).toBe(4_350));

  it('netPayable = 155150 - 4350 = 150800', () =>
    expect(result.netPayable).toBe(150_800));
});
