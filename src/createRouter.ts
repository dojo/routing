import compose, { ComposeFactory } from 'dojo-compose/compose';

import { Route } from './createRoute';
import { getSegments } from './util/path';
import { Context, Parameters } from './interfaces';

export interface Router {
	routes: Route<Parameters>[];
	dispatch: (context: Context, path: string) => void;
	append: (routes: Route<Parameters> | Route<Parameters>[]) => void;
}

export interface RouterFactory extends ComposeFactory<Router, any> {}

const createRouter: RouterFactory = compose({
	routes: [] as Route<Parameters>[],

	dispatch (context: Context, path: string) {
		const segments = getSegments(path);
		(<Router> this).routes.some(route => {
			const { isMatch, hasRemaining, params } = route.match(segments);

			if (!isMatch || hasRemaining) {
				return false;
			}

			if (route.guard) {
				if (!route.guard({ context, params })) {
					return false;
				}
			}

			if (route.exec) {
				route.exec({ context, params });
			}

			return true;
		});
	},

	append (routes: Route<Parameters> | Route<Parameters>[]) {
		if (Array.isArray(routes)) {
			for (const route of routes) {
				this.routes.push(route);
			}
		}
		else {
			this.routes.push(routes);
		}
	}
}, (instance: Router) => {
	instance.routes = [];
});

export default createRouter;
