// src/templates/template-helpers.ts

/**
 * Helper functions for template operations
 */

import * as Handlebars from 'handlebars';

/**
 * Register all custom helpers for Handlebars templates
 */
export function registerHelpers(): void {
    // Check if a value exists (not undefined or null)
    Handlebars.registerHelper('exists', function (value) {
        return value !== undefined && value !== null;
    });

    // Equality check for conditionals
    Handlebars.registerHelper('ifEquals', function (arg1, arg2, options) {
        return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
    });

    // Not equals check for conditionals
    Handlebars.registerHelper('ifNotEquals', function (arg1, arg2, options) {
        return (arg1 !== arg2) ? options.fn(this) : options.inverse(this);
    });

    // Check if a value is truthy
    Handlebars.registerHelper('ifTruthy', function (value, options) {
        return value ? options.fn(this) : options.inverse(this);
    });

    // Check if a value is falsy
    Handlebars.registerHelper('ifFalsy', function (value, options) {
        return !value ? options.fn(this) : options.inverse(this);
    });

    // Check if a value is greater than another
    Handlebars.registerHelper('ifGreater', function (arg1, arg2, options) {
        return (arg1 > arg2) ? options.fn(this) : options.inverse(this);
    });

    // Check if a value is less than another
    Handlebars.registerHelper('ifLess', function (arg1, arg2, options) {
        return (arg1 < arg2) ? options.fn(this) : options.inverse(this);
    });

    // Check if an array contains a value
    Handlebars.registerHelper('ifContains', function (array, value, options) {
        if (!Array.isArray(array)) {
            return options.inverse(this);
        }
        return array.includes(value) ? options.fn(this) : options.inverse(this);
    });

    // Join array elements with a separator
    Handlebars.registerHelper('join', function (array, separator) {
        if (!Array.isArray(array)) {
            return '';
        }
        return array.join(separator);
    });

    // Format a date
    Handlebars.registerHelper('formatDate', function (date, format) {
        if (!date) {
            return '';
        }

        try {
            const d = new Date(date);

            // Check if date is valid
            if (isNaN(d.getTime())) {
                return '';
            }

            // Simple formatter - can be expanded for more complex formats
            switch (format) {
                case 'YYYY-MM-DD':
                    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                case 'MM/DD/YYYY':
                    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
                case 'DD/MM/YYYY':
                    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                default:
                    return d.toISOString();
            }
        } catch (error) {
            return '';
        }
    });

    // Slice an array
    Handlebars.registerHelper('slice', function (array, start, end) {
        if (!Array.isArray(array)) {
            return [];
        }
        return array.slice(start, end);
    });

    // Convert to uppercase
    Handlebars.registerHelper('uppercase', function (str) {
        if (typeof str !== 'string') {
            return '';
        }
        return str.toUpperCase();
    });

    // Convert to lowercase
    Handlebars.registerHelper('lowercase', function (str) {
        if (typeof str !== 'string') {
            return '';
        }
        return str.toLowerCase();
    });

    // Concatenate strings
    Handlebars.registerHelper('concat', function (...args) {
        // Remove the last argument (Handlebars options)
        args.pop();
        return args.join('');
    });

    // Conditional helper for multiple conditions (OR)
    Handlebars.registerHelper('or', function (...args) {
        const options = args.pop();
        return args.some(Boolean) ? options.fn(this) : options.inverse(this);
    });

    // Conditional helper for multiple conditions (AND)
    Handlebars.registerHelper('and', function (...args) {
        const options = args.pop();
        return args.every(Boolean) ? options.fn(this) : options.inverse(this);
    });
}