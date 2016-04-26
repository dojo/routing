import compose, { ComposeFactory } from 'dojo-compose/compose';
import createEvented from 'dojo-widgets/mixins/createEvented';

import { History, HistoryOptions } from './interfaces';

interface MemoryHistory extends History {
	_current?: string;
}

interface MemoryHistoryOptions extends HistoryOptions {
	path?: string;
}

interface MemoryHistoryFactory extends ComposeFactory<MemoryHistory, MemoryHistoryOptions> {}

const createMemoryHistory: MemoryHistoryFactory = compose({
	get current () {
		return this._current;
	},

	set (path: string) {
		this._current = path;
		this.emit({
			type: 'change',
			value: path
		});
	},

	replace (path: string) {
		this.set(path);
	}
}).mixin({
	mixin: createEvented,
	initialize(instance: MemoryHistory, { path }: MemoryHistoryOptions = {}) {
		instance._current = path || '';
	}
});

export default createMemoryHistory;
