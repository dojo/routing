import { DNode, WidgetBaseInterface } from '@dojo/widget-core/interfaces';
import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { w } from '@dojo/widget-core/d';
import { inject } from '@dojo/widget-core/decorators/inject';
import { alwaysRender } from '@dojo/widget-core/decorators/alwaysRender';
import { Component, OutletOptions, OutletComponents, Outlet } from './interfaces';
import { Router } from './Router';

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

		private _onEnter() {
			if (this._matched === false) {
				onEnter && onEnter();
				this._matched = true;
			}
		}

		protected render(): DNode {
			let { router, ...properties } = this.properties;

			const outletContext = router.getOutlet(outlet);
			if (outletContext) {
				const { queryParams, params, type } = outletContext;
				if (mapParams) {
					properties = { ...properties, ...mapParams({ queryParams, params, type, router }) };
				}

				if (type === 'exact' && indexComponent) {
					this._onEnter();
					return w(indexComponent, properties, this.children);
				} else if (type === 'error' && errorComponent) {
					this._onEnter();
					return w(errorComponent, properties, this.children);
				} else if (type === 'error' && indexComponent) {
					this._onEnter();
					return w(indexComponent, properties, this.children);
				} else if (type !== 'error' && mainComponent) {
					this._onEnter();
					return w(mainComponent, properties, this.children);
				}
			}

			if (this._matched === true) {
				onExit && onExit();
				this._matched = false;
			}
			return null;
		}
	}
	return OutletComponent;
}
