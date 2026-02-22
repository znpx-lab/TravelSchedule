const { calculateSettlement } = require('../js/lib/settlement');

test('TC-EX-01: 基本ケース (1000 split, 500 non-split) with 2 participants', () => {
  const expenses = [
    { id: 'e1', amount: 1000, isSplit: true },
    { id: 'e2', amount: 500, isSplit: false }
  ];
  const res = calculateSettlement(expenses, 2);
  expect(res.splitSum).toBe(1000);
  expect(res.nonSplitSum).toBe(500);
  expect(res.splitPer).toBe(500);
  expect(res.perPerson).toBe(1000);
  expect(res.remainder).toBe(0);
});

test('TC-EX-02: 端数検証 (25040 split only, 3 participants)', () => {
  const expenses = [
    { id: 'a', amount: 2000, isSplit: true },
    { id: 'b', amount: 15040, isSplit: true },
    { id: 'c', amount: 8000, isSplit: true }
  ];
  const res = calculateSettlement(expenses, 3);
  expect(res.splitSum).toBe(25040);
  expect(res.nonSplitSum).toBe(0);
  expect(res.splitPer).toBe(8346);
  expect(res.perPerson).toBe(8346);
  expect(res.remainder).toBe(2);
});

test('TC-EX-05: 未設定金額は0として扱う', () => {
  const expenses = [
    { id: 'x', amount: null, isSplit: true },
    { id: 'y', amount: 1000, isSplit: true }
  ];
  const res = calculateSettlement(expenses, 2);
  expect(res.splitSum).toBe(1000);
  expect(res.perPerson).toBe(500);
});

test('additional: mixture with missing fields', () => {
  const expenses = [
    { id: 'p', isSplit: true },
    { id: 'q', amount: '300', isSplit: true },
    { id: 'r', amount: 200, isSplit: false }
  ];
  const res = calculateSettlement(expenses, 2);
  expect(res.splitSum).toBe(300);
  expect(res.nonSplitSum).toBe(200);
  expect(res.perPerson).toBe(350); // splitPer=150 + nonSplit 200
});