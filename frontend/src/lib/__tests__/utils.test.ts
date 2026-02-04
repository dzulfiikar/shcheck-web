import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn', () => {
  describe('basic functionality', () => {
    it('merges simple class names', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
    });

    it('returns single class name', () => {
      expect(cn('class1')).toBe('class1');
    });

    it('returns empty string for no arguments', () => {
      expect(cn()).toBe('');
    });
  });

  describe('conditional classes', () => {
    it('handles conditional object syntax', () => {
      expect(cn('base', { active: true, disabled: false })).toBe('base active');
    });

    it('handles all false conditions', () => {
      expect(cn('base', { active: false, disabled: false })).toBe('base');
    });

    it('handles all true conditions', () => {
      expect(cn('base', { active: true, disabled: true })).toBe('base active disabled');
    });
  });

  describe('array handling', () => {
    it('flattens arrays', () => {
      expect(cn(['class1', 'class2'])).toBe('class1 class2');
    });

    it('handles nested arrays', () => {
      expect(cn(['class1', ['class2', 'class3']])).toBe('class1 class2 class3');
    });

    it('handles mixed arrays and strings', () => {
      expect(cn('base', ['class1', 'class2'])).toBe('base class1 class2');
    });
  });

  describe('tailwind merge', () => {
    it('merges conflicting tailwind classes', () => {
      // The later class should win
      expect(cn('px-2', 'px-4')).toBe('px-4');
    });

    it('merges multiple conflicting classes', () => {
      expect(cn('px-2 py-1', 'px-4 py-2')).toBe('px-4 py-2');
    });

    it('preserves non-conflicting classes', () => {
      expect(cn('px-2 text-red-500', 'py-1')).toBe('px-2 text-red-500 py-1');
    });

    it('handles complex tailwind merging', () => {
      expect(cn('bg-red-500 hover:bg-red-600', 'bg-blue-500')).toBe('hover:bg-red-600 bg-blue-500');
    });
  });

  describe('falsy value handling', () => {
    it('filters out null values', () => {
      expect(cn('class1', null, 'class2')).toBe('class1 class2');
    });

    it('filters out undefined values', () => {
      expect(cn('class1', undefined, 'class2')).toBe('class1 class2');
    });

    it('filters out false values', () => {
      expect(cn('class1', false, 'class2')).toBe('class1 class2');
    });

    it('filters out empty strings', () => {
      expect(cn('class1', '', 'class2')).toBe('class1 class2');
    });

    it('filters out zero', () => {
      expect(cn('class1', 0, 'class2')).toBe('class1 class2');
    });
  });

  describe('complex scenarios', () => {
    it('handles complex mixed input', () => {
      const result = cn(
        'base-class',
        { active: true, disabled: false },
        ['array-class1', 'array-class2'],
        null,
        undefined,
        'final-class'
      );
      expect(result).toBe('base-class active array-class1 array-class2 final-class');
    });

    it('handles shadcn/ui style usage', () => {
      const baseClasses = 'inline-flex items-center justify-center';
      const variantClasses = 'bg-primary text-primary-foreground hover:bg-primary/90';
      const sizeClasses = 'h-10 px-4 py-2';
      const customClasses = 'custom-class';

      expect(cn(baseClasses, variantClasses, sizeClasses, customClasses)).toBe(
        'inline-flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 custom-class'
      );
    });

    it('handles class override pattern', () => {
      const defaultClasses = 'text-sm font-medium';
      const overrideClasses = 'text-lg';

      expect(cn(defaultClasses, overrideClasses)).toBe('font-medium text-lg');
    });
  });
});
