import { isPromise, matchPath } from 'swup';
import type { Path, Visit } from 'swup';

import { MatchFunction, MatchOptions } from './index.js';

/**
 * Animation object as supplied by plugin users.
 * Contains path patterns and handler functions for in/out animation.
 */
export type Animation = {
	/** The path pattern to match the current url against. */
	from: Path;
	/** The path pattern to match the next url against. */
	to: Path;
	/** The function to call when the animation is triggered. */
	out: (done: () => void, data: AnimationData) => void | Promise<void>;
	/** The function to call when the animation is triggered. */
	in: (done: () => void, data: AnimationData) => void | Promise<void>;
};

/**
 * Compiled animation object with pre-optimized match functions.
 */
export type CompiledAnimation = Animation & {
	/** Match function to check if the `from` pattern matches a given URL */
	matchesFrom: MatchFunction;
	/** Match function to check if the `to` pattern matches a given URL */
	matchesTo: MatchFunction;
};

/**
 * Data object passed into the animation handler functions.
 */
export type AnimationData = {
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

/**
 * The animation object to use when no other animation matches.
 */
export const defaultAnimation: Animation = {
	from: '(.*)',
	to: '(.*)',
	out: (done) => done(),
	in: (done) => done()
};

/**
 * Compile animations to match functions and transitions
 */
export function compileAnimations(animations: Animation[], matchOptions?: MatchOptions): CompiledAnimation[] {
	return animations.map((animation): CompiledAnimation => compileAnimation(animation, matchOptions));
}

/**
 * Compile path patterns to match functions and transitions
 */
function compileAnimation(animation: Animation, matchOptions?: MatchOptions): CompiledAnimation {
	const matchesFrom = matchPath(animation.from, matchOptions);
	const matchesTo = matchPath(animation.to, matchOptions);
	return { ...animation, matchesFrom, matchesTo };
}

/**
 * Rate animation based on the match
 */
export function rateAnimation(animation: CompiledAnimation, from: string, to: string, name: string | undefined): number {
	let rating = 0;

	// Check if route patterns match
	const fromMatched = animation.matchesFrom(from);
	const toMatched = animation.matchesTo(to);
	if (fromMatched) {
		rating += 1;
	}
	if (toMatched) {
		rating += 1;
	}

	// Beat all others if custom name fits
	if (fromMatched && animation.to === name) {
		rating += 2;
	}

	return rating;
}

/**
 * Find the best matching animation given a visit object
 */
export function findAnimationForVisit(animations: CompiledAnimation[], visit: Visit): CompiledAnimation | null {
	return findAnimation(animations, visit.from.url, visit.to.url, visit.animation.name);
}

/**
 * Find the best matching animation by ranking them against each other
 */
export function findAnimation(animations: CompiledAnimation[], from: string, to: string, name: string | undefined): CompiledAnimation | null {
	let topRating = 0;

	const animation: CompiledAnimation | null = animations.reduceRight(
		(bestMatch, animation) => {
			const rating = rateAnimation(animation, from, to, name);
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

/**
 * Create an object with all the data passed into the animation handler function
 */
export function assembleAnimationData(animation: CompiledAnimation, visit: Visit, direction: 'in' | 'out'): AnimationData {
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
};


/**
 * Run an animation handler function and resolve when it's done.
 */
export function runAnimation(animation: CompiledAnimation, data: AnimationData): Promise<void> {
	const { direction } = data;
	const animationFn = animation[direction];
	if (!animationFn) {
		console.warn(`Missing animation function for '${direction}' phase`);
		return Promise.resolve();
	}

	return new Promise((resolve) => {
		/* Sync API: Pass `done` callback into animation handler so it can resolve manually */
		const result = animationFn(() => resolve(), data);
		/* Async API: Receive a promise from animation handler so we resolve it here */
		if (isPromise(result)) {
			result.then(resolve);
		}
	});
}
