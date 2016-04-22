import compose, { ComposeFactory } from 'dojo-compose/compose';

import { Parameters, Request } from './interfaces';
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
	exec?: (request: Request<PP>) => void;
	guard?: (request: Request<PP>) => boolean;
	match: (segments: string[]) => MatchResult<PP>;
	params: (...rawParams: string[]) => void | PP;
}

export interface RouteOptions<PP> {
	exec?: (request: Request<PP>) => void;
	guard?: (request: Request<PP>) => boolean;
	params?: (...rawParams: string[]) => void | PP;
	pathname?: string;
}

export interface RouteFactory extends ComposeFactory<Route<Parameters>, RouteOptions<Parameters>> {
	<PP extends Parameters>(options?: RouteOptions<PP>): Route<PP>;
}

const createRoute: RouteFactory = compose({
	path: {} as DeconstructedPath,

	match (segments: string[]): MatchResult<Parameters> {
		const { hasRemaining, isMatch, offset, values } = matchPath(this.path, segments);
		if (!isMatch) {
			return { hasRemaining: false, isMatch: false, offset: 0 };
		}

		const params = this.params(...values);
		if (params === null) {
			return { hasRemaining: false, isMatch: false, offset: 0 };
		}
		return { hasRemaining, isMatch: true, offset, params };
	},

	params (...rawParams: string[]): DefaultParameters {
		const params: DefaultParameters = {};

		(<DeconstructedPath> this.path).parameters.forEach((name, index) => {
			params[name] = rawParams[index];
		});

		return params;
	}
}, (instance: Route<Parameters>, { exec, guard, params, pathname }: RouteOptions<Parameters> = {}) => {
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
