import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import Swup from 'swup';
import type { Visit } from 'swup';

import SwupJsPlugin from '../../src/index.js';
import { compileAnimation, type Animation } from '../../src/animations.js';

// vi.mock('../../src/animations.js');

const example: Animation = {
	from: 'from',
	to: 'to',
	in: (done) => done(),
	out: (done) => done()
};

describe('SwupJsPlugin', () => {
	let swup: Swup;
	let plugin: SwupJsPlugin;
	let visit: Visit;

	beforeEach(() => {
		vi.resetModules();
		swup = new Swup();
		plugin = new SwupJsPlugin({ animations: [example] });
		// @ts-ignore - createVisit is marked internal
		visit = swup.createVisit({ url: '/' });
	});

	afterEach(() => {
		swup.unuse(plugin);
		swup.destroy();
	});

	it('compiles animations', () => {
		swup.use(plugin);

		expect(Array.isArray(plugin.animations)).toBe(true);
		expect(typeof plugin.animations[0].matchesTo).toBe('function');
		expect(typeof plugin.animations[0].matchesFrom).toBe('function');
	});

	it('adds fallback animation', () => {
		swup.use(plugin);

		expect(plugin.animations).toHaveLength(2);
		expect(plugin.animations[1].from).toBe('(.*)');
		expect(plugin.animations[1].to).toBe('(.*)');
	});

	it('replaces the out animation handler', async () => {
		const defaultHandler = vi.fn();
		const newHandler = vi.spyOn(plugin, 'awaitOutAnimation').mockImplementation(async () => {});
		swup.use(plugin);

		await swup.hooks.call('animation:out:await', visit, { skip: false }, defaultHandler);

		expect(defaultHandler).toHaveBeenCalledTimes(0);
		expect(newHandler).toHaveBeenCalledTimes(1);
		expect(newHandler).toHaveBeenCalledWith(visit, { skip: false }, defaultHandler);
	});

	it('replaces the in animation handler', async () => {
		const defaultHandler = vi.fn();
		const newHandler = vi.spyOn(plugin, 'awaitInAnimation').mockImplementation(async () => {});
		swup.use(plugin);

		await swup.hooks.call('animation:in:await', visit, { skip: false }, defaultHandler);

		expect(defaultHandler).toHaveBeenCalledTimes(0);
		expect(newHandler).toHaveBeenCalledTimes(1);
		expect(newHandler).toHaveBeenCalledWith(visit, { skip: false }, defaultHandler);
	});

	it('finds and runs animation from replaced animation handlers', async () => {
		const spy = vi.spyOn(plugin, 'findAndRunAnimation').mockImplementation(async () => {});
		swup.use(plugin);

		await swup.hooks.call('animation:out:await', visit, { skip: false }, () => {});

		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy).toHaveBeenCalledWith(visit, 'out');

		await swup.hooks.call('animation:in:await', visit, { skip: false }, () => {});

		expect(spy).toHaveBeenCalledTimes(2);
		expect(spy).toHaveBeenCalledWith(visit, 'in');
	});

	it('respects the skip flag in arguments', async () => {
		const spy = vi.spyOn(plugin, 'findAndRunAnimation').mockImplementation(async () => {});
		swup.use(plugin);

		await swup.hooks.call('animation:out:await', visit, { skip: true }, () => {});
		await swup.hooks.call('animation:in:await', visit, { skip: true }, () => {});

		expect(spy).toHaveBeenCalledTimes(0);
	});

	it('finds and runs animation with generated data', async () => {
		const data = { test: 'data' };
		const compiled = compileAnimation(example);

		vi.doMock('../../src/animations.js', async (importOriginal) => ({
			...(await importOriginal()),
			findAnimationForVisit: vi.fn(() => compiled),
			assembleAnimationData: vi.fn(() => data),
			runAnimation: vi.fn()
		}));

		const { findAnimationForVisit, runAnimation, assembleAnimationData } = await import(
			'../../src/animations.js'
		);
		const { default: Plugin } = await import('../../src/index.js');
		plugin = new Plugin({ animations: [example] });
		swup.use(plugin);

		await plugin.findAndRunAnimation(visit, 'out');

		expect(findAnimationForVisit).toHaveBeenCalledWith(plugin.animations, visit);
		expect(assembleAnimationData).toHaveBeenCalledWith(compiled, visit, 'out');
		expect(runAnimation).toHaveBeenCalledWith(compiled, data);
	});
});
