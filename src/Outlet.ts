import { DNode, WidgetBaseInterface } from '@dojo/widget-core/interfaces';
import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { w } from '@dojo/widget-core/d';
import { inject } from '@dojo/widget-core/decorators/inject';
import { alwaysRender } from '@dojo/widget-core/decorators/alwaysRender';
import { OnEnter, Component, OutletOptions, OutletComponents, Outlet, Params } from './interfaces';
import { Router } from './Router';
import { widgetInstanceMap } from '@dojo/widget-core/vdom';

export function isComponent<W extends WidgetBaseInterface>(value: any): value is Component<W> {
	return Boolean(value && (typeof value === 'string' || typeof value === 'function' || typeof value === 'symbol'));
}

export function getProperties(router: Router, properties: any) {
	return { router };
}

export function Outlet<W extends WidgetBaseInterface, F extends WidgetBaseInterface, E extends WidgetBaseInterface>(
	outletComponents: Component<W> | OutletComponents<W, F, E>,
	outlet: string,
	options: OutletOptions = {}
): Outlet<W, F, E> {
	const indexComponent = isComponent(outletComponents) ? undefined : outletComponents.index;
	const mainComponent = isComponent(outletComponents) ? outletComponents : outletComponents.main;
	const errorComponent = isComponent(outletComponents) ? undefined : outletComponents.error;
	const { onEnter, onExit, mapParams, key = 'router' } = options;

	@inject({ name: key, getProperties })
	@alwaysRender()
	class OutletComponent extends WidgetBase<Partial<W['properties']> & { router: Router }, null> {
		private _matched = false;
		private _matchedParams: Params = {};
		private _onExit?: () => void;

		public __setProperties__(properties: Partial<W['properties']> & { router: Router }): void {
			super.__setProperties__(properties);
			const instanceData = widgetInstanceMap.get(this)!;
			instanceData.dirty = true;
		}

		private _hasRouteChanged(params: Params): boolean {
			if (!this._matched) {
				return true;
			}
			const newParamKeys = Object.keys(params);
			for (let i = 0; i < newParamKeys.length; i++) {
				const key = newParamKeys[i];
				if (this._matchedParams[key] !== params[key]) {
					return true;
				}
			}
			return false;
		}

		private _onEnter(params: Params, onEnterCallback?: OnEnter) {
			if (this._hasRouteChanged(params)) {
				onEnterCallback && onEnterCallback(params);
				this._matched = true;
				this._matchedParams = params;
			}
		}

		protected render(): DNode {
			let { router, ...properties } = this.properties;

			const outletContext = router.getOutlet(outlet);
			if (outletContext) {
				const { queryParams, params, type, onEnter: outletOnEnter, onExit: outletOnExit } = outletContext;
				this._onExit = onExit || outletOnExit;
				if (mapParams) {
					properties = { ...properties, ...mapParams({ queryParams, params, type, router }) };
				}

				if (type === 'index' && indexComponent) {
					this._onEnter(params, onEnter || outletOnEnter);
					return w(indexComponent, properties, this.children);
				} else if (type === 'error' && errorComponent) {
					this._onEnter(params, onEnter || outletOnEnter);
					return w(errorComponent, properties, this.children);
				} else if (type === 'error' && indexComponent) {
					this._onEnter(params, onEnter || outletOnEnter);
					return w(indexComponent, properties, this.children);
				} else if (type !== 'error' && mainComponent) {
					this._onEnter(params, onEnter || outletOnEnter);
					return w(mainComponent, properties, this.children);
				}
			}

			if (this._matched) {
				this._onExit && this._onExit();
				this._matched = false;
			}
			return null;
		}
	}
	return OutletComponent;
}

export default Outlet;
