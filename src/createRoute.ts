import compose, { ComposeFactory } from 'dojo-compose/compose';
import UrlSearchParams from 'dojo-core/UrlSearchParams';
import { Hash } from 'dojo-core/interfaces';

import { Context, Parameters, Request } from './interfaces';
import {
	deconstruct as deconstructPath,
	match as matchPath,
	DeconstructedPath
} from './util/path';

export interface DefaultParameters extends Parameters {
	[param: string]: string;
}

export interface MatchResult<PP> {
	hasRemaining: boolean;
	isMatch: boolean;
	offset: number;
	params?: PP;
}

export interface Route<PP extends Parameters> {
	path: DeconstructedPath;
	routes: Route<Parameters>[];
	append: (routes: Route<Parameters> | Route<Parameters>[]) => void;
	exec: (request: Request<PP>) => void;
	fallback?: (request: Request<PP>) => void;
	guard: (request: Request<PP>) => boolean;
	index?: (request: Request<PP>) => void;
	match: (segments: string[], searchParams: UrlSearchParams) => MatchResult<PP>;
	params: (fromPath: string[], searchParams: UrlSearchParams) => void | PP;
	select: (context: Context, segments: string[], searchParams: UrlSearchParams) => Selection[];
}

export interface RouteOptions<PP> {
	exec?: (request: Request<PP>) => void;
	fallback?: (request: Request<PP>) => void;
	guard?: (request: Request<PP>) => boolean;
	index?: (request: Request<PP>) => void;
	params?: (fromPath: string[], searchParams: UrlSearchParams) => void | PP;
	path?: string;
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
	path: {} as DeconstructedPath,
	routes: [] as Route<Parameters>[],

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

	match (segments: string[], searchParams: UrlSearchParams): MatchResult<Parameters> {
		const { hasRemaining, isMatch, offset, values } = matchPath(this.path, segments);
		if (!isMatch) {
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

	params (fromPath: string[], searchParams: UrlSearchParams): DefaultParameters {
		const params: DefaultParameters = {};

		const { parameters, searchParameters } = <DeconstructedPath> this.path;
		parameters.forEach((name, index) => {
			params[name] = fromPath[index];
		});
		searchParameters.forEach(name => {
			if (searchParams.has(name)) {
				params[name] = searchParams.getAll(name)[0];
			}
		});

		return params;
	},

	select (context: Context, segments: string[], searchParams: UrlSearchParams): Selection[] {
		const { isMatch, hasRemaining, offset, params } = this.match(segments, searchParams);
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
			const hierarchy = nested.select(context, remainingSegments, searchParams);
			if (hierarchy.length > 0) {
				return [{ method: ExecutionMethod.Exec, params, route: this }, ...hierarchy];
			}
		}

		if ((<Route<Parameters>> this).fallback) {
			return [{ method: ExecutionMethod.Fallback, params, route: this }];
		}

		return [];
	}
}, (instance: Route<Parameters>, { exec, fallback, guard, index, params, path }: RouteOptions<Parameters> = {}) => {
	if (path && /#/.test(path)) {
		throw new TypeError('Path must not contain \'#\'');
	}

	instance.path = deconstructPath(path || '/');
	instance.routes = [];

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
