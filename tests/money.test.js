import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePesos, formatPesos } from '../src/money.js';

test('parsePesos acepta coma decimal', () => assert.equal(parsePesos('185,50'), 18550));
test('parsePesos acepta coma de miles y signo $', () => assert.equal(parsePesos('$1,200'), 120000));
test('parsePesos acepta punto decimal de un dígito', () => assert.equal(parsePesos('1200.5'), 120050));
test('parsePesos recorta espacios', () => assert.equal(parsePesos('  75 '), 7500));
test('parsePesos acepta miles y decimales', () => assert.equal(parsePesos('1,200.50'), 120050));
for (const malo of ['', '0', '-5', 'abc', '1.234', '1..2', '0,00']) {
  test(`parsePesos rechaza ${JSON.stringify(malo)}`, () => assert.throws(() => parsePesos(malo), /Monto inválido/));
}
test('formatPesos con miles', () => assert.equal(formatPesos(123450), '$1,234.50'));
test('formatPesos cero', () => assert.equal(formatPesos(0), '$0.00'));
test('formatPesos negativo', () => assert.equal(formatPesos(-5000), '-$50.00'));
