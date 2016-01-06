import Evented from 'dojo-core/Evented';
import global from 'dojo-core/global';
import { Handle } from 'dojo-core/interfaces';
import { createHandle } from 'dojo-core/lang';
import has from './has';
import { RouterSource } from './interfaces';

export default class HtmlHistorySource extends Evented implements RouterSource {
	protected _current: { path: string; state: any };
	protected _handle: Handle;

	/**
	 * The current URL path.
	 */
	get currentPath(): string {
		return global.location.pathname;
	}

	constructor() {
		if (!has('html5-history')) {
			throw new Error('HtmlHistorySource requires `window.history` support.');
		}

		super();

		this._current = <any> {};

		this._registerEvents();
	}

	protected _emit(): void {
		this.emit({
			type: 'change',
			path: this._current.path,
			state: this._current.state
		});
	}

	protected _handlePopState(state: {}): void {
		this._updateState(global.location.pathname, state);
		this._emit();
	}

	protected _registerEvents(): void {
		const handlePopState = this._handlePopState.bind(this);

		global.addEventListener('popstate', handlePopState);
		this._handle = createHandle(function () {
			global.removeEventListener('popstate', handlePopState);
		});
	}

	protected _updateState(path: string, state: any): void {
		this._current.path = path;
		this._current.state = state;
	}

	/**
	 * Disables the instance so that it no longer affects the browser state.
	 */
	destroy(): void {
		this._handle.destroy();
		this.go = function () {};
	}

	/**
	 * Redirects the browser to the provided URL. If no path is provided, then it is
	 * assumed that the current URL is meant to be treated as the new path. In this case,
	 * a "change" event is emitted, with the expectation that the router can then pass control
	 * to the appropriate route.
	 */
	go(path: string, state: {} = null): void {
		const normalized = (path.charAt(0) === '/') ? path : '/' + path;

		if (normalized !== this._current.path) {
			global.history.pushState(state, null, normalized);
			this._updateState(normalized, state);
			this._emit();
		}
	}
}
