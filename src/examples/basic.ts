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
	location: string;
}

class Topics extends WidgetBase<TopicsProperties> {
	render() {
		const { showHeading, location } = this.properties;

		return v('div', [
			v('h2', [ 'Topics' ]),
			v('ul', [
				v('li', [
					v('a', { href: `${location}/rendering` }, [ 'Rendering with Dojo 2' ])
				]),
				v('li', [
					v('a', { href: `${location}/widgets` }, [ 'Widgets' ])
				]),
				v('li', [
					v('a', { href: `${location}/props-v-state` },  [ 'Props v State' ])
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
const TopicsOutlet = Outlet(Topics, 'topics', (params: any, type: string, location: string) => {
	return { showHeading: type === 'index', location };
});
const TopicOutlet = Outlet(Topic, 'topic');

interface AppProperties extends WidgetProperties {
	location: string;
}

class App extends WidgetBase<AppProperties> {
	render() {
		const { location } = this.properties;

		return v('div', [
			v('ul', [
				v('li', [
					v('a', { href: `${location}/home` }, [ 'Home' ])
				]),
				v('li', [
					v('a', { href: `${location}/about` }, [ 'About' ])
				]),
				v('li', [
					v('a', { href: `${location}/topics` }, [ 'Topics' ])
				])
			]),
			w(AboutOutlet, {}),
			w(HomeOutlet, {}),
			w(TopicsOutlet, {})
		]);
	}
}

export const BasicAppOutlet = Outlet(App, 'basic');
