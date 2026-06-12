import { describe, it, expect } from 'vitest';
import { annotateError } from './errorJa';

describe('annotateError — 英語エラーの読み解き', () => {
  it('is not defined', () => {
    const a = annotateError('hana is not defined');
    expect(a?.reading).toContain('hana');
    expect(a?.reading).toContain('まだ知りません');
  });

  it('Unexpected token', () => {
    const a = annotateError("Unexpected token ')'");
    expect(a?.reading).toContain(')');
  });

  it('Unexpected end of input', () => {
    expect(annotateError('Unexpected end of input')?.reading).toContain('終わって');
  });

  it('is not a function', () => {
    const a = annotateError('foo.bar is not a function');
    expect(a?.reading).toContain('foo.bar');
  });

  it('Cannot read properties of undefined', () => {
    const a = annotateError("Cannot read properties of undefined (reading 'length')");
    expect(a?.reading).toContain('length');
    expect(a?.reading).toContain('undefined');
  });

  it('Maximum call stack', () => {
    expect(annotateError('Maximum call stack size exceeded')?.reading).toContain('自分自身');
  });

  it('全角記号', () => {
    expect(annotateError('Invalid or unexpected token')?.hint).toContain('全角');
  });

  it('const 再代入', () => {
    expect(annotateError('Assignment to constant variable.')?.reading).toContain('const');
  });

  it('知らないエラーは null（無理に訳さない）', () => {
    expect(annotateError('Some exotic engine error')).toBeNull();
  });
});
