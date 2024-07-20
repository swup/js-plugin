import { matchPath } from 'swup';
import type { Path, Visit } from 'swup';

import { MatchFunction, MatchOptions } from './index.js';

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

export type CompiledAnimation = Animation & {
	/** Match function to check if the `from` pattern matches a given URL */
	matchesFrom: MatchFunction;
	/** Match function to check if the `to` pattern matches a given URL */
	matchesTo: MatchFunction;
};

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

/**
 * Find best animation by ranking animations against each other
 */
export function matchAnimation(animations: CompiledAnimation[], from: string, to: string, name: string | undefined): CompiledAnimation | null {
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
