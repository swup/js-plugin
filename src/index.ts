import Plugin from '@swup/plugin';
import { matchPath, isPromise } from 'swup';
import type { Handler, Visit } from 'swup';
import { Animation, AnimationData, compileAnimations, CompiledAnimation, matchAnimation } from './animations.js';

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

	defaultAnimation: Animation = {
    from: '(.*)',
    to: '(.*)',
    out: (done) => done(),
    in: (done) => done()
  };

	constructor(options: InitOptions) {
		super();

		// Backward compatibility
		if (Array.isArray(options)) {
			options = { animations: options as Animation[] };
		}

		this.options = { ...this.defaults, ...options };
		this.options.animations.push(this.defaultAnimation);
		this.animations = compileAnimations(this.options.animations, this.options.matchOptions);
	}

	mount() {
		this.replace('animation:in:await', this.awaitInAnimation, { priority: -1 });
		this.replace('animation:out:await', this.awaitOutAnimation, { priority: -1 });
	}

	awaitInAnimation: Handler<'animation:in:await'> = async (visit, { skip }) => {
		if (skip) return;
		const animation = matchAnimation(this.animations, visit.from.url, visit.to.url, visit.animation.name);
		if (animation) {
			await this.createAnimationPromise(animation, visit, 'in');
		}
	};

	awaitOutAnimation: Handler<'animation:out:await'> = async (visit, { skip }) => {
		if (skip) return;
		const animation = matchAnimation(this.animations, visit.from.url, visit.to.url, visit.animation.name);
		if (animation) {
			await this.createAnimationPromise(animation, visit, 'out');
		}
	};

	createAnimationPromise(animation: CompiledAnimation, visit: Visit, direction: 'in' | 'out'): Promise<void> {
		const animationFn = animation[direction];
		if (!animationFn) {
			console.warn(`Missing animation function for '${direction}' phase`);
			return Promise.resolve();
		}

		return new Promise((resolve) => {
			const data = this.getAnimationData(animation, visit, direction);
			const result = animationFn(() => resolve(), data);
			if (isPromise(result)) {
				result.then(resolve);
			}
		});
	}

	getAnimationData(animation: CompiledAnimation, visit: Visit, direction: 'in' | 'out'): AnimationData {
		const matchFrom = animation.matchesFrom(visit.from.url);
		const matchTo = animation.matchesTo(visit.to.url!);

		return {
			visit,
			direction,
			from: {
				url: visit.from.url,
				pattern: animation.from,
				params: matchFrom ? matchFrom.params : {}
			},
			to: {
				url: visit.to.url!,
				pattern: animation.to,
				params: matchTo ? matchTo.params : {}
			}
		};
	}

}
