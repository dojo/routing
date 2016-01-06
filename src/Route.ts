import DefaultRoute from './DefaultRoute';
import { NavigationEvent, RouteArgs } from './interfaces';
import PathRule, { normalizePath } from './PathRule';

/**
 * An object that matches and handles a specific path.
 */
export default class Route extends DefaultRoute {
	protected _path: string;

	/**
	 * An optional lifecycle method that is called when a token value on the route
	 * changes.
	 *
	 * For example, if a Route has the path "articles/{id}/", and user navigates from
	 * "articles/12345" to "articles/67890", the `change` lifecycle method is called
	 * instead of `enter`.
	 */
	change: (event: NavigationEvent) => void;

	/**
	 * The route's path (read-only).
	 */
	get path(): string {
		return this._path;
	}

	constructor(kwArgs: RouteArgs) {
		super(kwArgs);

		this.change = kwArgs.change;
		this._path = normalizePath(kwArgs.path);
		this._rule = new PathRule(this._path, true);
	}

	/**
	 * Disables the route, so that it's lifecycle methods no longer have an effect.
	 *
	 * Note that this DOES NOT remove the route from whatever RouteGroup/Router it has been added to, as it
	 * is possible to add a route to many groups. RouteGroup objects provide an API for removing routes.
	 */
	destroy(): void {
		super.destroy();
		this.change = null;
	}
}
