import { History } from './interfaces';

export class MemoryHistory implements History {
	private _onChangeFunction: (path: string) => void;
	private _current = '/';

	constructor(onChange: (path: string) => void) {
		this._onChangeFunction = onChange.bind(this);
		this._onChange();
	}

	public prefix(path: string) {
		return path;
	}

	public set(path: string) {
		if (this._current === path) {
			return;
		}
		this._current = path;
		this._onChange();
	}

	public get current(): string {
		return this._current;
	}

	private _onChange() {
		this._onChangeFunction(this._current);
	}
}
