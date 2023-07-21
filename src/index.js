import Plugin from '@swup/plugin';
import { matchPath, isPromise } from 'swup';

export default class SwupJsPlugin extends Plugin {
	name = 'SwupJsPlugin';

	requires = { swup: '>=4' };

	defaults = {
		animations: [
			{
				from: '(.*)',
				to: '(.*)',
				out: (next) => next(),
				in: (next) => next()
			}
		]
	};

	animations = [];

	constructor(options = {}) {
		super();

		// Backward compatibility
		if (Array.isArray(options)) {
			options = { animations: options };
		}

		this.options = { ...this.defaults, ...options };
		this.animations = this.compileAnimations();
	}

	mount() {
		this.replace('animation:in:await', this.awaitInAnimation, { priority: -1 });
		this.replace('animation:out:await', this.awaitOutAnimation, { priority: -1 });
	}

	// Compile path patterns to match functions and transitions
	compileAnimations() {
		return this.options.animations.map((animation) => {
			const matchesFrom = matchPath(animation.from, this.options.matchOptions);
			const matchesTo = matchPath(animation.to, this.options.matchOptions);
			return { ...animation, matchesFrom, matchesTo };
		});
	}

	async awaitInAnimation(visit, { skip }) {
		if (skip) return;
		const animation = this.getBestAnimationMatch(visit);
		await this.createAnimationPromise(animation, visit, 'in');
	}

	async awaitOutAnimation(visit, { skip }) {
		if (skip) return;
		const animation = this.getBestAnimationMatch(visit);
		await this.createAnimationPromise(animation, visit, 'out');
	}

	createAnimationPromise(animation, visit, direction) {
		const animationFn = animation?.[direction];
		if (!animationFn) {
			console.warn('No animation found');
			return Promise.resolve();
		}

		const matchFrom = animation.matchesFrom(visit.from.url);
		const matchTo = animation.matchesTo(visit.to.url);

		const data = {
			visit,
			direction,
			from: {
				url: visit.from.url,
				pattern: animation.from,
				params: matchFrom?.params
			},
			to: {
				url: visit.to.url,
				pattern: animation.to,
				params: matchTo?.params
			}
		};

		return new Promise((resolve) => {
			const result = animationFn(resolve, data);
			if (isPromise(result)) {
				result.then(resolve);
			}
		});
	}

	getBestAnimationMatch(visit) {
		let topRating = 0;

		return this.animations.reduce((bestMatch, animation) => {
			const rating = this.rateAnimation(visit, animation);
			if (rating >= topRating) {
				topRating = rating;
				return animation;
			} else {
				return bestMatch;
			}
		}, null);
	}

	rateAnimation(visit, animation) {
		const from = visit.from.url;
		const to = visit.to.url;
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
