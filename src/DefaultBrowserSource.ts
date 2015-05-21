import Evented from 'dojo-core/Evented';
import global from 'dojo-core/global';
import { NavigationArgs, RouterSource } from './routing';

/**
 * The `DefaultBrowserSource` navigates via full page refreshes (the default method of
 * navigation).
 *
 * This allows `Router` to be used where the HTML History API is not supported, and
 * preserving the URL is preferred over something like a `hashchange` implementation.
 */
export default class DefaultBrowserSource extends Evented implements RouterSource {
	protected _current: string;

	get currentPath(): string {
		return this._current || global.location.pathname;
	}

	destroy(): void {
		this.go = function () {};
	}

	go(path: string = null): void {
		if (path === null || !this._current) {
			this._current = global.location.pathname;
			this.emit({
				type: 'change',
				path: this._current
			});
		}
		else if (path !== this._current) {
			global.location = global.location.origin + path;
		}
	}
}
