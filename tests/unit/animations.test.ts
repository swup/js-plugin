import { describe, expect, it, vi } from 'vitest';
import {
	assembleAnimationData,
	compileAnimation,
	compileAnimations,
	findAnimation,
	rateAnimation,
	runAnimation
} from '../../src/animations.js';
import type { Animation } from '../../src/animations.js';

const example: Animation = {
	from: 'from',
	to: 'to',
	in: (done) => done(),
	out: (done) => done()
};

describe('compileAnimation', () => {
	it('compiles route matcher functions', () => {
		const compiled = compileAnimation({
			...example,
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
		const uncompiled = { ...example, from: 'from', to: 'to' };
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
			{ ...example, from: 'a', to: 'b' },
			{ ...example, from: 'b', to: 'c' }
		]);

		expect(compiled).toHaveLength(2);
		expect(typeof compiled[0].matchesFrom).toBe('function');
		expect(typeof compiled[1].matchesTo).toBe('function');
		expect(compiled[0].from).toBe('a');
		expect(compiled[1].from).toBe('b');
	});
});

describe('rateAnimation', () => {
	it('ranks by from and to', () => {
		const compiled = compileAnimation(example);
		expect(rateAnimation(compiled, '', '')).toBe(0);
		expect(rateAnimation(compiled, 'from', '')).toBe(1);
		expect(rateAnimation(compiled, '', 'to')).toBe(1);
		expect(rateAnimation(compiled, 'from', 'to')).toBe(2);
	});
	it('outranks by name', () => {
		const compiled = compileAnimation(example);
		expect(rateAnimation(compiled, '', '', '')).toBe(0);
		expect(rateAnimation(compiled, '', 'to', 'to')).toBe(1);
		expect(rateAnimation(compiled, 'from', 'to', 'to')).toBe(4);
		expect(rateAnimation(compiled, 'from', '', 'to')).toBe(3);
	});
});

describe('findAnimation', () => {
	it('finds the best ranked animation', () => {
		const animations = compileAnimations([
			{ ...example, from: 'a', to: 'b' },
			{ ...example, from: 'b', to: 'c' },
			{ ...example, from: '(.*)', to: 'c' },
			{ ...example, from: 'd', to: '(.*)' },
			{ ...example, from: 'c', to: 'd' },
			{ ...example, from: '(.*)', to: '(.*)' },
			{ ...example, from: 'c', to: 'd' }
		]);
		expect(findAnimation(animations, 'a', 'b')).toBe(animations[0]);
		expect(findAnimation(animations, 'a', 'c')).toBe(animations[2]);
		expect(findAnimation(animations, 'b', 'c')).toBe(animations[1]);
		expect(findAnimation(animations, 'b', 'a')).toBe(animations[5]);
		expect(findAnimation(animations, 'd', 'c')).toBe(animations[2]);
		expect(findAnimation(animations, 'd', 'd')).toBe(animations[3]);
		expect(findAnimation(animations, 'c', 'd')).toBe(animations[4]);
	});
});

describe('runAnimation', () => {
	it('returns a promise', () => {
		const animation = compileAnimation({ ...example, from: 'a', to: 'b' });
		const data = { direction: 'out', test: 'data' };
		// @ts-ignore - we're testing the function, not the type
		const run = runAnimation(animation, data);

		expect(typeof run).toBe('object');
		expect(typeof run.then).toBe('function');
	});

	it('calls the out animation handler', () => {
		const fn = vi.fn();
		const animation = compileAnimation({ out: fn, in: () => {}, from: 'a', to: 'b' });
		const data = { direction: 'out', test: 'data' };

		// @ts-ignore - we're testing the function, not the type
		const run = runAnimation(animation, data);

		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(expect.any(Function), data);
	});

	it('calls the in animation handler', () => {
		const fn = vi.fn();
		const animation = compileAnimation({ out: () => {}, in: fn, from: 'a', to: 'b' });
		const data = { direction: 'in', test: 'data' };

		// @ts-ignore - we're testing the function, not the type
		const run = runAnimation(animation, data);

		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(expect.any(Function), data);
	});
});
