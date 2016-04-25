import compose, { ComposeFactory } from 'dojo-compose/compose';

import { Route, ExecutionMethod } from './createRoute';
import { Context, Parameters } from './interfaces';
import { getSegments } from './util/path';

export interface Router {
	routes: Route<Parameters>[];
	append: (routes: Route<Parameters> | Route<Parameters>[]) => void;
	dispatch: (context: Context, path: string) => void;
}

export interface RouterFactory extends ComposeFactory<Router, any> {}

const createRouter: RouterFactory = compose({
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

	dispatch (context: Context, path: string): boolean {
		const segments = getSegments(path);
		return (<Router> this).routes.some(route => {
			const hierarchy = route.select(context, segments);
			if (hierarchy.length === 0) {
				return false;
			}

			for (const { method, route, params } of hierarchy) {
				if (method === ExecutionMethod.Exec) {
					route.exec({ context, params });
				}
				else if (method === ExecutionMethod.Fallback) {
					route.fallback({ context, params });
				}
				else if (method === ExecutionMethod.Index) {
					route.index({ context, params });
				}
			}

			return true;
		});
	}
}, (instance: Router) => {
	instance.routes = [];
});

export default createRouter;
