import { MessageResolutionError } from '../errors.js';
import type { Context } from '../format-context.js';
import {
  MessageFunctionContext,
  MessageValue,
  fallback,
  unknown
} from '../runtime/index.js';
import type { Expression } from './index.js';

/**
 * The value of a VariableRef is defined by the current Scope.
 *
 * @remarks
 * To refer to an inner property of an object value, use `.` as a separator;
 * in case of conflict, the longest starting substring wins.
 * For example, `'user.name'` would be first matched by an exactly matching top-level key,
 * and in case that fails, with the `'name'` property of the `'user'` object:
 * The runtime scopes `{ 'user.name': 'Kat' }` and `{ user: { name: 'Kat' } }`
 * would both resolve a `'user.name'` VariableRef as the string `'Kat'`.
 *
 * @beta
 */
export interface VariableRef {
  type: 'variable';
  name: string;
}

/**
 * Declarations aren't resolved until they're requierd,
 * and their resolution order matters for variable resolution.
 * This internal class is used to store any required data,
 * and to allow for `instanceof` detection.
 * @private
 */
export class UnresolvedExpression {
  expression: Expression;
  scope: Context['scope'];
  constructor(expression: Expression, scope: Context['scope']) {
    this.expression = expression;
    this.scope = scope;
  }
}

/**
 * Type guard for {@link VariableRef} pattern elements
 *
 * @beta
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isVariableRef = (part: any): part is VariableRef =>
  !!part && typeof part === 'object' && part.type === 'variable';

const isScope = (scope: unknown): scope is Record<string, unknown> =>
  scope instanceof Object;

/**
 * Looks for the longest matching `.` delimited starting substring of name.
 * @returns `undefined` if value not found
 */
function getValue(scope: unknown, name: string): unknown {
  if (isScope(scope)) {
    if (name in scope) return scope[name];

    const parts = name.split('.');
    for (let i = parts.length - 1; i > 0; --i) {
      const head = parts.slice(0, i).join('.');
      if (head in scope) {
        const tail = parts.slice(i).join('.');
        return getValue(scope[head], tail);
      }
    }
  }

  return undefined;
}

export function lookupVariableRef(ctx: Context, { name }: VariableRef) {
  const value = getValue(ctx.scope, name);
  if (value instanceof UnresolvedExpression) {
    const local = { ...ctx, scope: value.scope }.resolveExpression(
      value.expression
    );
    ctx.scope[name] = local;
    ctx.localVars.add(local);
    return local;
  }
  return value;
}

export function getMessageValue(
  ctx: Context,
  source: string,
  value: unknown
): MessageValue | undefined {
  let type = typeof value;
  if (type === 'object') {
    const mv = value as MessageValue;
    if (ctx.localVars.has(mv)) return mv;
    if (value instanceof Number) type = 'number';
    else if (value instanceof String) type = 'string';
  }
  switch (type) {
    case 'bigint':
    case 'number': {
      const msgCtx = new MessageFunctionContext(ctx, source);
      return ctx.functions.number(msgCtx, {}, value);
    }
    case 'string': {
      const msgCtx = new MessageFunctionContext(ctx, source);
      return ctx.functions.string(msgCtx, {}, value);
    }
    default:
      return value === undefined ? undefined : unknown(source, value);
  }
}

export function resolveVariableRef(ctx: Context, ref: VariableRef) {
  const source = '$' + ref.name;
  const value = lookupVariableRef(ctx, ref);
  const mv = getMessageValue(ctx, source, value);
  if (mv !== undefined) return mv;
  const msg = `Variable not available: ${source}`;
  ctx.onError(new MessageResolutionError('unresolved-var', msg, source));
  return fallback(source);
}
