import { after } from 'dojo-core/aspect';
import Evented from 'dojo-core/Evented';
import { Handle, EventObject } from 'dojo-core/interfaces';
import { assign } from 'dojo-core/lang';
import Promise from 'dojo-core/Promise';
import CancelNavigationError from './errors/CancelNavigationError';
import MissingRouteError from './errors/MissingRouteError';
import has from './has';
import HashSource from './HashSource';
import HtmlHistorySource from './HtmlHistorySource';
import { CancelableNavigationArgs, NavigationArgs, RouterArgs, RouterSource } from './interfaces';
import { joinPath, normalizePath } from './PathRule';
import RouteGroup from './RouteGroup';

const DefaultSource = has('html5-history') ? HtmlHistorySource : HashSource;
let defaultSource: RouterSource = null;

if (has('host-browser')) {
	defaultSource = new (<any> DefaultSource)();
}

/**
 * Handles navigating to/from paths in response to events from the user/environment.
 *
 * @fires "beforechange" Before the lifecycle methods are called. Passed an `event` object with route
 * 		data and a `preventDefault` method that can be called to cancel the route change.
 * @fires "change" When the new route has been entered. Passed an object containing route data.
 * @fires "error" When a route change is canceled or another error occurs. Passed the error object.
 */
export default class Router extends RouteGroup {
	protected _evented: Evented;

	/**
	 * The route data for a route canceled by one of the following methods:
	 * `beforeEnter`, `beforeExit`, or a `beforechange` event handler. This is cleared
	 * each time a new route is successfully entered.
	 */
	canceled: NavigationArgs;

	/**
	 * The data for the current route.
	 */
	current: NavigationArgs;

	/**
	 * The object responsible for updating the environment in response to router changes. Defaults to
	 * an instance of `HtmlHistorySource` in environments where the history API is supported, and to
	 * an instance of `HashSource` otherwise.
	 *
	 * `Router` does not actually change the browser URL or interact with the environment directly.
	 * This allows users to control how the browser responds to route changes (for example, by changing
	 * the URL hash or by calling `history.pushState`).
	 */
	source: RouterSource;

	constructor(kwArgs: RouterArgs) {
		super(kwArgs);

		this.source = kwArgs.source || defaultSource;
		this._evented = new Evented();
	}

	protected _createEvent(type: string, args: NavigationArgs): CancelableNavigationArgs {
		const event = <CancelableNavigationArgs> assign(Object.create(null), args);
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
		return getEventPromise(this._evented, 'emit')
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
				self.source && self.source.go(joinPath(self.path, path), args.state);
				self.canceled = null;
				self._evented.emit(self._createEvent('change', args));
			})
			.catch(function (error: any) {
				self.canceled = args;
				self.current = previousArgs;

				const errorEvent = (error.name === 'CancelNavigationError') ?
					self._createEvent('cancel', args) :
					{ type: 'error', error: error };

				self._evented.emit(errorEvent);

				return Promise.reject(error);
			});
	}

	/**
	 * Disables the router so that it no longer can manage or respond to navigation changes.
	 */
	destroy(): void {
		super.destroy();
		this.go = function () {
			return Promise.resolve(null);
		};
		this.source && this.source.destroy();
		this.source = null;
	}

	/**
	 * Navigates to the specified path.
	 *
	 * `Router#go` recursively searches all of its nested groups for a route that matches the specified
	 * path. If a route is found, then the lifecycle methods are called in the following order:
	 * 1. The current route's optional `beforeExit` method.
	 * 2. The new route's optional `beforeEnter` method.
	 * 3. The current route's optional `exit` method.
	 * 4. The new route's required `enter` method.
	 *
	 * If no route is found, then an "error" event is emitted that can be used to handle the error.
	 *
	 * @param path The path to navigate to.
	 * @return A promise that resolves when all of the lifecycle methods have executed without error
	 * 		and the environment has successfully navigated to the new URL.
	 */
	go(path: string): Promise<any> {
		const normalized = normalizePath(path);

		if (this.current && (normalized === this.current.path)) {
			return Promise.resolve(null);
		}

		const args = this._registry.match(normalized);

		if (!args) {
			const error = new MissingRouteError('The path provided to Router#go matched no routes.');
			this._evented.emit({ type: 'error', error: error });
			return Promise.reject(error);
		}

		args.path = normalized;

		return this._navigate(normalized, args);
	}

	/**
	 * Registers callbacks that will be fired when the router emits the corresponding events.
	 *
	 * @param type The name of the event to be listened to.
	 * @returns An object with a `destroy` method that can be called to disable the registered callback.
	 */
	on(type: string, listener: (event: EventObject) => void): Handle {
		return this._evented.on(type, listener);
	}
}
