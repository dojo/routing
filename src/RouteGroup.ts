import RouteManager from './RouteManager';
import { MatchableRoute, NavigationArgs } from './routing';

export default class RouteGroup extends RouteManager implements MatchableRoute {
	parent: RouteManager;

	match(path: string): NavigationArgs {
		if (!this._rule.test(path)) {
			return null;
		}

		const childPath = this._rule.getChildPath(path);
		let args: NavigationArgs = null;

		for (let route of this.routes) {
			args = route.match(childPath);

			if (args) {
				args.route = route;
				break;
			}
		}

		if (!args && this.defaultRoute) {
			args = this.defaultRoute.match(childPath);
		}

		return args;
	}
}
