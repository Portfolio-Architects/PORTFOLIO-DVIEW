import { filterOutliersIQR } from './outlierFilter';

describe('IQR Outlier Filtering Algorithm Test Suite', () => {
  interface DummyTx {
    id: number;
    price: number;
  }

  const getPrice = (t: DummyTx) => t.price;

  test('Should return original data when length is less than 4', () => {
    const data: DummyTx[] = [
      { id: 1, price: 100 },
      { id: 2, price: 500 },
      { id: 3, price: 1000 }
    ];
    const filtered = filterOutliersIQR(data, getPrice);
    expect(filtered).toHaveLength(3);
    expect(filtered).toEqual(data);
  });

  test('Should correctly filter out only extreme low outliers (below lower bound) using IQR', () => {
    // 8 data points: 100 (extreme low outlier), 500, 510, 520, 530, 540, 550, 1500 (extreme high price)
    // Sorted: 100, 500, 510, 520, 530, 540, 550, 1500
    // Q1 (25% percentile): index = 7 * 0.25 = 1.75 -> 500 + 0.75 * (510 - 500) = 507.5
    // Q3 (75% percentile): index = 7 * 0.75 = 5.25 -> 540 + 0.25 * (550 - 540) = 542.5
    // IQR = Q3 - Q1 = 542.5 - 507.5 = 35
    // Lower Bound = Q1 - 1.5 * IQR = 507.5 - 52.5 = 455
    // 100 (< 455) is filtered out, but 1500 is kept (high outlier filtering disabled).
    const data: DummyTx[] = [
      { id: 1, price: 100 },
      { id: 2, price: 500 },
      { id: 3, price: 510 },
      { id: 4, price: 520 },
      { id: 5, price: 530 },
      { id: 6, price: 540 },
      { id: 7, price: 550 },
      { id: 8, price: 1500 }
    ];

    const filtered = filterOutliersIQR(data, getPrice);
    
    expect(filtered).toHaveLength(6);
    expect(filtered.map(t => t.price)).toEqual([500, 510, 520, 530, 540, 550]);
  });

  test('Should return empty array when input data is empty', () => {
    const filtered = filterOutliersIQR([], getPrice);
    expect(filtered).toHaveLength(0);
  });

  test('Should relax lower bound filtering when custom multiplier (e.g. 3.0) is supplied', () => {
    const data: DummyTx[] = [
      { id: 1, price: 100 },
      { id: 2, price: 450 },
      { id: 3, price: 500 },
      { id: 4, price: 510 },
      { id: 5, price: 520 },
      { id: 6, price: 530 },
      { id: 7, price: 540 },
      { id: 8, price: 550 }
    ];
    // Q1 = 487.5, Q3 = 532.5, IQR = 45.
    // Mult 1.5 -> Lower Bound = 487.5 - 67.5 = 420. (100 is filtered, 450 is kept)
    // Let's adjust the prices to show difference for 450:
    // If we use data: [100, 420, 500, 510, 520, 530, 540, 550]
    // Sorted: 100, 420, 500, 510, 520, 530, 540, 550
    // Q1 = 480.0, Q3 = 532.5, IQR = 52.5.
    // Mult 1.5 -> Lower Bound = 480 - 78.75 = 401.25. (420 is kept)
    // Let's make it simpler:
    // data: [100, 400, 500, 510, 520, 530, 540, 550]
    // Q1 = 475.0, Q3 = 532.5, IQR = 57.5.
    // Mult 1.5 -> Lower Bound = 475 - 86.25 = 388.75.
    // Let's create an explicit dataset where standard 1.5 filters a value but 3.0 does not.
    // data: [100, 460, 500, 510, 520, 530, 540, 550]
    // Q1 = 490, Q3 = 532.5, IQR = 42.5.
    // Mult 1.5 -> Lower Bound = 490 - 63.75 = 426.25. (460 is kept)
    // data: [100, 450, 500, 505, 510, 515, 520, 525]
    // Q1 = 487.5, Q3 = 516.25, IQR = 28.75.
    // Mult 1.5 -> Lower Bound = 487.5 - 43.125 = 444.375. (450 is kept)
    // data: [100, 430, 500, 505, 510, 515, 520, 525]
    // Q1 = 482.5, Q3 = 516.25, IQR = 33.75.
    // Mult 1.5 -> Lower Bound = 482.5 - 50.625 = 431.875. (430 is filtered)
    // Mult 3.0 -> Lower Bound = 482.5 - 101.25 = 381.25. (430 is kept)
    const testData: DummyTx[] = [
      { id: 1, price: 100 },
      { id: 2, price: 430 },
      { id: 3, price: 500 },
      { id: 4, price: 505 },
      { id: 5, price: 510 },
      { id: 6, price: 515 },
      { id: 7, price: 520 },
      { id: 8, price: 525 }
    ];
    const filteredStrict = filterOutliersIQR(testData, getPrice, 1.5);
    const filteredRelaxed = filterOutliersIQR(testData, getPrice, 3.0);
    expect(filteredStrict.map(t => t.price)).toEqual([500, 505, 510, 515, 520, 525]);
    expect(filteredRelaxed.map(t => t.price)).toEqual([430, 500, 505, 510, 515, 520, 525]);
  });
});
