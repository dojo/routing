import compose, { ComposeFactory } from 'dojo-compose/compose';
import UrlSearchParams from 'dojo-core/UrlSearchParams';
import { Hash } from 'dojo-core/interfaces';

import { Context, Parameters, Request } from './interfaces';
import {
	deconstruct as deconstructPath,
	match as matchPath,
	DeconstructedPath
} from './util/path';

/**
 * Routes created without a `params()` function will receive a `params` object of this type.
 */
export interface DefaultParameters extends Parameters {
	[param: string]: string;
}

/**
 * Describes whether a route matched.
 */
export interface MatchResult<PP> {
	/**
	 * Whether there are path segments that weren't matched by this route.
	 */
	hasRemaining: boolean;

	/**
	 * Whether the route matched.
	 */
	isMatch: boolean;

	/**
	 * Position in the segments array that the remaining unmatched segments start.
	 */
	offset: number;

	/**
	 * Any extracted parameters. Only available if the route matched.
	 */
	params?: PP;
}

/**
 * A route.
 * The generic should be specified if parameter access is required.
 */
export interface Route<PP extends Parameters> {
	/**
	 * A deconstructed form of the path the route was created for. Used for matching.
	 * @private
	 */
	path?: DeconstructedPath;

	/**
	 * Holds the next level of the route hierarchy.
	 * @private
	 */
	routes?: Route<Parameters>[];

	/**
	 * Whether trailing slashes in the matching path must match trailing slashes in this route's path.
	 * @private
	 */
	trailingSlashMustMatch?: boolean;

	/**
	 * Append one or more routes.
	 * @param routes A single route or an array containing 0 or more routes
	 */
	append(routes: Route<Parameters> | Route<Parameters>[]): void;

	/**
	 * Callback used to execute the route if it's been selected.
	 * @param request An object whose `context` property contains the dispatch context. Extracted parameters are
	 *   available under `params`.
	 * @protected
	 */
	exec(request: Request<PP>): void;

	/**
	 * Optional fallback handler used when no nested routes matched.
	 * @param request An object whose `context` property contains the dispatch context. No extracted parameters
	 *   are available.
	 * @protected
	 */
	fallback?(request: Request<PP>): void;

	/**
	 * Callback used to determine whether the route should be selected after it's been matched.
	 * @param request An object whose `context` property contains the dispatch context. Extracted parameters are
	 *   available under `params`.
	 * @private
	 */
	guard(request: Request<PP>): boolean;

	/**
	 * Optional callback used to execute the route if it's been selected as the final route in the hierarchy.
	 * Takes precedence over exec() in this scenario.
	 * @param request An object whose `context` property contains the dispatch context. Extracted parameters are
	 *   available under `params`.
	 * @protected
	 */
	index?(request: Request<PP>): void;

	/**
	 * Determine whether the route matches.
	 * @param segments Segments of the pathname (excluding slashes)
	 * @param hasTrailingSlash Whether the pathname that's being matched ended with a slashes
	 * @param searchParams Parameters extracted from the search component
	 * @return Whether and how the route matched
	 * @private
	 */
	match(segments: string[], hasTrailingSlash: boolean, searchParams: UrlSearchParams): MatchResult<PP>;

	/**
	 * Callback used for constructing the `params` object from extracted parameters, and validating the parameters.
	 * @param fromPathname Array of parameter values extracted from the pathname
	 * @param searchParams Parameters extracted from the search component
	 * @return If `null` prevents the route from being selected, else the value for the `params` object
	 * @private
	 */
	params(fromPathname: string[], searchParams: UrlSearchParams): void | PP;

	/**
	 * Attempt to select this and any nested routes.
	 * @param context The dispatch context
	 * @param segments Segments of the pathname (excluding slashes)
	 * @param hasTrailingSlash Whether the pathname that's being matched ended with a slashes
	 * @param searchParams Parameters extracted from the search component
	 * @return An empty array if this (and any nested routes) could not be selected, else the selected routes and
	 *   accompanying `params` objects
	 */
	select(context: Context, segments: string[], hasTrailingSlash: boolean, searchParams: UrlSearchParams): Selection[];
}

/**
 * The options for the route.
 */
export interface RouteOptions<PP> {
	path?: string;
	trailingSlashMustMatch?: boolean;
	exec?(request: Request<PP>): void;
	fallback?(request: Request<PP>): void;
	guard?(request: Request<PP>): boolean;
	index?(request: Request<PP>): void;
	params?(fromPathname: string[], searchParams: UrlSearchParams): void | PP;
}

export const enum ExecutionMethod { Exec, Fallback, Index }

export interface Selection {
	method: ExecutionMethod;
	params: Parameters;
	route: Route<Parameters>;
}

export interface RouteFactory extends ComposeFactory<Route<Parameters>, RouteOptions<Parameters>> {
	<PP extends Parameters>(options?: RouteOptions<PP>): Route<PP>;
}

const createRoute: RouteFactory = compose({
	append (routes: Route<Parameters> | Route<Parameters>[]) {
		if (Array.isArray(routes)) {
			for (const route of routes) {
				this.routes.push(route);
			}
		}
		else {
			this.routes.push(routes);
		}
	},

	exec (request: Request<Parameters>) {},

	guard (request: Request<Parameters>) {
		return true;
	},

	match (segments: string[], hasTrailingSlash: boolean, searchParams: UrlSearchParams): MatchResult<Parameters> {
		const { hasRemaining, isMatch, offset, values } = matchPath(this.path, segments);
		if (!isMatch) {
			return { hasRemaining: false, isMatch: false, offset: 0 };
		}

		if (!hasRemaining && this.trailingSlashMustMatch && this.path.trailingSlash !== hasTrailingSlash) {
			return { hasRemaining: false, isMatch: false, offset: 0 };
		}

		const knownSearchParams = (<DeconstructedPath> this.path).searchParameters.reduce((list, name) => {
			if (searchParams.has(name)) {
				list[name] = searchParams.getAll(name);
			}
			return list;
		}, {} as Hash<string[]>);

		const params = this.params(values, new UrlSearchParams(knownSearchParams));
		if (params === null) {
			return { hasRemaining: false, isMatch: false, offset: 0 };
		}

		return { hasRemaining, isMatch: true, offset, params };
	},

	params (fromPathname: string[], searchParams: UrlSearchParams): DefaultParameters {
		const params: DefaultParameters = {};

		const { parameters, searchParameters } = <DeconstructedPath> this.path;
		parameters.forEach((name, index) => {
			params[name] = fromPathname[index];
		});
		searchParameters.forEach(name => {
			if (searchParams.has(name)) {
				params[name] = searchParams.getAll(name)[0];
			}
		});

		return params;
	},

	select (context: Context, segments: string[], hasTrailingSlash: boolean, searchParams: UrlSearchParams): Selection[] {
		const { isMatch, hasRemaining, offset, params } = this.match(segments, hasTrailingSlash, searchParams);
		if (!isMatch) {
			return [];
		}

		if ((!hasRemaining || this.routes.length > 0) && !this.guard({ context, params })) {
			return [];
		}

		if (!hasRemaining) {
			const method = (<Route<Parameters>> this).index ? ExecutionMethod.Index : ExecutionMethod.Exec;
			return [{ method, params, route: this }];
		}

		const remainingSegments = segments.slice(offset);
		for (const nested of this.routes) {
			const hierarchy = nested.select(context, remainingSegments, hasTrailingSlash, searchParams);
			if (hierarchy.length > 0) {
				return [{ method: ExecutionMethod.Exec, params, route: this }, ...hierarchy];
			}
		}

		if ((<Route<Parameters>> this).fallback) {
			return [{ method: ExecutionMethod.Fallback, params, route: this }];
		}

		return [];
	}
}, (instance: Route<Parameters>, { exec, fallback, guard, index, params, path, trailingSlashMustMatch = true }: RouteOptions<Parameters> = {}) => {
	if (path && /#/.test(path)) {
		throw new TypeError('Path must not contain \'#\'');
	}

	instance.path = deconstructPath(path || '/');
	instance.routes = [];
	instance.trailingSlashMustMatch = trailingSlashMustMatch;

	if (exec) {
		instance.exec = exec;
	}
	if (fallback) {
		instance.fallback = fallback;
	}
	if (guard) {
		instance.guard = guard;
	}
	if (index) {
		instance.index = index;
	}
	if (params) {
		const { parameters, searchParameters } = instance.path;
		if (parameters.length === 0 && searchParameters.length === 0) {
			throw new TypeError('Can\'t specify params() if path doesn\'t contain any');
		}

		instance.params = params;
	}
});

export default createRoute;
