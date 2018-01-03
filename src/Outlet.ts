import { DNode, RegistryLabel, WidgetBaseInterface } from '@dojo/widget-core/interfaces';
import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { w } from '@dojo/widget-core/d';
import { inject } from '@dojo/widget-core/decorators/inject';
import { alwaysRender } from '@dojo/widget-core/decorators/alwaysRender';
import { Component, OutletCallbacks, OutletComponents, Outlet } from './interfaces';
import { Router } from './Router';

export function isComponent<W extends WidgetBaseInterface>(value: any): value is Component<W> {
	return Boolean(value && (typeof value === 'string' || typeof value === 'function' || typeof value === 'symbol'));
}

export function Outlet<W extends WidgetBaseInterface, F extends WidgetBaseInterface, E extends WidgetBaseInterface>(
	outletComponents: Component<W> | OutletComponents<W, F, E>,
	outlet: string,
	outletCallbacks: OutletCallbacks = {},
	key: RegistryLabel
): Outlet<W, F, E> {
	const indexComponent = isComponent(outletComponents) ? undefined : outletComponents.index;
	const mainComponent = isComponent(outletComponents) ? outletComponents : outletComponents.main;
	const errorComponent = isComponent(outletComponents) ? undefined : outletComponents.error;
	function getProperties(this: WidgetBase, router: Router, properties: any) {
		return { router };
	}

	@inject({ name: key, getProperties })
	@alwaysRender()
	class OutletComponent extends WidgetBase<Partial<W['properties']> & { router: Router }, null> {
		private _matched = false;

		private _onEnter() {
			const { onEnter } = outletCallbacks;
			if (this._matched === false) {
				onEnter && onEnter();
				this._matched = true;
			}
		}

		protected render(): DNode {
			const { mapParams, onExit } = outletCallbacks;
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
