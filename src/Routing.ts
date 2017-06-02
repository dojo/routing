import Map from '@dojo/shim/Map';
import { Evented } from '@dojo/core/Evented';
import { Constructor, RegistryLabel, DNode, WidgetBaseInterface, WidgetProperties } from '@dojo/widget-core/interfaces';
import { beforeRender, WidgetBase } from '@dojo/widget-core/WidgetBase';
import { BaseInjector, Injector } from '@dojo/widget-core/Injector';
import { w, registry } from '@dojo/widget-core/d';

import HashHistory from './history/HashHistory';
import { History } from './history/interfaces';
import { Router } from './Router';
import { Route } from './Route';

/**
 * Config for registering routes
 */
export interface RouteConfig {
	path: string;
	outlet: string;
	children?: RouteConfig[];
}

/**
 * Key for the router injetor
 */
export const routerKey = Symbol();

/**
 * Router context used to maintain state for receiving outlets
 */
export class RouterContext extends Evented {

	/**
	 * Outlet stack
	 */
	private _outletStack: Map<string, any> = new Map<string, any>();

	/**
	 * Registered Router
	 */
	private _router: Router<any>;

	constructor(router: Router<any>) {
		super({});
		this._router = router;
	}

	get router(): Router<any> {
		return this._router;
	}

	public addOutlet(outlet: string, params: any, currentPath: string, type: 'outlet' | 'fallback' | 'index' = 'outlet') {
		this._outletStack.set(outlet, { params, type, currentPath });
	}

	public getOutlet(outlet: string): any {
		return this._outletStack.get(outlet) || {};
	}

	public reset(): void {
		this._outletStack.clear();
	}
}

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
	const router = new Router({ history, fallback: function(this: Router<any>) {
		this.emit<any>({ type: 'outlet', outlet: 'errorOutlet' });
	} });
	const context = new RouterContext(router);
	registry.define(routerKey, Injector(RouterInjector, context));
	registerRoutes(routes, router, context);
	return router;
}

/**
 * @param routes
 * @param router
 * @param context
 */
export function registerRoutes(routes: RouteConfig[], router: Router<any>, context: RouterContext, parentRoute?: Route<any, any>) {
	routes.forEach((routeDef) => {
		const route = new Route({
			path: routeDef.path,
			exec(request) {
				context.addOutlet(routeDef.outlet, request.params, router.link(route));
			},
			fallback(request) {
				context.addOutlet(routeDef.outlet, request.params, router.link(route), 'fallback');
			},
			index(request) {
				context.addOutlet(routeDef.outlet, request.params, router.link(route), 'index');
			}
		});
		if (parentRoute !== undefined) {
			parentRoute.append(route);
		}
		else {
			router.append(route);
		}
		if (routeDef.children) {
			registerRoutes(routeDef.children, router, context, route);
		}
	});
}

/**
 * Component type
 */
export type Component<W extends WidgetBaseInterface = WidgetBaseInterface> = Constructor<W> | RegistryLabel;

/**
 * Determine if the property is a Component
 */
export function isComponent<W extends WidgetBaseInterface, F extends WidgetBaseInterface>(value: any): value is Component<W> {
	return Boolean(value && ((typeof value === 'string') || (typeof value === 'function') || (typeof value === 'symbol')));
}

/**
 * Outlet component options
 */
export interface OutletComponents<W extends WidgetBaseInterface, F extends WidgetBaseInterface> {
	component?: Component<W>;
	index?: Component<F>;
}

export class RouterInjector extends BaseInjector<RouterContext> {
	constructor(context: RouterContext) {
		super(context);
		context.router.on('navstart', (event: any) => {
			context.reset();
			this.invalidate();
		});
	}

	@beforeRender()
	protected beforeRender(renderFunc: any, properties: any, children: any[]) {
		const { outlet, mainComponent, indexComponent, mapParams } = properties.getProperties(this.toInject(), properties);
		const { params = {}, type, currentPath } = this.context.getOutlet(outlet);

		properties.getProperties = (injected: RouterContext, properties: any) => {
			return mapParams(params, type, currentPath);
		};

		if ((type === 'index' || type === 'fallback') && indexComponent) {
			properties.render = () => w(indexComponent, properties.properties, children);
		}
		if (type && mainComponent) {
			properties.render = () => w(mainComponent, properties.properties, properties.children);
		}
		return renderFunc;
	}
}

/**
 * Outlet type
 */
export type Outlet<W extends WidgetBaseInterface, F extends WidgetBaseInterface> = Constructor<WidgetBase<Partial<W['properties']> & Partial<F['properties']> & WidgetProperties, null>>;

export function Outlet<W extends WidgetBaseInterface, F extends WidgetBaseInterface>(
	outletComponents: Component<W> | OutletComponents<W, F>,
	outlet: string,
	mapParams: Function = (params: any, type: string, currentPath: string) => { return { ...params, type, currentPath }; }
): Outlet<W, F> {
	const indexComponent = isComponent(outletComponents) ? undefined : outletComponents.index;
	const mainComponent = isComponent(outletComponents) ? outletComponents : outletComponents.component;

	return class extends WidgetBase<any, null> {

		protected render(): DNode {
			const { children, properties } = this;

			return w<RouterInjector>(routerKey, {
				scope: this,
				render: (): DNode => { return null; },
				getProperties: (injected: Router<any>, properties: any) => {
					return { outlet, mainComponent, indexComponent, mapParams };
				},
				properties,
				children
			});
		}
	};
}
