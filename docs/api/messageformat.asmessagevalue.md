---
title: "asMessageValue"
parent: "messageformat"
grand_parent: API Reference
---

<!-- Do not edit this file. It is automatically generated by API Documenter. -->



# asMessageValue() function

> This API is provided as a preview for developers and may change based on feedback that we receive. Do not use this API in a production environment.
> 

Convert any numerical value into a [MessageNumber](./messageformat.messagenumber.md)<!-- -->.

<b>Signature:</b>

```typescript
export declare function asMessageValue(ctx: Context, value: number | bigint, format?: {
    meta?: Readonly<Meta>;
    source?: string;
}): MessageNumber;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  ctx | Context |  |
|  value | number \| bigint |  |
|  format | { meta?: Readonly&lt;[Meta](./messageformat.meta.md)<!-- -->&gt;; source?: string; } | <i>(Optional)</i> |

<b>Returns:</b>

[MessageNumber](./messageformat.messagenumber.md)
