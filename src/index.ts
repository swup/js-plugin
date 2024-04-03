import Plugin from '@swup/plugin';
import { matchPath, isPromise, Visit, Handler } from 'swup';
import { Path } from 'swup';

type RequireKeys<T, K extends keyof T> = Partial<T> & Pick<T, K>;

type Animation = {
	/** The path pattern to match the current url against. */
	from: Path;
	/** The path pattern to match the next url against. */
	to: Path;
	/** The function to call when the animation is triggered. */
	out: (done: () => void, data: AnimationData) => void | Promise<void>;
	/** The function to call when the animation is triggered. */
	in: (done: () => void, data: AnimationData) => void | Promise<void>;
};

type CompiledAnimation = Animation & {
	/** Match function to check if the `from` pattern matches a given URL */
	matchesFrom: MatchFunction;
	/** Match function to check if the `to` pattern matches a given URL */
	matchesTo: MatchFunction;
};

type AnimationData = {
	visit: Visit;
	direction: 'in' | 'out';
	from: {
		url: string;
		pattern: Path;
		params: object;
	};
	to: {
		url: string;
		pattern: Path;
		params: object;
	};
};

type MatchOptions = Parameters<typeof matchPath>[1];
type MatchFunction = ReturnType<typeof matchPath>;

type Options = {
	/** The selector for matching the main content area of the page. */
	animations: Animation[];
	/** Options for matching paths. Directly passed into `path-to-regexp`. */
	matchOptions: MatchOptions;
};

type InitOptions = RequireKeys<Options, 'animations'>;

export default class SwupJsPlugin extends Plugin {
	name = 'SwupJsPlugin';

	requires = { swup: '>=4' };

	defaults: Options = {
		animations: [
			{
				from: '(.*)',
				to: '(.*)',
				out: (done) => done(),
				in: (done) => done()
			}
		],
		matchOptions: {}
	};
	options: Options;

	animations: CompiledAnimation[] = [];

	constructor(options: InitOptions) {
		super();

		// Backward compatibility
		if (Array.isArray(options)) {
			options = { animations: options as Animation[] };
		}

		this.options = { ...this.defaults, ...options };
		this.animations = this.compileAnimations();
	}

	mount() {
		this.replace('animation:in:await', this.awaitInAnimation, { priority: -1 });
		this.replace('animation:out:await', this.awaitOutAnimation, { priority: -1 });
	}

	// Compile path patterns to match functions and transitions
	compileAnimations(): CompiledAnimation[] {
		return this.options.animations.map((animation): CompiledAnimation => {
			const matchesFrom = matchPath(animation.from, this.options.matchOptions);
			const matchesTo = matchPath(animation.to, this.options.matchOptions);
			return { ...animation, matchesFrom, matchesTo };
		});
	}

	awaitInAnimation: Handler<'animation:in:await'> = async (visit, { skip }) => {
		if (skip) return;
		const animation = this.getBestAnimationMatch(visit);
		await this.createAnimationPromise(animation, visit, 'in');
	};

	awaitOutAnimation: Handler<'animation:out:await'> = async (visit, { skip }) => {
		if (skip) return;
		const animation = this.getBestAnimationMatch(visit);
		await this.createAnimationPromise(animation, visit, 'out');
	};

	createAnimationPromise(
		animation: CompiledAnimation | null,
		visit: Visit,
		direction: 'in' | 'out'
	): Promise<void> {
		const animationFn = animation ? animation[direction] : null;
		if (!animation || !animationFn) {
			console.warn('No animation found');
			return Promise.resolve();
		}

		const matchFrom = animation.matchesFrom(visit.from.url);
		const matchTo = animation.matchesTo(visit.to.url!);

		const paramsFrom = matchFrom ? matchFrom.params : {};
		const paramsTo = matchTo ? matchTo.params : {};

		const data = {
			visit,
			direction,
			from: {
				url: visit.from.url,
				pattern: animation.from,
				params: paramsFrom
			},
			to: {
				url: visit.to.url!,
				pattern: animation.to,
				params: paramsTo
			}
		};

		return new Promise((resolve) => {
			const result = animationFn(() => resolve(), data);
			if (isPromise(result)) {
				result.then(resolve);
			}
		});
	}

	getBestAnimationMatch(visit: Visit): CompiledAnimation | null {
		let topRating = 0;

		const animation: CompiledAnimation | null = this.animations.reduceRight(
			(bestMatch, animation) => {
				const rating = this.rateAnimation(visit, animation);
				if (rating >= topRating) {
					topRating = rating;
					return animation;
				} else {
					return bestMatch;
				}
			},
			null as CompiledAnimation | null
		);

		return animation;
	}

	rateAnimation(visit: Visit, animation: CompiledAnimation): number {
		const from = visit.from.url;
		const to = visit.to.url!;
		const name = visit.animation.name;

		let rating = 0;

		// check if route patterns match
		const fromMatched = animation.matchesFrom(from);
		const toMatched = animation.matchesTo(to);
		if (fromMatched) {
			rating += 1;
		}
		if (toMatched) {
			rating += 1;
		}

		// beat all others if custom name fits
		if (fromMatched && animation.to === name) {
			rating += 2;
		}

		return rating;
	}
}
