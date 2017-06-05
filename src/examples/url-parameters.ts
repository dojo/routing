import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { v, w } from '@dojo/widget-core/d';
import { WidgetProperties, DNode } from '@dojo/widget-core/interfaces';

import { Outlet, RouteConfig } from './../Routing';

export interface ChildProperties extends WidgetProperties {
	name: string;
}

export class Child extends WidgetBase<ChildProperties> {
	render(): DNode {
		console.log('Child Render');
		return v('div', [
			v('h3', [ `ID: ${this.properties.name || 'this must be about'}` ])
		]);
	}
}

export const ChildOutlet = Outlet(Child, 'child', (params: any) => { return { name: params.id }; });

export interface AppProperties extends WidgetProperties {
	location: string;
}

export class App extends WidgetBase<AppProperties> {
	render(): DNode {
		const { location } = this.properties;

		return v('div', [
			v('h2', [ 'Accounts' ]),
			v('ul', [
				v('li', [
					v('a', { href: `${location}/netflix` }, [ 'Netflix' ])
				]),
				v('li', [
					v('a', { href: `${location}/zillow-group` }, [ 'Zillow Group' ])
				]),
				v('li', [
					v('a', { href: `${location}/yahoo` }, [ 'Yahoo' ])
				]),
				v('li', [
					v('a', { href: `${location}/modus-create` }, [ 'Modus Create' ])
				])
			]),
			w(ChildOutlet, {})
		]);
	}
}

export const UrlParametersRouteConfig: RouteConfig = {
	path: 'url-parameters',
	outlet: 'url-parameters',
	children: [
		{
			path: '{id}',
			outlet: 'child'
		}
	]
};

export const UrlParametersAppOutlet = Outlet(App, 'url-parameters');
