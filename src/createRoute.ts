import compose, { ComposeFactory } from 'dojo-compose/compose';

import { match as matchPath, deconstruct as deconstructPath, DeconstructedPath } from './util/path';

export interface Parameters {}

export interface DefaultParameters extends Parameters {
	[param: string]: string;
}

export interface MatchResult<PP> {
	isMatch: boolean;
	params?: PP;
}

export interface Route<PP extends Parameters> {
	path: DeconstructedPath;
	exec?: (request: Request<PP>) => void;
	guard?: (request: Request<PP>) => boolean;
	match: (path: string) => MatchResult<PP>;
	params: (...rawParams: string[]) => void | PP;
}

export interface Request<PP extends Parameters> {
	params: PP;
}

export interface RouteOptions<PP> {
	pathname?: string;
	exec?: (request: Request<PP>) => void;
	guard?: (request: Request<PP>) => boolean;
	params?: (...rawParams: string[]) => void | PP;
}

export interface RouteFactory extends ComposeFactory<Route<Parameters>, RouteOptions<Parameters>> {
	<PP extends Parameters>(options?: RouteOptions<PP>): Route<PP>;
}

const createRoute: RouteFactory = compose({
	path: {} as DeconstructedPath,

	match (path: string): MatchResult<Parameters> {
		const { isMatch, values } = matchPath(this.path, path);
		if (!isMatch) {
			return { isMatch: false };
		}

		const params = this.params(...values);
		if (params === null) {
			return { isMatch: false };
		}
		return { isMatch: true, params };
	},

	params (...rawParams: string[]): DefaultParameters {
		const params: DefaultParameters = {};

		this.path.parameters.forEach((name, index) => {
			params[name] = rawParams[index];
		});

		return params;
	}
}, (instance: Route<Parameters>, { pathname, exec, guard, params }: RouteOptions<Parameters> = {}) => {
	instance.path = deconstructPath(pathname || '/');
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
