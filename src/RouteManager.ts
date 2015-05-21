import DefaultRoute from './DefaultRoute';
import PathRule from './PathRule';
import { MatchableRoute, RouteManagerArgs } from './routing';

function comparePaths(candidate: MatchableRoute, path: string): boolean {
	return candidate.path === path;
}

function compareRoutes(candidate: MatchableRoute, route: MatchableRoute): boolean {
	return candidate === route;
}

export default class RouteManager {
	protected _defaultRoute: DefaultRoute;
	protected _path: string;
	protected _routes: MatchableRoute[];
	protected _rule: PathRule;

	get defaultRoute(): DefaultRoute {
		return this._defaultRoute;
	}
	set defaultRoute(defaultRoute: DefaultRoute) {
		this._defaultRoute = defaultRoute;

		if (defaultRoute) {
			this._defaultRoute.parent = this;
		}
	}

	get path(): string {
		return this._path;
	}
	set path(path: string) {
		this._path = path;
		this._rule = new PathRule(path);
	}

	get routes(): MatchableRoute[] {
		return this._routes.slice(0);
	}
	set routes(routes: MatchableRoute[]) {
		this._routes = routes || [];

		for (let route of this._routes) {
			route.parent = this;
		}
	}

	constructor(kwArgs: RouteManagerArgs) {
		if (!kwArgs.defaultRoute && (!kwArgs.routes || !kwArgs.routes.length)) {
			throw new Error('RouteManager objects requires at least one route');
		}

		this.path = kwArgs.path;
		this.routes = kwArgs.routes;
		this.defaultRoute = kwArgs.defaultRoute;
	}

	addRoute(route: MatchableRoute): MatchableRoute {
		const oldRoute = this.removeRoute(route.path);
		this._routes.push(route);
		return oldRoute;
	}

	removeRoute(route: MatchableRoute | string): MatchableRoute {
		const compare: any = (typeof route === 'string') ? comparePaths : compareRoutes;
		const test = (typeof route === 'string' && this._rule.test(route)) ?
			this._rule.getChildPath(route) :
			route;
		let removed: MatchableRoute = null;

		for (let i = this._routes.length; i--;) {
			const candidate = this._routes[i];

			if (compare(candidate, test)) {
				removed = this._routes.splice(i, 1)[0];
				break;
			}
			else if (typeof (<any> candidate).removeRoute === 'function') {
				removed = (<any> candidate).removeRoute(test);
				break;
			}
		}

		return removed;
	}
}
