import Plugin from '@swup/plugin';
import { matchPath } from 'swup';

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
	currentAnimation = null;

	constructor(options = {}) {
		// Backward compatibility
		if (Array.isArray(options)) {
			options = { animations: options };
		}
		this.options = { ...this.defaults, ...options };
		this.animations = this.compileAnimations();
	}

	mount() {
		this.replace('animation:in:await', this.awaitInAnimation);
		this.replace('animation:out:await', this.awaitOutAnimation);
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
		const animation = this.getBestAnimationMatch(visit, 'in');
		await this.createAnimationPromise(animation, visit, 'in');
	}

	async awaitOutAnimation(visit, { skip }) {
		if (skip) return;
		const animation = this.getBestAnimationMatch(visit, 'out');
		await this.createAnimationPromise(animation, visit, 'out');
	}

	createAnimationPromise(animation, visit, direction) {
		if (!(animation && animation[direction])) {
			console.warn('No animation found');
			return Promise.resolve();
		}

		const from = visit.from.url;
		const to = visit.to.url;

		const matchFrom = animation.matchesFrom(from);
		const matchTo = animation.matchesTo(to);

		const data = {
			visit,
			direction,
			from: {
				url: from,
				pattern: animation.from,
				params: matchFrom?.params
			},
			to: {
				url: to,
				pattern: animation.to,
				params: matchTo?.params
			}
		};

		return new Promise((resolve) => animation[direction](resolve, data));
	}

	getBestAnimationMatch(visit, direction) {
		// already saved from out animation
		if (direction === 'in') {
			return this.currentAnimation;
		}

		let topRating = 0;
		const animation = this.animations.reduce((bestMatch, animation) => {
			const rating = this.rateAnimation(visit, animation);
			if (rating >= topRating) {
				topRating = rating;
				return animation;
			} else {
				return bestMatch;
			}
		}, null);

		this.currentAnimation = animation;
		return animation;
	};

	rateAnimation = (visit, animation) => {
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
	};
}
