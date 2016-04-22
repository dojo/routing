import compose, { ComposeFactory } from 'dojo-compose/compose';

import { match as matchPath, deconstruct as deconstructPath, DeconstructedPath } from './util/path';
import { Request, Parameters } from './interfaces';

export interface DefaultParameters extends Parameters {
	[param: string]: string;
}

export interface MatchResult<PP> {
	isMatch: boolean;
	hasRemaining: boolean;
	offset: number;
	params?: PP;
}

export interface Route<PP extends Parameters> {
	path: DeconstructedPath;
	exec?: (request: Request<PP>) => void;
	guard?: (request: Request<PP>) => boolean;
	match: (segments: string[]) => MatchResult<PP>;
	params: (...rawParams: string[]) => void | PP;
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

	match (segments: string[]): MatchResult<Parameters> {
		const { isMatch, hasRemaining, offset, values } = matchPath(this.path, segments);
		if (!isMatch) {
			return { isMatch: false, hasRemaining: false, offset: 0 };
		}

		const params = this.params(...values);
		if (params === null) {
			return { isMatch: false, hasRemaining: false, offset: 0 };
		}
		return { isMatch: true, hasRemaining, offset, params };
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
