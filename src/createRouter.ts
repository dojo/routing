import compose, { ComposeFactory } from 'dojo-compose/compose';
import { EventObject, Handle } from 'dojo-core/interfaces';
import Task from 'dojo-core/async/Task';
import createEvented, { Evented, EventedOptions, EventedListener } from 'dojo-widgets/mixins/createEvented';

import { Route, ExecutionMethod } from './createRoute';
import { Context, Parameters, Request } from './interfaces';
import { getSegments } from './util/path';

export interface NavigationStartEvent extends EventObject {
	path: string;
	cancel(): void;
	defer(): { cancel(): void, resume(): void };
}

export interface Router extends Evented {
	routes?: Route<Parameters>[];
	append(routes: Route<Parameters> | Route<Parameters>[]): void;
	dispatch(context: Context, path: string): Task<boolean>;
	fallback?(request: Request<any>): void;

	on(type: 'navstart', listener: EventedListener<NavigationStartEvent>): Handle;
	on(type: string, listener: EventedListener<EventObject>): Handle;
}

export interface RouterOptions extends EventedOptions {
	fallback?(request: Request<any>): void;
}

export interface RouterFactory extends ComposeFactory<Router, RouterOptions> {}

const createRouter: RouterFactory = compose({
	append (routes: Route<Parameters> | Route<Parameters>[]) {
		if (Array.isArray(routes)) {
			for (const route of routes) {
				this.routes.push(route);
			}
		}
		else {
			this.routes.push(routes);
		}
	},

	dispatch (context: Context, path: string): Task<boolean> {
		let canceled = false;
		const cancel = () => {
			canceled = true;
		};

		const deferrals: Promise<void>[] = [];

		this.emit({
			type: 'navstart',
			path,
			cancel,
			defer () {
				let cancel: () => void;
				let resume: () => void;
				deferrals.push(new Promise<void>((resolve, reject) => {
					cancel = () => reject();
					resume = () => resolve();
				}));
				return { cancel, resume };
			}
		});

		if (canceled) {
			return Task.resolve(false);
		}

		const { searchParams, segments } = getSegments(path);
		return new Task((resolve, reject) => {
			Promise.all(deferrals).then(() => {
				if (canceled) {
					return false;
				}

				const dispatched = (<Router> this).routes.some(route => {
					const hierarchy = route.select(context, segments, searchParams);
					if (hierarchy.length === 0) {
						return false;
					}

					for (const { method, route, params } of hierarchy) {
						switch (method) {
							case ExecutionMethod.Exec:
								route.exec({ context, params });
								break;
							case ExecutionMethod.Fallback:
								route.fallback({ context, params });
								break;
							case ExecutionMethod.Index:
								route.index({ context, params });
								break;
						}
					}

					return true;
				});

				if (!dispatched && this.fallback) {
					this.fallback({ context, params: {} });
					return true;
				}

				return dispatched;
			}, () => false).then(resolve, reject);
		}, cancel);
	}
}).mixin({
	mixin: createEvented,
	initialize(instance: Router, { fallback }: RouterOptions = {}) {
		instance.routes = [];

		if (fallback) {
			instance.fallback = fallback;
		}
	}
});

export default createRouter;
