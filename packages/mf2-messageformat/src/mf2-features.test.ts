import { fluentToResource } from '@messageformat/fluent';
import {
  mf1ToMessage,
  mf1ToMessageData
} from '@messageformat/icu-messageformat-1';
import { parse } from '@messageformat/parser';
import { source } from '@messageformat/test-utils';

import {
  MessageValue,
  MessageFormat,
  Runtime,
  RuntimeOptions,
  SelectMessage
} from './index';

describe('Plural Range Selectors & Range Formatters (unicode-org/message-format-wg#125)', () => {
  function parseRange(
    arg: MessageValue<{ start: number; end: number }> | undefined
  ) {
    const range = arg?.value;
    if (!range || typeof range !== 'object')
      throw new Error(`Invalid range argument: ${range}`);
    return { start: range.start, end: range.end };
  }
  function formatRange(
    _locales: string[],
    _options: RuntimeOptions,
    range?: MessageValue<{ start: number; end: number }>
  ) {
    const { start, end } = parseRange(range);
    return `${start} - ${end}`;
  }
  function pluralRange(
    locales: string[],
    options: RuntimeOptions,
    range?: MessageValue<{ start: number; end: number }>
  ) {
    if (locales[0] !== 'nl') throw new Error('Only Dutch supported');
    const { end } = parseRange(range);
    const pr = new Intl.PluralRules(locales, options);
    return [pr.select(end)];
  }
  const runtime = { formatRange, pluralRange } satisfies Runtime;

  test('input as { start, end } object', () => {
    const mf = new MessageFormat(
      `match {$range :pluralRange}
      when one {{$range :formatRange} dag}
      when * {{$range :formatRange} dagen}
    `,
      'nl',
      { runtime }
    );

    const msg1 = mf.format({ range: { start: 0, end: 1 } });
    expect(msg1).toBe('0 - 1 dag');

    const msg2 = mf.format({ range: { start: 1, end: 2 } });
    expect(msg2).toBe('1 - 2 dagen');
  });
});

describe('Multi-selector messages (unicode-org/message-format-wg#119)', () => {
  test('All-inclusive resort (@nbouvrette)', () => {
    const src = source`
      This all-inclusive resort includes {poolCount, plural,
        =0 {no pools} one {# pool} other {# pools}
      }, {restaurantCount, plural,
        =0 {no restaurants} one {# restaurant} other {# restaurants}
      }, {beachCount, plural,
        =0 {no beaches} one {# beach} other {# beaches}
      } and {golfCount, plural,
        =0 {no golf courses} one {# golf course} other {# golf courses}
      }.`;
    const msg = mf1ToMessageData(parse(src)) as SelectMessage;
    expect(msg.selectors).toHaveLength(4);
    expect(msg.variants).toHaveLength(81);

    const mf = mf1ToMessage(msg, 'en');

    const none = mf.format({
      poolCount: 0,
      restaurantCount: 0,
      beachCount: 0,
      golfCount: 0
    });
    expect(none).toBe(
      'This all-inclusive resort includes no pools, no restaurants, no beaches and no golf courses.'
    );

    const one = mf.format({
      poolCount: 1,
      restaurantCount: 1,
      beachCount: 1,
      golfCount: 1
    });
    expect(one).toBe(
      'This all-inclusive resort includes 1 pool, 1 restaurant, 1 beach and 1 golf course.'
    );

    const two = mf.format({
      poolCount: 2,
      restaurantCount: 2,
      beachCount: 2,
      golfCount: 2
    });
    expect(two).toBe(
      'This all-inclusive resort includes 2 pools, 2 restaurants, 2 beaches and 2 golf courses.'
    );
  });

  test('Item list (@eemeli)', () => {
    const src = source`
      Listing
      {N, plural, one{one} other{#}}
      {LIVE, select, undefined{} other{current and future}}
      {TAG}
      {N, plural, one{item} other{items}}
      {DAY, select, undefined{} other{on {DAY} {TIME, select, undefined{} other{after {TIME}}}}}
      {AREA, select, undefined{} other{in {AREA}}}
      {Q, select, undefined{} other{matching the query {Q}}}
    `;
    const msg = mf1ToMessageData(parse(src)) as SelectMessage;
    expect(msg.selectors).toHaveLength(6);
    expect(msg.variants).toHaveLength(64);

    const mf = new MessageFormat(msg, 'en');

    const one = mf.format({
      N: 1,
      LIVE: String(undefined),
      TAG: 'foo',
      DAY: String(undefined),
      AREA: String(undefined),
      Q: String(undefined)
    });
    expect(one.replace(/\s+/g, ' ').trim()).toBe('Listing one foo item');

    const two = mf.format({
      N: 2,
      LIVE: true,
      TAG: 'foo',
      DAY: String(undefined),
      AREA: 'there',
      Q: '"bar"'
    });
    expect(two.replace(/\s+/g, ' ').trim()).toBe(
      'Listing 2 current and future foo items in there matching the query "bar"'
    );
  });

  test('Mozilla activity (@stasm)', () => {
    const src = source`
      activity-needed-calculation-plural = { NUMBER($totalHours) ->
          [one] {$totalHours} hour
        *[other] {$totalHours} hours
      } is achievable in just over { NUMBER($periodMonths) ->
          [one] {$periodMonths} month
        *[other] {$periodMonths} months
      } if { NUMBER($people) ->
          [one] {$people} person
        *[other] {$people} people
      } record { NUMBER($clipsPerDay) ->
          [one] {$clipsPerDay} clip
        *[other] {$clipsPerDay} clips
      } a day.
    `;
    const res = fluentToResource(src, 'en');

    const one = res.get('activity-needed-calculation-plural')?.get('')?.format({
      totalHours: 1,
      periodMonths: 1,
      people: 1,
      clipsPerDay: 1
    });
    expect(one).toBe(
      '1 hour is achievable in just over 1 month if 1 person record 1 clip a day.'
    );

    const two = res.get('activity-needed-calculation-plural')?.get('')?.format({
      totalHours: 2,
      periodMonths: 2,
      people: 2,
      clipsPerDay: 2
    });
    expect(two).toBe(
      '2 hours is achievable in just over 2 months if 2 people record 2 clips a day.'
    );
  });
});

const maybe = process.version > 'v14' ? describe : describe.skip;
maybe('List formatting', () => {
  test('Intl.ListFormat, combine/flatten inputs (unicode-org/message-format-wg#36)', () => {
    function LIST(
      locales: string[],
      options: RuntimeOptions,
      arg?: MessageValue<string | string[]>
    ) {
      const list = arg
        ? Array.isArray(arg.value)
          ? arg.value
          : [arg.value]
        : [];
      // @ts-ignore
      const lf = new Intl.ListFormat(locales, options);
      return lf.format(list);
    }

    const src = source`
      plain = { LIST($list) }
      and = { LIST($list, style: "short", type: "conjunction") }
      or = { LIST($list, style: "long", type: "disjunction") }
    `;
    const res = fluentToResource(src, 'en', { runtime: { LIST } });
    const list = ['Motorcycle', 'Bus', 'Car'];

    const plainMsg = res.get('plain')?.get('')?.format({ list });
    expect(plainMsg).toBe('Motorcycle, Bus, and Car');

    const andMsg = res.get('and')?.get('')?.format({ list });
    expect(andMsg).toBe('Motorcycle, Bus, & Car');

    const orMsg = res.get('or')?.get('')?.format({ list });
    expect(orMsg).toBe('Motorcycle, Bus, or Car');
  });

  test('List formatting with grammatical inflection on each list item (unicode-org/message-format-wg#3)', () => {
    function dative(locales: string[], arg: MessageValue<string>) {
      if (locales[0] !== 'ro') throw new Error('Only Romanian supported');
      const data: Record<string, string> = {
        Maria: 'Mariei',
        Ileana: 'Ilenei',
        Petre: 'lui Petre'
      };
      return data[arg.value] || arg.value;
    }

    const listFormatters: Record<string, typeof dative> = { dative };
    function LIST(
      locales: string[],
      options: RuntimeOptions,
      arg?: MessageValue<string | string[]>
    ) {
      let list = arg
        ? Array.isArray(arg.value)
          ? arg.value
          : [arg.value]
        : [];
      if (typeof options.each === 'string') {
        const fn = listFormatters[options.each];
        if (typeof fn !== 'function')
          throw new Error(`list each function not found: ${options.each}`);
        list = list.map(li =>
          String(fn(locales, new MessageValue(null, null, li)))
        );
      }
      // @ts-ignore
      const lf = new Intl.ListFormat(locales, options);
      return lf.format(list);
    }

    const src = source`
      msg = { $count ->
         [one] I-am dat cadouri { LIST($list, each: "dative") }.
        *[other] Le-am dat cadouri { LIST($list, each: "dative") }.
      }
    `;
    const res = fluentToResource(src, 'ro', { runtime: { LIST } });

    const list1 = ['Petre'];
    const msg1 = res.get('msg')?.get('')?.format({
      count: list1.length,
      list: list1
    });
    expect(msg1).toBe('I-am dat cadouri lui Petre.');

    const list3 = ['Maria', 'Ileana', 'Petre'];
    const msg3 = res.get('msg')?.get('')?.format({
      count: list3.length,
      list: list3
    });
    expect(msg3).toBe('Le-am dat cadouri Mariei, Ilenei și lui Petre.');
  });
});

describe('Neighbouring text transformations (unicode-org/message-format-wg#160)', () => {
  function hackyFixArticles(
    locales: string[],
    msg: MessageValue[] | undefined
  ) {
    if (locales[0] !== 'en') throw new Error('Only English supported');
    if (!msg) return;
    const articly = /(^|\s)(a|an|A|An)(\W*$)/;
    const vowely =
      /^\W*(?:11|18|8|a|e(?![uw])|heir|herb|hon|hour|i|o(?!n[ce])|u[bcdfgklmprstvxz](?![aeiou])|un(?!i))/i;
    const wordy = msg.filter(part => /\w/.test(String(part.value)));
    for (let i = 0; i < wordy.length - 1; ++i) {
      let fixed = false;
      const part = wordy[i];
      const v0 = String(part.value);
      const v1 = v0.replace(articly, (src, pre, article, post) => {
        const isAn = article === 'an' || article === 'An';
        const reqAn = vowely.test(String(wordy[i + 1].value));
        if (isAn === reqAn) return src;

        fixed = true;
        const isCap = article[0] === 'A';
        const fixedArticle = reqAn ? (isCap ? 'An' : 'an') : isCap ? 'A' : 'a';
        return pre + fixedArticle + post;
      });
      if (fixed) part.value = v1;
    }
  }

  const src = source`
    foo = A { $foo } and an { $other }
    bar = The { $foo } and lotsa { $other }
    qux = { $foo } foo and a {"..."} { $other }
  `;
  const res = fluentToResource(src, 'en');

  test('Match, no change', () => {
    const msg = res
      .get('foo')
      ?.get('')
      ?.formatToParts({ foo: 'foo', other: 'other' });
    hackyFixArticles(['en'], msg);
    expect(msg).toEqual([
      { type: 'literal', value: 'A ' },
      { type: 'value', source: '$foo', value: 'foo' },
      { type: 'literal', value: ' and an ' },
      { type: 'value', source: '$other', value: 'other' }
    ]);
  });

  test('Match, changed', () => {
    const msg = res
      .get('foo')
      ?.get('')
      ?.formatToParts({ foo: 'other', other: 'foo' });
    hackyFixArticles(['en'], msg);
    expect(msg).toEqual([
      { type: 'literal', value: 'An ' },
      { type: 'value', source: '$foo', value: 'other' },
      { type: 'literal', value: ' and a ' },
      { type: 'value', source: '$other', value: 'foo' }
    ]);
  });

  test('No match, no change', () => {
    const msg = res
      .get('bar')
      ?.get('')
      ?.formatToParts({ foo: 'foo', other: 'other' });
    hackyFixArticles(['en'], msg);
    expect(msg).toEqual([
      { type: 'literal', value: 'The ' },
      { type: 'value', source: '$foo', value: 'foo' },
      { type: 'literal', value: ' and lotsa ' },
      { type: 'value', source: '$other', value: 'other' }
    ]);
  });

  test('Articles across non-wordy content', () => {
    const msg = res
      .get('qux')
      ?.get('')
      ?.formatToParts({ foo: 'An', other: 'other' });
    hackyFixArticles(['en'], msg);
    expect(msg).toEqual([
      { type: 'value', source: '$foo', value: 'A' },
      { type: 'literal', value: ' foo and an ' },
      { type: 'literal', value: '...' },
      { type: 'literal', value: ' ' },
      { type: 'value', source: '$other', value: 'other' }
    ]);
  });
});
