import DefaultRoute from './DefaultRoute';
import { EventObject } from 'dojo-core/interfaces';
import Promise from 'dojo-core/Promise';
import Router from './Router';
import RouteManager from './RouteManager';

export interface CancelableNavigationArgs extends NavigationArgs {
	preventDefault(): void;
}

export interface DefaultRouteArgs {
	beforeEnter?(event: CancelableNavigationArgs): void | Promise<void>;
	beforeExit?(event: CancelableNavigationArgs): void | Promise<void>;
	change?(kwArgs: NavigationArgs): void | Promise<void>;
	enter(path: string): void | Promise<void>;
	exit?(): void | Promise<void>;
}

export interface MatchableRoute extends RouteHandlers {
	// Used by both Route and RouteGroup
	parent: RouteManager;
	path?: string;

	match(path: string): NavigationArgs;
}

export interface NavigationArgs extends EventObject {
	path?: string;
	rest: string;
	route?: MatchableRoute;
	routerPath?: string;
	state: any;
}

export interface Route extends MatchableRoute {
	path: string;
}

export interface RouteHandlers {
	beforeEnter?: (event: CancelableNavigationArgs) => void | Promise<void>;
	beforeExit?: (event: CancelableNavigationArgs) => void | Promise<void>;
	change?: (kwArgs: NavigationArgs) => void | Promise<void>;
	enter?: (path: string) => void | Promise<void>;
	exit?: () => void | Promise<void>;
}

export interface RouteArgs extends DefaultRouteArgs {
	path: string;
	routes?: Route[];
}

export interface RouteManagerArgs {
	defaultRoute?: DefaultRoute;
	path: string;
	routes?: MatchableRoute[];
}

export interface RouterArgs extends RouteManagerArgs {
	source?: RouterSource;
}

export interface RouterSource {
	currentPath: string;

	destroy(): void;
	go(path: string, state?: {}): void;
}
