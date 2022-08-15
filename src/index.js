import Plugin from '@swup/plugin';
import pathToRegexp from 'path-to-regexp';

export default class JsPlugin extends Plugin {
	name = 'JsPlugin';

	currentAnimation = null;

	constructor(options = {}) {
		super();
		const defaultOptions = [
			{
				from: '(.*)',
				to: '(.*)',
				out: (next) => next(),
				in: (next) => next()
			}
		];

		this.options = {
			...defaultOptions,
			...options
		};

		this.generateRegex();
	}

	mount() {
		const swup = this.swup;

		swup._getAnimationPromises = swup.getAnimationPromises;
		swup.getAnimationPromises = this.getAnimationPromises;
	}

	unmount() {
		const swup = this.swup;

		swup.getAnimationPromises = swup._getAnimationPromises;
		swup._getAnimationPromises = null;
	}

	generateRegex() {
		const isRegex = (str) => str instanceof RegExp;

		this.options = Object.keys(this.options).map((key) => {
			return {
				...this.options[key],
				regFrom: isRegex(this.options[key].from)
					? this.options[key].from
					: pathToRegexp(this.options[key].from),
				regTo: isRegex(this.options[key].to)
					? this.options[key].to
					: pathToRegexp(this.options[key].to)
			};
		});
	}

	getAnimationPromises = (type) => {
		const animationIndex = this.getAnimationIndex(type);
		return [this.createAnimationPromise(animationIndex, type)];
	};

	createAnimationPromise = (index, type) => {
		const currentTransitionRoutes = this.swup.transition;
		const animation = this.options[index];

		if (!(animation && animation[type])) {
			console.warn('No animation found');
			return Promise.resolve();
		}

		return new Promise((resolve) => {
			animation[type](resolve, {
				paramsFrom: animation.regFrom.exec(currentTransitionRoutes.from),
				paramsTo: animation.regTo.exec(currentTransitionRoutes.to),
				transition: currentTransitionRoutes,
				from: animation.from,
				to: animation.to
			});
		});
	};

	getAnimationIndex = (type) => {
		// already saved from out animation
		if (type === 'in') {
			return this.currentAnimation;
		}

		const animations = this.options;
		let animationIndex = 0;
		let topRating = 0;

		Object.keys(animations).forEach((key, index) => {
			const animation = animations[key];
			const rating = this.rateAnimation(animation);

			if (rating >= topRating) {
				animationIndex = index;
				topRating = rating;
			}
		});

		this.currentAnimation = animationIndex;
		return this.currentAnimation;
	};

	rateAnimation = (animation) => {
		const currentTransitionRoutes = this.swup.transition;
		let rating = 0;

		// run regex
		const fromMatched = animation.regFrom.test(currentTransitionRoutes.from);
		const toMatched = animation.regTo.test(currentTransitionRoutes.to);

		// check if regex passes
		rating += fromMatched ? 1 : 0;
		rating += toMatched ? 1 : 0;

		// beat all other if custom parameter fits
		rating += fromMatched && animation.to === currentTransitionRoutes.custom ? 2 : 0;

		return rating;
	};
}
