import { compileFluent } from '@messageformat/compiler';

import { Formattable, MessageFormat } from '../index';

describe('Formattable variables', () => {
  let mf: MessageFormat;
  beforeEach(() => {
    const src = `msg = { $val }`;
    const res = compileFluent(src, { id: 'res', locale: 'en' });
    mf = new MessageFormat('en', null, res);
  });

  test('number', () => {
    expect(mf.formatToParts('msg', { val: 42 })).toMatchObject([
      { type: 'integer', value: '42', source: '$val' }
    ]);
  });

  test('Formattable({ toValue })', () => {
    const val = new Formattable({ toValue: () => 42 });
    expect(mf.formatToParts('msg', { val })).toMatchObject([
      { type: 'dynamic', value: 42, source: '$val' }
    ]);
  });

  test('Formattable({ toValue, toParts })', () => {
    const val = new Formattable({
      toValue: () => 42,
      toParts: source => {
        const nf = new Intl.NumberFormat('en', {
          minimumFractionDigits: 1
        });
        return nf.formatToParts(42).map(part => ({ ...part, source }));
      }
    });
    expect(mf.formatToParts('msg', { val })).toMatchObject([
      { type: 'integer', value: '42', source: '$val' },
      { type: 'decimal', value: '.', source: '$val' },
      { type: 'fraction', value: '0', source: '$val' }
    ]);
  });
});
