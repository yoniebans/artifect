// src/templates/template-helpers.spec.ts

import * as Handlebars from 'handlebars';
import { registerHelpers } from './template-helpers';

describe('Template Helpers', () => {
    // Register all helpers before testing
    beforeAll(() => {
        registerHelpers();
    });

    // Create a helper to compile and execute templates with contexts
    const compileAndRun = (template: string, context: any) => {
        const compiled = Handlebars.compile(template);
        return compiled(context);
    };

    describe('exists helper', () => {
        it('should check if a value exists', () => {
            const trueTemplate = '{{#if (exists value)}}exists{{else}}does not exist{{/if}}';
            const falseTemplate = '{{#if (exists nonExistent)}}exists{{else}}does not exist{{/if}}';

            expect(compileAndRun(trueTemplate, { value: 'test' })).toBe('exists');
            expect(compileAndRun(trueTemplate, { value: 0 })).toBe('exists');
            expect(compileAndRun(trueTemplate, { value: false })).toBe('exists');
            expect(compileAndRun(falseTemplate, { value: 'test' })).toBe('does not exist');
            expect(compileAndRun(trueTemplate, { value: null })).toBe('does not exist');
            expect(compileAndRun(trueTemplate, { value: undefined })).toBe('does not exist');
        });
    });

    describe('ifEquals helper', () => {
        it('should check if two values are equal', () => {
            const template = '{{#ifEquals a b}}equal{{else}}not equal{{/ifEquals}}';

            expect(compileAndRun(template, { a: 'test', b: 'test' })).toBe('equal');
            expect(compileAndRun(template, { a: 5, b: 5 })).toBe('equal');
            expect(compileAndRun(template, { a: true, b: true })).toBe('equal');
            expect(compileAndRun(template, { a: 'test', b: 'other' })).toBe('not equal');
            expect(compileAndRun(template, { a: 5, b: '5' })).toBe('not equal'); // Strict equality
        });
    });

    describe('ifNotEquals helper', () => {
        it('should check if two values are not equal', () => {
            const template = '{{#ifNotEquals a b}}not equal{{else}}equal{{/ifNotEquals}}';

            expect(compileAndRun(template, { a: 'test', b: 'other' })).toBe('not equal');
            expect(compileAndRun(template, { a: 5, b: 10 })).toBe('not equal');
            expect(compileAndRun(template, { a: 'test', b: 'test' })).toBe('equal');
        });
    });

    describe('ifTruthy and ifFalsy helpers', () => {
        it('should check if a value is truthy', () => {
            const template = '{{#ifTruthy value}}truthy{{else}}falsy{{/ifTruthy}}';

            expect(compileAndRun(template, { value: 'test' })).toBe('truthy');
            expect(compileAndRun(template, { value: 1 })).toBe('truthy');
            expect(compileAndRun(template, { value: true })).toBe('truthy');
            expect(compileAndRun(template, { value: [] })).toBe('truthy');
            expect(compileAndRun(template, { value: {} })).toBe('truthy');

            expect(compileAndRun(template, { value: '' })).toBe('falsy');
            expect(compileAndRun(template, { value: 0 })).toBe('falsy');
            expect(compileAndRun(template, { value: false })).toBe('falsy');
            expect(compileAndRun(template, { value: null })).toBe('falsy');
            expect(compileAndRun(template, { value: undefined })).toBe('falsy');
        });

        it('should check if a value is falsy', () => {
            const template = '{{#ifFalsy value}}falsy{{else}}truthy{{/ifFalsy}}';

            expect(compileAndRun(template, { value: '' })).toBe('falsy');
            expect(compileAndRun(template, { value: 0 })).toBe('falsy');
            expect(compileAndRun(template, { value: false })).toBe('falsy');
            expect(compileAndRun(template, { value: null })).toBe('falsy');
            expect(compileAndRun(template, { value: undefined })).toBe('falsy');

            expect(compileAndRun(template, { value: 'test' })).toBe('truthy');
            expect(compileAndRun(template, { value: 1 })).toBe('truthy');
            expect(compileAndRun(template, { value: true })).toBe('truthy');
        });
    });

    describe('comparison helpers', () => {
        it('should check if a value is greater than another', () => {
            const template = '{{#ifGreater a b}}greater{{else}}not greater{{/ifGreater}}';

            expect(compileAndRun(template, { a: 10, b: 5 })).toBe('greater');
            expect(compileAndRun(template, { a: 5, b: 10 })).toBe('not greater');
            expect(compileAndRun(template, { a: 5, b: 5 })).toBe('not greater');
        });

        it('should check if a value is less than another', () => {
            const template = '{{#ifLess a b}}less{{else}}not less{{/ifLess}}';

            expect(compileAndRun(template, { a: 5, b: 10 })).toBe('less');
            expect(compileAndRun(template, { a: 10, b: 5 })).toBe('not less');
            expect(compileAndRun(template, { a: 5, b: 5 })).toBe('not less');
        });
    });

    describe('array helpers', () => {
        it('should check if an array contains a value', () => {
            const template = '{{#ifContains array value}}contains{{else}}does not contain{{/ifContains}}';

            expect(compileAndRun(template, { array: [1, 2, 3], value: 2 })).toBe('contains');
            expect(compileAndRun(template, { array: ['a', 'b', 'c'], value: 'd' })).toBe('does not contain');
            expect(compileAndRun(template, { array: null, value: 'a' })).toBe('does not contain');
        });

        it('should join array elements with a separator', () => {
            const template = '{{join array ", "}}';

            expect(compileAndRun(template, { array: [1, 2, 3] })).toBe('1, 2, 3');
            expect(compileAndRun(template, { array: ['a', 'b', 'c'] })).toBe('a, b, c');
            expect(compileAndRun(template, { array: [] })).toBe('');
            expect(compileAndRun(template, { array: null })).toBe('');
        });

        it('should slice an array', () => {
            const template = '{{join (slice array 1 3) ", "}}';

            expect(compileAndRun(template, { array: [1, 2, 3, 4, 5] })).toBe('2, 3');
            expect(compileAndRun(template, { array: ['a', 'b', 'c', 'd'] })).toBe('b, c');
            expect(compileAndRun(template, { array: null })).toBe('');
        });
    });

    describe('string helpers', () => {
        it('should convert a string to uppercase', () => {
            const template = '{{uppercase string}}';

            expect(compileAndRun(template, { string: 'test' })).toBe('TEST');
            expect(compileAndRun(template, { string: 'Test String' })).toBe('TEST STRING');
            expect(compileAndRun(template, { string: null })).toBe('');
        });

        it('should convert a string to lowercase', () => {
            const template = '{{lowercase string}}';

            expect(compileAndRun(template, { string: 'TEST' })).toBe('test');
            expect(compileAndRun(template, { string: 'Test String' })).toBe('test string');
            expect(compileAndRun(template, { string: null })).toBe('');
        });

        it('should concatenate strings', () => {
            const template = '{{concat a b c}}';

            expect(compileAndRun(template, { a: 'Hello', b: ' ', c: 'World' })).toBe('Hello World');
            expect(compileAndRun(template, { a: 'Test', b: 123, c: true })).toBe('Test123true');
        });
    });

    describe('logical helpers', () => {
        it('should perform logical OR', () => {
            const template = '{{#or a b c}}true{{else}}false{{/or}}';

            expect(compileAndRun(template, { a: true, b: false, c: false })).toBe('true');
            expect(compileAndRun(template, { a: false, b: true, c: false })).toBe('true');
            expect(compileAndRun(template, { a: false, b: false, c: false })).toBe('false');
        });

        it('should perform logical AND', () => {
            const template = '{{#and a b c}}true{{else}}false{{/and}}';

            expect(compileAndRun(template, { a: true, b: true, c: true })).toBe('true');
            expect(compileAndRun(template, { a: true, b: false, c: true })).toBe('false');
            expect(compileAndRun(template, { a: false, b: false, c: false })).toBe('false');
        });
    });

    describe('formatDate helper', () => {
        it('should format dates in various formats', () => {
            const date = new Date('2023-05-15T12:30:45Z');

            // Test with different formats
            const template = `
        ISO: {{formatDate date}}
        YYYY-MM-DD: {{formatDate date 'YYYY-MM-DD'}}
        MM/DD/YYYY: {{formatDate date 'MM/DD/YYYY'}}
        DD/MM/YYYY: {{formatDate date 'DD/MM/YYYY'}}
      `;

            const result = compileAndRun(template, { date });

            expect(result).toContain(`ISO: ${date.toISOString()}`);
            expect(result).toContain('YYYY-MM-DD: 2023-05-15');
            expect(result).toContain('MM/DD/YYYY: 05/15/2023');
            expect(result).toContain('DD/MM/YYYY: 15/05/2023');
        });

        it('should handle invalid dates', () => {
            const template = '{{formatDate date}}';

            expect(compileAndRun(template, { date: null })).toBe('');
            expect(compileAndRun(template, { date: undefined })).toBe('');
            expect(compileAndRun(template, { date: 'not a date' })).not.toThrow;
        });
    });
});