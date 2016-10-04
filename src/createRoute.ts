import compose, { ComposeFactory } from 'dojo-compose/compose';
import UrlSearchParams from 'dojo-core/UrlSearchParams';
import { Hash } from 'dojo-core/interfaces';
import WeakMap from 'dojo-shim/WeakMap';

import { DefaultParameters, Context, Parameters, Request } from './interfaces';
import {
	deconstruct as deconstructPath,
	match as matchPath,
	DeconstructedPath
} from './lib/path';

/**
 * Describes whether a route matched.
 */
export interface MatchResult<P> {
	/**
	 * Whether there are path segments that weren't matched by this route.
	 */
	hasRemaining: boolean;

	/**
	 * Position in the segments array that the remaining unmatched segments start.
	 */
	offset: number;

	/**
	 * Any extracted parameters. Only available if the route matched.
	 */
	params: P;
}

/**
 * Describes the selection of a particular route.
 */
export interface Selection {
	/**
	 * Which handler should be called when the route is executed.
	 */
	handler: (request: Request<Parameters>) => void;

	/**
	 * The extracted parameters.
	 */
	params: Parameters;

	/**
	 * The selected route.
	 */
	route: Route<Parameters>;
}

/**
 * A route.
 * The generic should be specified if parameter access is required.
 */
export interface Route<P extends Parameters> {
	/**
	 * Append one or more routes.
	 * @param routes A single route or an array containing 0 or more routes.
	 */
	append(add: Route<Parameters> | Route<Parameters>[]): void;

	/**
	 * Determine whether the route matches.
	 * @param segments Segments of the pathname (excluding slashes).
	 * @param hasTrailingSlash Whether the pathname that's being matched ended with a slashes.
	 * @param searchParams Parameters extracted from the search component.
	 * @return Whether and how the route matched.
	 */
	match(segments: string[], hasTrailingSlash: boolean, searchParams: UrlSearchParams): null | MatchResult<P>;

	/**
	 * Attempt to select this and any nested routes.
	 * @param context The dispatch context.
	 * @param segments Segments of the pathname (excluding slashes).
	 * @param hasTrailingSlash Whether the pathname that's being matched ended with a slashes.
	 * @param searchParams Parameters extracted from the search component.
	 * @return An empty array if this (and any nested routes) could not be selected, else the selected routes and
	 *   accompanying `params` objects.
	 */
	select(context: Context, segments: string[], hasTrailingSlash: boolean, searchParams: UrlSearchParams): Selection[];
}

/**
 * The options for the route.
 */
export interface RouteOptions<P> {
	/**
	 * Path the route matches against. Pathname segments may be named, same for query parameters. Leading slashes are
	 * ignored. Defaults to `/`.
	 */
	path?: string;

	/**
	 * If the `path` option contains a trailing slash (in the pathname component), the route will only match against
	 * another pathname that contains a trailing slash, and vice-versa if the path does not contain a trailing slash.
	 * Defaults to `true`, change to `false` to allow routes to match regardless of trailing slashes.
	 */
	trailingSlashMustMatch?: boolean;

	/**
	 * A handler called when the route is executed.
	 * @param request An object whose `context` property contains the dispatch context. Extracted parameters are
	 *   available under `params`.
	 */
	exec?(request: Request<P>): void;

	/**
	 * If specified, causes the route to be selected if there are no nested routes that match the remainder of
	 * the dispatched path. When the route is executed, this handler is called rather than `exec()`.
	 * @param request An object whose `context` property contains the dispatch context. Extracted parameters are
	 *   available under `params`.
	 */
	fallback?(request: Request<P>): void;

	/**
	 * Callback used to determine whether the route should be selected after it's been matched.
	 * @param request An object whose `context` property contains the dispatch context. Extracted parameters are
	 *   available under `params`.
	 * @return Returning `true` causes the route to be selected.
	 */
	guard?(request: Request<P>): boolean;

	/**
	 * If specified, and the route is the final route in the hierarchy, when the route is executed, this handler is
	 * called rather than `exec()`.
	 * @param request An object whose `context` property contains the dispatch context. Extracted parameters are
	 *   available under `params`.
	 */
	index?(request: Request<P>): void;

	/**
	 * Callback used for constructing the `params` object from extracted parameters, and validating the parameters.
	 * @param fromPathname Array of parameter values extracted from the pathname.
	 * @param searchParams Parameters extracted from the search component.
	 * @return If `null` prevents the route from being selected, else the value for the `params` object.
	 */
	params?(fromPathname: string[], searchParams: UrlSearchParams): null | P;
}

export interface RouteFactory<P extends Parameters> extends ComposeFactory<Route<P>, RouteOptions<P>> {
	/**
	 * Create a new instance of a route.
	 * @param options Options to use during creation.
	 */
	<P>(options?: RouteOptions<P>): Route<P>;
}

interface PrivateState {
	path: DeconstructedPath;
	routes: Route<Parameters>[];
	trailingSlashMustMatch: boolean;

	computeParams<P extends Parameters>(fromPathname: string[], searchParams: UrlSearchParams): null | P;
	exec?(request: Request<Parameters>): void;
	fallback?(request: Request<Parameters>): void;
	guard?(request: Request<Parameters>): boolean;
	index?(request: Request<Parameters>): void;
}

const privateStateMap = new WeakMap<Route<Parameters>, PrivateState>();

const noop = () => {};

function computeDefaultParams(
	parameters: string[],
	searchParameters: string[],
	fromPathname: string[],
	searchParams: UrlSearchParams
): null | DefaultParameters {
	const params: DefaultParameters = {};
	parameters.forEach((name, index) => {
		params[name] = fromPathname[index];
	});
	searchParameters.forEach(name => {
		const value = searchParams.get(name);
		if (value !== undefined) {
			params[name] = value;
		}
	});

	return params;
}

const createRoute: RouteFactory<Parameters> =
	compose({
		append(this: Route<Parameters>, add: Route<Parameters> | Route<Parameters>[]) {
			const { routes } = privateStateMap.get(this);
			if (Array.isArray(add)) {
				for (const route of add) {
					routes.push(route);
				}
			}
			else {
				routes.push(add);
			}
		},

		match(
			this: Route<Parameters>,
			segments: string[],
			hasTrailingSlash: boolean,
			searchParams: UrlSearchParams
		): null | MatchResult<Parameters> {
			const { computeParams, path, trailingSlashMustMatch } = privateStateMap.get(this);
			const result = matchPath(path, segments);
			if (result === null) {
				return null;
			}

			if (!result.hasRemaining && trailingSlashMustMatch && path.trailingSlash !== hasTrailingSlash) {
				return null;
			}

			// Only extract the search params defined in the route's path.
			const knownSearchParams = path.searchParameters.reduce((list, name) => {
				const value = searchParams.getAll(name);
				if (value !== undefined) {
					list[name] = value;
				}
				return list;
			}, {} as Hash<string[]>);

			const params = computeParams(result.values, new UrlSearchParams(knownSearchParams));
			if (params === null) {
				return null;
			}

			const { hasRemaining, offset } = result;
			return { hasRemaining, offset, params };
		},

		select(
			this: Route<Parameters>,
			context: Context,
			segments: string[],
			hasTrailingSlash: boolean,
			searchParams: UrlSearchParams
		): Selection[] {
			const { exec, index, fallback, guard, routes } = privateStateMap.get(this);

			const result = this.match(segments, hasTrailingSlash, searchParams);

			// Return early if possible.
			if (!result || result.hasRemaining && routes.length === 0 && !fallback) {
				return [];
			}

			const { hasRemaining, offset, params } = result;
			// Always guard.
			if (guard && !guard({ context, params })) {
				return [];
			}

			// Use a noop handler if exec was not provided. Something needs to be
			// returned otherwise the router may think no routes were selected.
			const handler = exec || noop;

			// Select this route, configure the index handler if specified.
			if (!hasRemaining) {
				return [{ handler: index || handler, params, route: this }];
			}

			// Match the remaining segments. Return a hierarchy if nested routes were selected.
			const remainingSegments = segments.slice(offset);
			for (const nested of routes) {
				const hierarchy = nested.select(context, remainingSegments, hasTrailingSlash, searchParams);
				if (hierarchy.length > 0) {
					return [{ handler, params, route: this }, ...hierarchy];
				}
			}

			// No remaining segments matched, only select this route if a fallback handler was specified.
			if (fallback) {
				return [{ handler: fallback, params, route: this }];
			}

			return [];
		}
	},
	(
		instance: Route<Parameters>,
		{
			exec,
			fallback,
			guard,
			index,
			params: computeParams,
			path,
			trailingSlashMustMatch = true
		}: RouteOptions<Parameters> = {}
	) => {
		if (path && /#/.test(path)) {
			throw new TypeError('Path must not contain \'#\'');
		}

		const deconstructedPath = deconstructPath(path || '/');
		const { parameters, searchParameters } = deconstructedPath;

		if (computeParams) {
			if (parameters.length === 0 && searchParameters.length === 0) {
				throw new TypeError('Can\'t specify params() if path doesn\'t contain any');
			}
		}
		else {
			computeParams = (fromPathname: string[], searchParams: UrlSearchParams) => {
				return computeDefaultParams(parameters, searchParameters, fromPathname, searchParams);
			};
		}

		privateStateMap.set(instance, {
			computeParams,
			exec,
			fallback,
			guard,
			index,
			path: deconstructedPath,
			routes: [],
			trailingSlashMustMatch
		});
	});

export default createRoute;
