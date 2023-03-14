---
title: "MessageFormatOptions / localeCodeFromKey"
parent: "@messageformat/core"
grand_parent: API Reference
nav_exclude: true
---

<!-- Do not edit this file. It is automatically generated by API Documenter. -->



# MessageFormatOptions.localeCodeFromKey property

If defined, used by [compileModule()](./core.compilemodule.md) to identify and map keys to the locale identifiers used by formatters and plural rules. The values returned by the function should match the `locale` argument.

Default: `undefined`

**Signature:**

```typescript
localeCodeFromKey?: ((key: string) => string | null | undefined) | null;
```

## Example


```js
// Support all recognised Unicode locale identifiers
function localeCodeFromKey(key) {
  try {
    // Ignore all language subtags
    return new Intl.Locale(key).language
  } catch {
    return null
  }
}
```
