---
title: "Skeleton / precision"
parent: "@messageformat/number-skeleton"
grand_parent: API Reference
nav_exclude: true
---

<!-- Do not edit this file. It is automatically generated by API Documenter. -->



# Skeleton.precision property

<b>Signature:</b>

```typescript
precision?: {
        style: 'precision-integer' | 'precision-unlimited' | 'precision-currency-standard' | 'precision-currency-cash';
    } | {
        style: 'precision-increment';
        increment: number;
    } | {
        style: 'precision-fraction';
        minFraction?: number;
        maxFraction?: number;
        minSignificant?: number;
        maxSignificant?: number;
        source?: string;
    };
```