import DefaultRoute from './DefaultRoute';
import Promise from 'dojo-core/Promise';
import PathRule from './PathRule';
import { NavigationArgs, RouteArgs } from './routing';

export default class Route extends DefaultRoute {
	protected _path: string;

	change: (kwArgs: NavigationArgs) => (Promise<void> | void);

	get path(): string {
		return this._path;
	}
	set path(path: string) {
		this._path = PathRule.normalizePath(path);
		this._rule = new PathRule(path);
	}

	constructor(kwArgs: RouteArgs) {
		super(kwArgs);

		this.change = kwArgs.change;
		this.path = kwArgs.path;
	}

	destroy(): void {
		super.destroy();
		this.change = null;
	}
}
