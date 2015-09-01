import { CancelableNavigationEvent, DefaultRouteArgs, MatchableRoute, NavigationEvent } from './interfaces';
import PathRule from './PathRule';

/**
 * A catch-all route that matches any path.
 */
export default class DefaultRoute implements MatchableRoute {
	protected _rule: PathRule;

	/**
	 * An optional lifecycle method that is called before `this` route is entered.
	 *
	 * This method is intended to be used to determine whether `this` route can be entered. If it is determined that
	 * for some reason the user should not be taken to `this` route's path, then the `preventDefault` method can be
	 * called on the provided `event` object, which will prevent the current URL from transitioning.
	 *
	 * @param event An object containing route data, as well as a `preventDefault` method for canceling the route change.
	 */
	beforeEnter: (event: CancelableNavigationEvent) => void;

	/**
	 * An optional lifecycle method that is called before `this` route exits.
	 *
	 * This method is intended to be used to determine whether the user can navigate away from `this` route. If it is
	 * determined that for some reason the user cannot leave `this` route, then the `preventDefault` method can be
	 * called on the provided `event` object, which will prevent the current URL from transitioning.
	 *
	 * @param event An object containing route data, as well as a `preventDefault` method for canceling the route change.
	 */
	beforeExit: (event: CancelableNavigationEvent) => void;

	/**
	 * A required lifecycle method that is called when `this` route is entered.
	 *
	 * @param path The full, normalized path matched by the router.
	 */
	enter: (event: NavigationEvent) => void;

	/**
	 * An optional lifecycle method that is called when `this` route is exited.
	 *
	 * This method is inteded for any cleanup required as users navigate away from the route.
	 */
	exit: () => void;

	/**
	 * TODO: Perhaps PathRule would be better incorporated here as a decorator/mixin?
	 * The PathRule instance associated with the route's path. This can be used to determine
	 * whether a particular path can be handled by the route.
	 */
	get rule(): PathRule {
		return this._rule;
	}

	constructor(kwArgs: DefaultRouteArgs) {
		this.beforeEnter = kwArgs.beforeEnter;
		this.beforeExit = kwArgs.beforeExit;
		this.enter = kwArgs.enter;
		this.exit = kwArgs.exit;

		this._rule = new PathRule('/');
	}

	/**
	 * Disables the route, so that it's lifecycle methods no longer have an effect.
	 *
	 * Note that this DOES NOT remove the route from whatever RouteGroup/Router it has been added to, as it
	 * is possible to add a route to many groups. RouteGroup objects provide an API for removing routes.
	 */
	destroy(): void {
		this.enter = function (event: NavigationEvent): void {};
		this.beforeEnter = this.beforeExit = this.exit = null;
	}
}
