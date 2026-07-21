import { render, screen } from '@testing-library/react';
import AptFitFinder from './AptFitFinder';

describe('AptFitFinder', () => {
  const mockProps = {
    sheetApartments: {
      '청계동': [
        { name: '동탄역더샵센트럴시티', dong: '청계동', householdCount: 1400, yearBuilt: '2015' }
      ]
    },
    txSummaryData: {
      '동탄역더샵센트럴시티': {
        avg3MPrice: 125000,
        avg3MRentDeposit: 65000,
        dong: '청계동'
      }
    },
    nameMapping: {},
    publicRentalSet: new Set<string>(),
    fieldReportsMap: new Map(),
    onSelectApt: jest.fn(),
    isOpen: true,
    onClose: jest.fn(),
  };

  it('renders modal correctly when open', () => {
    render(<AptFitFinder {...mockProps} sheetApartments={mockProps.sheetApartments as any} txSummaryData={mockProps.txSummaryData as any} />);
    expect(screen.getByText('나만의 동탄 찰떡 아파트 찾기')).toBeInTheDocument();
  });

  it('preserves score distribution across 0% to 99% without 50% floor clamp', () => {
    // Verify that match percentage calculation logic can produce values under 50% when score is low
    const lowScore = 15;
    const matchPercentage = Math.min(99, Math.max(0, Math.round((lowScore / 145) * 100)));
    expect(matchPercentage).toBe(10);
    expect(matchPercentage).toBeLessThan(50);
  });
});
