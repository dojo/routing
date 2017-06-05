import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { v, w } from '@dojo/widget-core/d';
import { WidgetProperties } from '@dojo/widget-core/interfaces';

import { Outlet } from './../Routing';

interface ChildProperties extends WidgetProperties {
	name: string;
}

class Child extends WidgetBase<ChildProperties> {
	render() {
		console.log('Child Render');
		return v('div', [
			v('h3', [ `ID: ${this.properties.name || 'this must be about'}` ])
		]);
	}
}

const ChildOutlet = Outlet(Child, 'child', (params: any) => { return { name: params.id }; });

interface AppProperties extends WidgetProperties {
	location: string;
}

class App extends WidgetBase<AppProperties> {
	render() {
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

export const UrlParametersAppOutlet = Outlet(App, 'url-parameters');
