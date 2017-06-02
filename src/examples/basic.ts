import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { v, w } from '@dojo/widget-core/d';
import { WidgetProperties } from '@dojo/widget-core/interfaces';

import { Outlet } from './../Routing';

interface ChildProperties extends WidgetProperties {
	name: string;
}

class About extends WidgetBase {
	render() {
		return v('div', [
			v('h2', [ 'About' ])
		]);
	}
}

class Home extends WidgetBase {
	render() {
		return v('div', [
			v('h2', [ 'Home' ])
		]);
	}
}

interface TopicsProperties extends WidgetProperties {
	showHeading: string;
	currentPath: string;
}

class Topics extends WidgetBase<TopicsProperties> {
	render() {
		const { showHeading, currentPath } = this.properties;

		return v('div', [
			v('h2', [ 'Topics' ]),
			v('ul', [
				v('li', [
					v('a', { href: `${currentPath}/rendering` }, [ 'Rendering with Dojo 2' ])
				]),
				v('li', [
					v('a', { href: `${currentPath}/widgets` }, [ 'Widgets' ])
				]),
				v('li', [
					v('a', { href: `${currentPath}/props-v-state` },  [ 'Props v State' ])
				])
			]),
			showHeading ? v('h3', [ 'Please select a topic.' ]) : null,
			w(TopicOutlet, {})
		]);
	}
}

interface TopicProperties extends WidgetProperties {
	topic: string;
}

class Topic extends WidgetBase<TopicProperties> {
	render() {
		return v('div', [
			v('h3', [ this.properties.topic ])
		]);
	}
}

const AboutOutlet = Outlet(About, 'about');
const HomeOutlet = Outlet({ index: Home }, 'home');
const TopicsOutlet = Outlet(Topics, 'topics', (params: any, type: string, currentPath: string) => {
	return { showHeading: type === 'index', currentPath };
});
const TopicOutlet = Outlet(Topic, 'topic');

interface AppProperties extends WidgetProperties {
	currentPath: string;
}

class App extends WidgetBase<AppProperties> {
	render() {
		const { currentPath } = this.properties;

		return v('div', [
			v('ul', [
				v('li', [
					v('a', { href: `${currentPath}/home` }, [ 'Home' ])
				]),
				v('li', [
					v('a', { href: `${currentPath}/about` }, [ 'About' ])
				]),
				v('li', [
					v('a', { href: `${currentPath}/topics` }, [ 'Topics' ])
				])
			]),
			w(AboutOutlet, {}),
			w(HomeOutlet, {}),
			w(TopicsOutlet, {})
		]);
	}
}

export const BasicAppOutlet = Outlet(App, 'basic');
