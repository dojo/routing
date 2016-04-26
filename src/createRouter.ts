import compose, { ComposeFactory } from 'dojo-compose/compose';

import { Route, ExecutionMethod } from './createRoute';
import { Context, Parameters, Request } from './interfaces';
import { getSegments } from './util/path';

export interface Router {
	routes?: Route<Parameters>[];
	append(routes: Route<Parameters> | Route<Parameters>[]): void;
	dispatch(context: Context, path: string): void;
	fallback?(request: Request<any>): void;
}

export interface RouterOptions {
	fallback?(request: Request<any>): void;
}

export interface RouterFactory extends ComposeFactory<Router, RouterOptions> {}

const createRouter: RouterFactory = compose({
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

	dispatch (context: Context, path: string): boolean {
		const { searchParams, segments } = getSegments(path);
		const dispatched = (<Router> this).routes.some(route => {
			const hierarchy = route.select(context, segments, searchParams);
			if (hierarchy.length === 0) {
				return false;
			}

			for (const { method, route, params } of hierarchy) {
				switch (method) {
					case ExecutionMethod.Exec:
						route.exec({ context, params });
						break;
					case ExecutionMethod.Fallback:
						route.fallback({ context, params });
						break;
					case ExecutionMethod.Index:
						route.index({ context, params });
						break;
				}
			}

			return true;
		});

		if (!dispatched && this.fallback) {
			this.fallback({ context, params: {} });
			return true;
		}

		return dispatched;
	}
}, (instance: Router, { fallback }: RouterOptions = {}) => {
	instance.routes = [];

	if (fallback) {
		instance.fallback = fallback;
	}
});

export default createRouter;
