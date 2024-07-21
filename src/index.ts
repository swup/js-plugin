import Plugin from '@swup/plugin';
import { matchPath } from 'swup';
import type { Handler, Visit } from 'swup';

import { assembleAnimationData, compileAnimations, defaultAnimation, findAnimationForVisit, runAnimation } from './animations.js';
import type { Animation, CompiledAnimation } from './animations.js';

type RequireKeys<T, K extends keyof T> = Partial<T> & Pick<T, K>;

type Options = {
	/** The selector for matching the main content area of the page. */
	animations: Animation[];
	/** Options for matching paths. Directly passed into `path-to-regexp`. */
	matchOptions: MatchOptions;
};

type InitOptions = RequireKeys<Options, 'animations'>;

export type MatchOptions = Parameters<typeof matchPath>[1];

export type MatchFunction = ReturnType<typeof matchPath>;

export default class SwupJsPlugin extends Plugin {
	name = 'SwupJsPlugin';

	requires = { swup: '>=4' };

	defaults: Options = {
		animations: [],
		matchOptions: {}
	};

	options: Options;

	animations: CompiledAnimation[] = [];

	constructor(options: InitOptions) {
		super();

		// Backward compatibility: allow passing an array of animations directly
		if (Array.isArray(options)) {
			options = { animations: options as Animation[] };
		}

		this.options = { ...this.defaults, ...options };
		this.options.animations.push(defaultAnimation);
		this.animations = compileAnimations(this.options.animations, this.options.matchOptions);
	}

	mount() {
		this.replace('animation:out:await', this.awaitOutAnimation, { priority: -1 });
		this.replace('animation:in:await', this.awaitInAnimation, { priority: -1 });
	}

	/**
	 * Replace swup's internal out-animation handler.
	 * Finds and runs the 'in' animation for the current visit.
	 */
	awaitOutAnimation: Handler<'animation:out:await'> = async (visit, { skip }) => {
		if (skip) return;
		await this.findAndRunAnimation(visit, 'out');
	};

	/**
	 * Replace swup's internal in-animation handler handler.
	 * Finds and runs the 'in' animation for the current visit.
	 */
	awaitInAnimation: Handler<'animation:in:await'> = async (visit, { skip }) => {
		if (skip) return;
		await this.findAndRunAnimation(visit, 'in');
	};

	/**
	 * Find the best matching animation for the visit and run its handler function.
	 */
	async findAndRunAnimation(visit: Visit, direction: 'in' | 'out'): Promise<void> {
		const animation = findAnimationForVisit(this.animations, visit);
		if (animation) {
			const data = assembleAnimationData(animation, visit, direction);
			await runAnimation(animation, data);
		}
	}
}
