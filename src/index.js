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
		],
		matchOptions: {}
	};

	animations = [];
	currentAnimation = null;

	constructor(options = {}) {
		super();

		// Backward compatibility
		if (Array.isArray(options)) {
			options = { animations: options };
		}
		this.options = { ...this.defaults, ...options };
		this.animations = this.compileAnimations();
		this.awaitAnimation = this.awaitAnimation.bind(this);
	}

	mount() {
		this.swup.hooks.replace('awaitAnimation', this.awaitAnimation);
	}

	unmount() {
		this.swup.hooks.off('awaitAnimation', this.awaitAnimation);
	}

	// Compile path patterns to match functions and transitions
	compileAnimations() {
		return this.options.animations.map((animation) => {
			const matchesFrom = matchPath(animation.from, this.options.matchOptions);
			const matchesTo = matchPath(animation.to, this.options.matchOptions);
			return { ...animation, matchesFrom, matchesTo };
		});
	}

	awaitAnimation = async (context, { direction }) => {
		const animation = this.getBestAnimationMatch(context, direction);
		await this.createAnimationPromise(animation, context, direction);
	};

	createAnimationPromise = (animation, context, direction) => {
		if (!(animation && animation[direction])) {
			console.warn('No animation found');
			return Promise.resolve();
		}

		const from = context.from.url;
		const to = context.to.url;

		const matchFrom = animation.matchesFrom(from);
		const matchTo = animation.matchesTo(to);

		const data = {
			context,
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

		return new Promise((resolve) => {
			animation[direction](resolve, data);
		});
	};

	getBestAnimationMatch = (context, direction) => {
		// already saved from out animation
		if (direction === 'in') {
			return this.currentAnimation;
		}

		let topRating = 0;
		const animation = this.animations.reduce((bestMatch, animation) => {
			const rating = this.rateAnimation(context, animation);
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

	rateAnimation = (context, animation) => {
		const from = context.from.url;
		const to = context.to.url;
		const custom = context.transition.name;

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

		// beat all others if custom parameter fits
		if (fromMatched && animation.to === custom) {
			rating += 2;
		}

		return rating;
	};
}
