import { Constructor, RegistryLabel, DNode, WidgetBaseInterface, WidgetProperties } from '@dojo/widget-core/interfaces';
import { beforeRender, WidgetBase } from '@dojo/widget-core/WidgetBase';
import { BaseInjector, Injector } from '@dojo/widget-core/Injector';
import { w, registry } from '@dojo/widget-core/d';

import HashHistory from './history/HashHistory';
import { History } from './history/interfaces';
import { Router, RouteConfig } from './Router';

/**
 * Key for the router injetor
 */
export const routerKey = Symbol();

/**
 * Creates a router instance for a specific History manager (default is `HashHistory`) and registers
 * the route configuration.
 *
 * @param routes The routes to register for the router
 * @param history The history manager the router needs to use, default `HashHistory`
 */
export function registerRouter(routes: RouteConfig[], history: History = new HashHistory()): Router<any> {
	if (registry.has(routerKey)) {
		throw new Error('Router has already been defined');
	}
	const router = new Router({ history, config: routes });
	registry.define(routerKey, Injector(RouterInjector, router));
	return router;
}

/**
 * Component type
 */
export type Component<W extends WidgetBaseInterface = WidgetBaseInterface> = Constructor<W> | RegistryLabel;

/**
 * Determine if the property is a Component
 */
export function isComponent<W extends WidgetBaseInterface>(value: any): value is Component<W> {
	return Boolean(value && ((typeof value === 'string') || (typeof value === 'function') || (typeof value === 'symbol')));
}

/**
 * Outlet component options
 */
export interface OutletComponents<
	W extends WidgetBaseInterface,
	E extends WidgetBaseInterface,
	F extends WidgetBaseInterface> {

	component?: Component<W>;
	index?: Component<F>;
	error?: Component<E>;
}

export class RouterInjector extends BaseInjector<Router<any>> {
	constructor(context: Router<any>) {
		super(context);
		context.on('navstart', (event: any) => {
			this.invalidate();
		});
	}

	@beforeRender()
	protected beforeRender(renderFunc: any, properties: any, children: any[]) {
		const { outlet, mainComponent, indexComponent, errorComponent, mapParams } = properties.getProperties(this.toInject(), properties);
		if (this.context.hasOutlet(outlet)) {
			const { params = {}, type, location } = this.context.getOutlet(outlet);

			properties.getProperties = (injected: Router<any>, properties: any) => {
				return mapParams(params, type, location);
			};

			if ((type === 'index' || type === 'error') && indexComponent) {
				properties.render = () => w(indexComponent, properties.properties, children);
			}
			else if (type === 'error' && errorComponent) {
				properties.render = () => w(errorComponent, properties.properties, properties.children);
			}
			else if (type !== 'error' && mainComponent) {
				properties.render = () => w(mainComponent, properties.properties, properties.children);
			}
		}
		return renderFunc;
	}
}

/**
 * Outlet type
 */
export type Outlet<
	W extends WidgetBaseInterface,
	F extends WidgetBaseInterface,
	E extends WidgetBaseInterface> = Constructor<WidgetBase<Partial<Partial<E['properties']> & W['properties']> & Partial<F['properties']> & WidgetProperties, null>>;

export function Outlet<W extends WidgetBaseInterface, F extends WidgetBaseInterface, E extends WidgetBaseInterface>(
	outletComponents: Component<W> | OutletComponents<W, F, E>,
	outlet: string,
	mapParams: Function = (params: any, type: string, location: string) => { return { ...params, type, location }; }
): Outlet<W, F, E> {
	const indexComponent = isComponent(outletComponents) ? undefined : outletComponents.index;
	const mainComponent = isComponent(outletComponents) ? outletComponents : outletComponents.component;
	const errorComponent = isComponent(outletComponents) ? undefined : outletComponents.error;

	return class extends WidgetBase<any, null> {

		protected render(): DNode {
			const { children, properties } = this;

			return w<RouterInjector>(routerKey, {
				scope: this,
				render: (): DNode => { return null; },
				getProperties: (injected: Router<any>, properties: any) => {
					return { outlet, mainComponent, indexComponent, errorComponent, mapParams };
				},
				properties,
				children
			});
		}
	};
}
