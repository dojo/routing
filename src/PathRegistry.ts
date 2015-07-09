import { Handle } from 'dojo-core/interfaces';
import Registry, { Test } from 'dojo-core/Registry';
import DefaultRoute from './DefaultRoute';
import { MatchableRoute, NavigationArgs } from './interfaces';
import PathRule, { mergeRouteArgs, normalizePath } from './PathRule';

export interface PathRegistryHandle extends Handle {
	route: MatchableRoute;
}

/**
 * A custom registry of routes and route groups that are matched to a string path.
 */
export default class PathRegistry extends Registry<MatchableRoute> {
	protected _defaultValue: DefaultRoute;

	/**
	 * The (optional) default route returned when the registry contains no other matches for the provided
	 * path. Defaults to `null`.
	 */
	get defaultValue(): DefaultRoute {
		return this._defaultValue;
	}
	set defaultValue(defaultValue: DefaultRoute) {
		this._defaultValue = <DefaultRoute> defaultValue || null;
	}

	/**
	 * Recursively tests a path against nested registries and their routes, returning an object containing
	 * the parsed URL data, or null if no match was found.
	 *
	 * Note that, because path tokens can be broken up across different groups, any tokens generated during
	 * parsing will be merged into a single `state` object on the returned `NavigationArgs` object, with the
	 * most recently-matched group/route given priority. As a result, if a `RouteGroup`'s path is
	 * "articles/{id}/", and it contains a route downstream that matches the path "comments/{id}/", then
	 * `state.id` will be the comment ID, not the article ID. Ultimately it is up to developers to avoid
	 * token name collisions. This is unfortunately necessary in order to allow routes/groups to be reused across
	 * different groups.
	 *
	 * Also note that while `RouteGroup` objects can be registered with the registry, only route objects (i.e.,
	 * object with the routing lifecycle methods) can match a path. For example, if a `RouteGroup` with the path
	 * "articles/" is registered, but contains no route dedicated to handling the path "articles/12345/edit" and
	 * no default route, then the return value of the method will be `null`.
	 *
	 * @param path The path to test.
	 * @returns An object containing the matched route, the matched portion of the path, and any token
	 * 		values parsed from the route's path template.
	 */
	match(path: string): NavigationArgs {
		const normalized = normalizePath(path);
		let route = super.match(normalized);
		let args: NavigationArgs = route && route.rule.parsePath(normalized);

		if (args) {
			args.route = route;
		}

		if (route && typeof route.match === 'function') {
			const childPath = route.rule.getChildPath(normalized);
			let childArgs: NavigationArgs = route.match(childPath);

			if (!childArgs) {
				childArgs = this._defaultValue && this._defaultValue.rule.parsePath(childPath);

				if (childArgs) {
					childArgs.route = this._defaultValue;
				}
				else {
					return null;
				}
			}

			return mergeRouteArgs(args, childArgs);
		}

		return args;
	}

	/**
	 * Register a path rule + route/group pair with this registry.
	 *
	 * @param test The test that will be used to determine if the route/group matches a given path.
	 * @param value The route/group associated with the test.
	 * @param first If true, the newly registered test and value will be the first entry in the registry.
	 */
	register(test: PathRule | Test, value: MatchableRoute, first?: boolean): PathRegistryHandle {
		let entryTest: Test = <any> test;

		if (test instanceof PathRule) {
			entryTest = function (path): boolean {
				return test.rule.test(path);
			};
		}

		const handle = <PathRegistryHandle> super.register(entryTest, value, first);
		const destroy = handle.destroy;

		handle.route = value;
		handle.destroy = function () {
			handle.route = null;
			destroy.call(handle);
		};

		return handle;
	}
}
