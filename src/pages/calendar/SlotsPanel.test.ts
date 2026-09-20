import { describe, it, expect } from 'vitest';
import { toggleTherapistSelection } from './SlotsPanel';

describe('toggleTherapistSelection', () => {
  it('removes an already-selected id from an explicit selection', () => {
    expect(toggleTherapistSelection([1, 2, 3], 2, [1, 2, 3])).toEqual([1, 3]);
  });

  it('adds a missing id to an explicit selection when others remain unselected (no collapse yet)', () => {
    expect(toggleTherapistSelection([1, 4], 2, [1, 2, 3, 4])).toEqual([1, 4, 2]);
  });

  it('collapses to undefined ("no filter, show everyone") once every therapist ends up selected', () => {
    expect(toggleTherapistSelection([1, 2], 3, [1, 2, 3])).toBeUndefined();
  });

  it('treats undefined as "everyone selected" — toggling one off returns the remaining ids explicitly', () => {
    expect(toggleTherapistSelection(undefined, 2, [1, 2, 3])).toEqual([1, 3]);
  });

  it('returns an empty array, not undefined, when toggling off the last remaining selected id', () => {
    expect(toggleTherapistSelection([1], 1, [1])).toEqual([]);
  });
});
