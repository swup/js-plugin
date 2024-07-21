import { afterEach, describe, expect, it, vitest } from 'vitest';
import { compileAnimation, compileAnimations } from '../../src/animations.js';
import * as animations from '../../src/animations.js';
import type { Animation } from '../../src/animations.js';

const exampleAnimation: Animation = {
	from: 'from/:slug',
	to: 'to/:slug',
	in: (done) => done(),
	out: (done) => done()
};

const defaultAnimation: Animation = {
	from: '(.*)',
	to: '(.*)',
	in: (done) => done(),
	out: (done) => done()
};

describe('compileAnimation', () => {
	it('compiles route matcher functions', () => {
		const compiled = compileAnimation({
			...defaultAnimation,
			from: 'from/:slug',
			to: 'to/:slug'
		});

		expect(typeof compiled.matchesFrom).toBe('function');
		expect(typeof compiled.matchesTo).toBe('function');

		expect(compiled.matchesFrom('to/test')).toBe(false);
		expect(compiled.matchesTo('from/test')).toBe(false);

		expect(compiled.matchesFrom('from/test')).toMatchObject({
			index: 0,
			params: { slug: 'test' },
			path: 'from/test'
		});
		expect(compiled.matchesTo('to/test')).toMatchObject({
			index: 0,
			params: { slug: 'test' },
			path: 'to/test'
		});
	});

	it('keeps existing keys', () => {
		const uncompiled = { ...defaultAnimation, from: 'from', to: 'to' };
		const compiled = compileAnimation(uncompiled);
		expect(compiled.from).toBe(uncompiled.from);
		expect(compiled.to).toBe(uncompiled.to);
		expect(compiled.in).toBe(uncompiled.in);
		expect(compiled.out).toBe(uncompiled.out);
	});
});

describe('compileAnimations', () => {
	it('compiles each member of the array passed in', () => {
		const compiled = compileAnimations([
			{ ...exampleAnimation, from: 'a', to: 'b' },
			{ ...exampleAnimation, from: 'b', to: 'c' },
		]);
		expect(compiled).toHaveLength(2);
		expect(typeof compiled[0].matchesFrom).toBe('function');
		expect(typeof compiled[1].matchesTo).toBe('function');
		expect(compiled[0].from).toBe('a');
		expect(compiled[1].from).toBe('b');
	});
});
