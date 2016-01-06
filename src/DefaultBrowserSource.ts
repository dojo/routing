import Evented from 'dojo-core/Evented';
import global from 'dojo-core/global';
import { RouterSource } from './interfaces';

/**
 * The `DefaultBrowserSource` navigates via full page refreshes (the default method of
 * navigation).
 *
 * This allows `Router` to be used where the HTML History API is not supported, and
 * preserving the URL is preferred over something like a `hashchange` implementation.
 */
export default class DefaultBrowserSource extends Evented implements RouterSource {
	protected _current: string;

	/**
	 * The current URL path.
	 */
	get currentPath(): string {
		return this._current || global.location.pathname;
	}

	/**
	 * Disables the instance so that it no longer affects the browser state.
	 */
	destroy(): void {
		this.go = function () {};
	}

	/**
	 * Redirects the browser to the provided URL. If no path is provided, then it is
	 * assumed that the current URL is meant to be treated as the new path. In this case,
	 * a "change" event is emitted, with the expectation that the router can then pass control
	 * to the appropriate route.
	 */
	go(path: string = null): void {
		if (path === null && this._current === undefined) {
			this._current = global.location.pathname;
			this.emit({
				type: 'change',
				path: this._current
			});
		}
		else if (path !== null && path !== this._current) {
			global.location = global.location.origin + path;
		}
	}
}
