import compose, { ComposeFactory } from 'dojo-compose/compose';
import { EventObject, Handle } from 'dojo-core/interfaces';
import Promise from 'dojo-core/Promise';
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
	dispatch(context: Context, path: string): Promise<boolean>;
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

	dispatch (context: Context, path: string): Promise<boolean> {
		let noSyncCancel: () => void;
		let cancel: () => void;
		const deferrals = [new Promise<void>((resolve, reject) => {
			noSyncCancel = resolve;
			cancel = () => reject();
		})];

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
		noSyncCancel();

		const { searchParams, segments } = getSegments(path);
		return Promise.all(deferrals).then(() => {
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
		}, () => false);
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
