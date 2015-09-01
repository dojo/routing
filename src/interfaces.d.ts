import { EventObject } from 'dojo-core/interfaces';
import Promise from 'dojo-core/Promise';
import DefaultRoute from './DefaultRoute';
import PathRule from './PathRule';

export interface CancelableNavigationArgs extends NavigationArgs {
	preventDefault(): void;
}

export interface DefaultRouteArgs extends RouteHandlers {
	enter(kwArgs: NavigationArgs): void | Promise<void>;
}

// TODO: This interface exists mostly to allow classes like PathRegistry to
// consume both RouteGroup and Route classes without the liberal use of `<any>`.
// Is there a cleaner way to implement this?
export interface MatchableRoute extends RouteHandlers {
	match?: (path: string) => NavigationArgs;
	path?: string;
	removeRoute?: (route: MatchableRoute | string) => MatchableRoute;
	rule?: PathRule;
}

export interface NavigationArgs extends EventObject {
	matched: string;
	path?: string;
	route?: MatchableRoute;
	state: any;
}

export interface RouteHandlers {
	beforeEnter?: (event: CancelableNavigationArgs) => void;
	beforeExit?: (event: CancelableNavigationArgs) => void;
	change?: (kwArgs: NavigationArgs) => void;
	enter?: (kwArgs: NavigationArgs) => void;
	exit?: () => void;
}

export interface RouteArgs extends DefaultRouteArgs {
	path: string;
	routes?: MatchableRoute[];
}

export interface RouteGroupArgs {
	defaultRoute?: DefaultRoute;
	path: string;
	routes?: MatchableRoute[];
}

export interface RouterArgs extends RouteGroupArgs {
	source?: RouterSource;
}

export interface RouterSource {
	currentPath: string;

	destroy(): void;
	go(path: string, state?: {}): void;
}
