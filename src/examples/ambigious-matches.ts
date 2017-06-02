import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { v, w } from '@dojo/widget-core/d';
import { WidgetProperties } from '@dojo/widget-core/interfaces';

import { Outlet } from './../Routing';

interface ChildProperties extends WidgetProperties {
	name: string;
}

class About extends WidgetBase {
	render() {
		return v('h2', [ 'About' ]);
	}
}

class Company extends WidgetBase {
	render() {
		return v('h2', [ 'Company' ]);
	}
}

interface UserProperties extends WidgetProperties {
	name: string;
}

class User extends WidgetBase<UserProperties> {
	render() {
		return v('div', [
			v('h2', [ `User: ${this.properties.name}`])
		]);
	}
}

const AboutOutlet = Outlet(About, 'about');
const CompanyOutlet = Outlet(Company, 'company');
const UserOutlet = Outlet(User, 'user', (params: any) => { return { name: params.user }; });

interface AppProperties extends WidgetProperties {
	currentPath: string;
}

class App extends WidgetBase<AppProperties> {
	render() {
		const { currentPath } = this.properties;
		return v('div', [
			v('ul', [
				v('li', [
					v('a', { href: `${currentPath}/about` }, [ 'About Us (static)' ])
				]),
				v('li', [
					v('a', { href: `${currentPath}/company` }, [ 'Company (static)' ])
				]),
				v('li', [
					v('a', { href: `${currentPath}/kim` }, [ 'Kim (dynamic)' ])
				]),
				v('li', [
					v('a', { href: `${currentPath}/chris` }, [ 'Chris (dyamic)' ])
				])
			]),
			w(AboutOutlet, {}),
			w(CompanyOutlet, {}),
			w(UserOutlet, {})
		]);
	}
}

export const AmbiguousMatchesOutlet = Outlet(App, 'ambiguous-matches');
