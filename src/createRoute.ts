import compose, { ComposeFactory } from 'dojo-compose/compose';

import { match as matchPath, parse as parsePath, PathSegments } from './util/path';

export interface Parameters {}

export interface DefaultParameters extends Parameters {
	[param: string]: string;
}

export interface MatchResult<PP> {
	matched: boolean;
	params?: PP;
}

export interface Route<PP extends Parameters> {
	pathSegments: PathSegments;
	exec?: (request: Request<PP>) => void;
	guard?: (request: Request<PP>) => boolean;
	match: (path: string) => MatchResult<PP>;
	params: (...rawParams: string[]) => void | PP;
}

export interface Request<PP extends Parameters> {
	params: PP;
}

export interface RouteOptions<PP> {
	pathname: string;
	exec?: (request: Request<PP>) => void;
	guard?: (request: Request<PP>) => boolean;
	params?: (...rawParams: string[]) => void | PP;
}

export interface RouteFactory extends ComposeFactory<Route<Parameters>, RouteOptions<Parameters>> {
	<PP extends Parameters>(options: RouteOptions<PP>): Route<PP>;
}

const createRoute: RouteFactory = compose({
	pathSegments: <PathSegments> {},

	match (path: string): MatchResult<Parameters> {
		const { matched, values } = matchPath(this.pathSegments, path);
		if (!matched) {
			return { matched: false };
		}

		const params = this.params(...values);
		if (params === null) {
			return { matched: false };
		}
		return { matched: true, params };
	},

	params (...rawParams: string[]): DefaultParameters {
		const params: DefaultParameters = {};

		this.pathSegments.names.forEach((name, index) => {
			params[name] = rawParams[index];
		});

		return params;
	}
}, (instance: Route<Parameters>, { pathname, exec, guard, params }: RouteOptions<Parameters>) => {
	instance.pathSegments = parsePath(pathname);

	if (exec) {
		instance.exec = exec;
	}
	if (guard) {
		instance.guard = guard;
	}
	if (params) {
		instance.params = params;
	}
});

export default createRoute;
