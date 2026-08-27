import { describe, it, expect } from 'vitest';
import { parseZoomJoinUrl } from './zoomJoinUrl';

describe('parseZoomJoinUrl', () => {
  it('extracts meetingNumber and password from a real join_url shape', () => {
    expect(parseZoomJoinUrl('https://zoom.us/j/8492041982?pwd=abc123XYZ')).toEqual({
      meetingNumber: '8492041982',
      password: 'abc123XYZ',
    });
  });

  it('returns undefined password when the URL has none', () => {
    expect(parseZoomJoinUrl('https://zoom.us/j/8492041982')).toEqual({
      meetingNumber: '8492041982',
      password: undefined,
    });
  });

  it('works against a custom vanity domain, not just zoom.us', () => {
    expect(parseZoomJoinUrl('https://mycompany.zoom.us/j/1234567890?pwd=xyz')).toEqual({
      meetingNumber: '1234567890',
      password: 'xyz',
    });
  });

  it('throws a clear error for a URL with no /j/{number} segment', () => {
    expect(() => parseZoomJoinUrl('https://zoom.us/s/8492041982')).toThrow(/Could not parse a Zoom meeting number/);
  });

  it('throws on a non-URL string rather than silently returning garbage', () => {
    expect(() => parseZoomJoinUrl('not-a-url')).toThrow();
  });
});
