import { History } from './interfaces';

export class HashHistory implements History {
	private _onChangeFunction: (path: string) => void;
	private _current: string;

	constructor(onChange: (path: string) => void) {
		this._onChangeFunction = onChange.bind(this);
		window.addEventListener('hashchange', this._onChange.bind(this), false);
		this._onChange();
	}

	public normalizePath(path: string): string {
		return path.replace('#', '');
	}

	public prefix(path: string) {
		if (path[0] !== '#') {
			return `#${path}`;
		}
		return path;
	}

	public set(path: string) {
		path = this.normalizePath(path);
		if (this._current === path) {
			return;
		}
		this._current = path;
		window.location.hash = this.prefix(path);
		this._onChange();
	}

	public get current(): string {
		return this._current;
	}

	private _onChange() {
		const path = this.normalizePath(window.location.hash);
		this._current = path;
		this._onChangeFunction(path);
	}
}
