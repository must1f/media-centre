import { upsertSeason, getSeasonsForSeries, getSeason } from '@/db/seasons';

const mockRunSync = jest.fn();
const mockGetFirstSync = jest.fn();
const mockGetAllSync = jest.fn();

jest.mock('@/db/client', () => ({
  __esModule: true,
  default: {
    runSync: (...args: any[]) => mockRunSync(...args),
    getFirstSync: (...args: any[]) => mockGetFirstSync(...args),
    getAllSync: (...args: any[]) => mockGetAllSync(...args),
  },
}));

describe('upsertSeason', () => {
  beforeEach(() => jest.clearAllMocks());

  it('inserts/updates and returns the row id', () => {
    mockRunSync.mockReturnValue({ lastInsertRowId: 7 });
    mockGetFirstSync.mockReturnValue({ id: 7 });

    const id = upsertSeason({
      series_id: 1399,
      season_number: 1,
      name: 'Season 1',
      poster_path: '/season1.jpg',
      episode_count: 10,
    });

    expect(id).toBe(7);
    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO Season'),
      [1399, 1, 'Season 1', '/season1.jpg', 10],
    );
  });
});

describe('getSeasonsForSeries / getSeason', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists seasons ordered by season_number', () => {
    mockGetAllSync.mockReturnValue([]);
    getSeasonsForSeries(1399);
    expect(mockGetAllSync).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY season_number ASC'),
      [1399],
    );
  });

  it('fetches a single season by series+number', () => {
    mockGetFirstSync.mockReturnValue(undefined);
    expect(getSeason(1399, 2)).toBeNull();
    expect(mockGetFirstSync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE series_id = ? AND season_number = ?'),
      [1399, 2],
    );
  });
});
