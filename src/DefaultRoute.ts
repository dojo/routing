import Promise from 'dojo-core/Promise';
import PathRule from './PathRule';
import RouteManager from './RouteManager';
import { CancelableNavigationArgs, DefaultRouteArgs, MatchableRoute, NavigationArgs } from './routing';

export default class DefaultRoute implements MatchableRoute {
	protected _rule: PathRule;

	beforeEnter: (kwArgs: CancelableNavigationArgs) => (Promise<void> | void);
	beforeExit: (kwArgs: CancelableNavigationArgs) => (Promise<void> | void);
	enter: (path: string) => (Promise<void> | void);
	exit: () => (Promise<void> | void);
	parent: RouteManager;

	constructor(kwArgs: DefaultRouteArgs) {
		this._rule = new PathRule('/');
		this.beforeEnter = kwArgs.beforeEnter;
		this.beforeExit = kwArgs.beforeExit;
		this.enter = kwArgs.enter;
		this.exit = kwArgs.exit;
	}

	destroy(): void {
		this._rule = null;
		this.enter = function (path: string): void {};
		this.beforeEnter = this.beforeExit = this.exit = null;
	}

	match(path: string): NavigationArgs {
		const args = this._rule.parsePath(path);

		if (args) {
			args.route = this;
		}

		return args || null;
	}
}
