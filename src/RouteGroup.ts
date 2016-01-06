import DefaultRoute from './DefaultRoute';
import { MatchableRoute, NavigationEvent, RouteGroupArgs } from './interfaces';
import PathRegistry, { PathRegistryHandle } from './PathRegistry';
import PathRule, { normalizePath } from './PathRule';

/**
 * Provides an interface for managing routes under a single base path.
 */
export default class RouteGroup implements MatchableRoute {
	protected _handles: { [key: string]: PathRegistryHandle };
	protected _path: string;
	protected _registry: PathRegistry;
	protected _rule: PathRule;

	/**
	 * The optional default route that will be used if a path matches no other route in the group.
	 * Defaults to `null`.
	 */
	get defaultRoute(): DefaultRoute {
		return this._registry.defaultValue;
	}
	set defaultRoute(defaultRoute: DefaultRoute) {
		this._registry.defaultValue = defaultRoute;
	}

	/**
	 * The group's path (read-only).
	 */
	get path(): string {
		return this._path;
	}

	/**
	 * TODO: Perhaps PathRule would be better incorporated here as a decorator/mixin?
	 * The PathRule instance associated with the groups's path. This can be used to determine
	 * whether a particular path can be handled by the group's routes.
	 */
	get rule(): PathRule {
		return this._rule;
	}

	constructor(kwArgs: RouteGroupArgs) {
		this._handles = Object.create(null);
		this._path = normalizePath(kwArgs.path);
		this._registry = new PathRegistry(null);
		this._rule = new PathRule(this._path);

		this.defaultRoute = kwArgs.defaultRoute;

		if ('routes' in kwArgs) {
			kwArgs.routes.forEach(function (route: MatchableRoute): void {
				this.addRoute(route);
			}, this);
		}
	}

	/**
	 * Adds a new route to the group.
	 *
	 * @param route The route/group to add.
	 * @return The old route/group with the same path as the newly-added route/group.
	 */
	addRoute(route: MatchableRoute): MatchableRoute {
		const path = route.path;
		const oldRoute = this.removeRoute(path);
		const handle = this._registry.register(route.rule, route);

		this._handles[path] = handle;

		return oldRoute;
	}

	/**
	 * Disables the groups, so that it no longer matches any path.
	 *
	 * Note that this DOES NOT remove the group from its parent group/router, as it is possible to
	 * nest groups. The parent group/router objects provide an API for removing routes.
	 */
	destroy(): void {
		const handles = this._handles;

		Object.keys(handles).forEach(function (path: string): void {
			handles[path].destroy();
		});

		this._handles = this._registry = null;
		this.match = this.addRoute = this.removeRoute = function (): NavigationEvent {
			return null;
		};
	}

	/**
	 * Determines whether the specified path can be handled by any of the group's routes, returning
	 * the route data if it can, or `null` if it cannot.
	 *
	 * @param path The path to test.
	 * @returns An object containing the matched route, the matched portion of the path, and any token
	 * 		values parsed from the route's path template.
	 */
	match(path: string): NavigationEvent {
		const childPath = this._rule.getChildPath(path);

		return this._registry.match(childPath);
	}

	/**
	 * Removes the specified route from the group, returning the route object if it was found, or `null` otherwise.
	 *
	 * @param route Either the route object to move or the route's path.
	 * @return The removed route, or `null` if no such route was found.
	 */
	removeRoute(route: MatchableRoute | string): MatchableRoute {
		const path = (typeof route === 'string') ? normalizePath(route) : route.path;
		const handles = this._handles;
		let oldRoute: MatchableRoute = null;

		for (let key in handles) {
			const handle = handles[key];
			const candidate = handle.route;

			if (path === key) {
				oldRoute = candidate;
				handle.destroy();
				break;
			}
			else if (path.indexOf(key) === 0 && typeof candidate.removeRoute === 'function') {
				oldRoute = candidate.removeRoute(path.slice(key.length));
				break;
			}
		}

		return oldRoute;
	}
}
