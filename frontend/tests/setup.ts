import { vi } from 'vitest';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
// jsdom has no layout engine. Supply geometry for keyboard-focus tests only.
// These tests do not assert responsive appearance or actual target dimensions.
vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(function (this: HTMLElement) {
  return (this.hidden ? [] : [new DOMRect(0, 0, 44, 44)]) as unknown as DOMRectList;
});
