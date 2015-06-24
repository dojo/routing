import Evented from 'dojo-core/Evented';
import global from 'dojo-core/global';
import { Handle } from 'dojo-core/interfaces';
import { createHandle } from 'dojo-core/lang';
import { NavigationArgs, RouterSource } from './routing';

export default class HashSource extends Evented implements RouterSource {
	protected _current: { hash: string; path: string };
	protected _handle: Handle;
	protected _prefix: string;
	protected _prefixPattern: RegExp;

	get currentPath(): string {
		return global.location.hash.replace('#', '');
	}

	get prefix(): string {
		return this._prefix;
	}
	set prefix(prefix: string) {
		this._prefix = prefix || '';
		this._prefixPattern = new RegExp('^#?' + this._prefix, 'g');
	}

	constructor(prefix: string = '!') {
		if (!('location' in global) || !('addEventListener' in global)) {
			throw new Error('HashSource requires a browser.');
		}

		super();

		this.prefix = prefix;
		this._current = <any> {};

		this._registerEvents();
	}

	protected _emit(): void {
		this.emit({
			type: 'change',
			hash: this._current.hash,
			path: this._current.path
		});
	}

	protected _handleHashChange(event: HashChangeEvent): void {
		const url = event.newURL;
		const hash = url.slice(url.indexOf('#') + 1);
		const path = this._normalizePath(hash);

		if (path) {
			this._current.hash = hash;
			this._current.path = path;
			this._emit();
		}
	}

	protected _normalizePath(path: string): string {
		return this._prefixPattern.test(path) ? path.replace(this._prefixPattern, '') : null;
	}

	protected _registerEvents(): void {
		const handleHashChange = this._handleHashChange.bind(this);

		global.addEventListener('hashchange', handleHashChange);
		this._handle = createHandle(function () {
			global.removeEventListener('hashchange', handleHashChange);
		});
	}

	destroy(): void {
		this._handle.destroy();
		this.go = function () {};
	}

	go(path: string): void {
		const normalized = (path.charAt(0) === '/') ? path : '/' + path;

		if (normalized !== this._current.path) {
			global.location.hash = this.prefix + normalized;
		}
	}
}
