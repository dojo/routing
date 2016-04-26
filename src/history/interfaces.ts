import { EventObject, Handle } from 'dojo-core/interfaces';
import { Evented, EventedListener, EventedOptions } from 'dojo-widgets/mixins/createEvented';

export { BrowserHistory } from './_browser';

export interface HistoryChangeEvent extends EventObject {
	value: string;
}

export interface History extends Evented {
	current: string;
	set(path: string): void;
	replace(path: string): void;

	on(type: 'change', listener: EventedListener<HistoryChangeEvent>): Handle;
	on(type: string, listener: EventedListener<EventObject>): Handle;
}

export interface HistoryOptions extends EventedOptions {}
