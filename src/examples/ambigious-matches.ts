import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { v, w } from '@dojo/widget-core/d';
import { WidgetProperties, DNode } from '@dojo/widget-core/interfaces';

import { Outlet } from './../Routing';

export interface ChildProperties extends WidgetProperties {
	name: string;
}

export class About extends WidgetBase {
	render(): DNode {
		return v('h2', [ 'About' ]);
	}
}

export class Company extends WidgetBase {
	render(): DNode {
		return v('h2', [ 'Company' ]);
	}
}

export interface UserProperties extends WidgetProperties {
	name: string;
}

export class User extends WidgetBase<UserProperties> {
	render(): DNode {
		return v('div', [
			v('h2', [ `User: ${this.properties.name}`])
		]);
	}
}

export const AboutOutlet = Outlet(About, 'about');
export const CompanyOutlet = Outlet(Company, 'company');
export const UserOutlet = Outlet(User, 'user', (params: any) => { return { name: params.user }; });

export interface AppProperties extends WidgetProperties {
	location: string;
}

export class App extends WidgetBase<AppProperties> {
	render(): DNode {
		const { location } = this.properties;
		return v('div', [
			v('ul', [
				v('li', [
					v('a', { href: `${location}/about` }, [ 'About Us (static)' ])
				]),
				v('li', [
					v('a', { href: `${location}/company` }, [ 'Company (static)' ])
				]),
				v('li', [
					v('a', { href: `${location}/kim` }, [ 'Kim (dynamic)' ])
				]),
				v('li', [
					v('a', { href: `${location}/chris` }, [ 'Chris (dyamic)' ])
				])
			]),
			w(AboutOutlet, {}),
			w(CompanyOutlet, {}),
			w(UserOutlet, {})
		]);
	}
}

export const AmbiguousMatchesRouteConfig = {
	path: 'ambiguous-matches',
	outlet: 'ambiguous-matches',
	children: [
		{
			path: 'about',
			outlet: 'about'
		},
		{
			path: 'company',
			outlet: 'company'
		},
		{
			path: '{user}',
			outlet: 'user'
		}
	]
};

export const AmbiguousMatchesOutlet = Outlet(App, 'ambiguous-matches');
