import { after } from 'dojo-core/aspect';
import Evented from 'dojo-core/Evented';
import { Handle, EventObject } from 'dojo-core/interfaces';
import Promise from 'dojo-core/Promise';
import CancelNavigationError from './errors/CancelNavigationError';
import has from './has';
import HashSource from './HashSource';
import HtmlHistorySource from './HtmlHistorySource';
import PathRule from './PathRule';
import RouteManager from './RouteManager';
import { CancelableNavigationArgs, MatchableRoute, NavigationArgs, Route, RouteHandlers, RouterArgs, RouterSource } from './routing';

const DefaultSource = has('history') ? HtmlHistorySource : HashSource;
let defaultSource: RouterSource = null;

if (has('host-browser')) {
	defaultSource = new (<any> DefaultSource)();
}

// TODO Replace with `lang.assign` when it's available.
function mixin(target: {}, ...sources: {}[]): {} {
	return sources.reduce(function (object: {}, source: {}): {} {
		Object.keys(source).forEach(function (key: string): void {
			(<any> object)[key] = (<any> source)[key];
		});

		return object;
	}, target);
}

export default class Router extends RouteManager {
	protected _evented: Evented;
	protected _isRun: boolean;

	canceled: NavigationArgs;
	current: NavigationArgs;
	error: (error: Error) => void;
	source: RouterSource;

	constructor(kwArgs: RouterArgs) {
		super(kwArgs);

		this.error = kwArgs.error || null;
		this.source = kwArgs.source || defaultSource;
		this._evented = new Evented();
		this._isRun = false;
	}

	protected _createEvent(type: string, args: NavigationArgs): CancelableNavigationArgs {
		const event = <CancelableNavigationArgs> mixin(Object.create(null), args);
		event.type = type;

		return event;
	}

	protected _getEventPromise(
		event: CancelableNavigationArgs,
		path: string,
		object: any,
		method: string
	): Promise<any> {
		return new Promise(function (resolve: Function, reject: Function): void {
			if (typeof object[method] !== 'function') {
				return resolve();
			}

			event.preventDefault = function () {
				reject(new CancelNavigationError('Navigation canceled for path ' + path));
			};

			const handle = after(object, method, function () {
				handle.destroy();
				resolve();
			});
			object[method](event);
		});
	}

	protected _getRouteArgs(path: string): NavigationArgs {
		let args: NavigationArgs = null;

		for (let route of this.routes) {
			args = route.match(path);

			if (args) {
				break;
			}
		}

		return args || this.defaultRoute && this.defaultRoute.match(path);
	}

	protected _navigate(path: string, args: NavigationArgs): Promise<any> {
		const current = args.route;
		const previous = this.current && this.current.route;

		if (current === previous) {
			return Promise.resolve(current.change && current.change(args));
		}

		const previousArgs = this.current;
		const event = this._createEvent('beforechange', args);
		const getEventPromise = this._getEventPromise.bind(this, event, path);

		const self = this;
		return getEventPromise(this, 'emit')
			.then(function () {
				return previous && getEventPromise(previous, 'beforeExit');
			})
			.then(function () {
				return getEventPromise(current, 'beforeEnter');
			})
			.then(function () {
				return previous && previous.exit && previous.exit();
			})
			.then(function () {
				self.current = args;
				self.current.route = current;

				return current.enter(path);
			})
			.then(function () {
				self.source && self.source.go(PathRule.join(self.path, path), args.state);
				self.emit(self._createEvent('change', args));
			})
			.catch(function (error: any) {
				self.canceled = args;
				self.current = previousArgs;

				if (self.error) {
					return self.error(error);
				}

				if (error.name !== 'CancelNavigationError') {
					throw error;
				}
			});
	}

	destroy(): void {
		this.go = function () {
			return Promise.resolve(null);
		};
		this.source && this.source.destroy();
		this.routes = this._rule = this.source = null;
	}

	emit(data: EventObject): void {
		return this._evented.emit(data);
	}

	go(path: string): Promise<any> {
		const normalized = PathRule.normalizePath(path);

		if (this.current && (normalized === this.current.path)) {
			return Promise.resolve(null);
		}

		const args = this._getRouteArgs(path);

		if (!args) {
			this.error && this.error(new Error('The path provided to Router#go matched no routes.'));
			return Promise.resolve(null);
		}

		args.routerPath = normalized;
		return this._navigate(path, args);
	}

	on(type: string, listener: (event: EventObject) => void): Handle {
		return this._evented.on(type, listener);
	}

	/**
	 * Starts the router.
	 *
	 *
	 */
	run(forceRedirect: boolean = true): Promise<any> {
		let path: string = forceRedirect ? '/' : this.source && this.source.currentPath;
		this.run = function (): Promise<any> {
			return Promise.resolve(null);
		};
		return this.go(path);
	}
}
