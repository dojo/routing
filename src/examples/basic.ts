import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { v, w } from '@dojo/widget-core/d';
import { WidgetProperties, DNode } from '@dojo/widget-core/interfaces';

import { Outlet } from './../Outlet';
import { MatchType } from './../Route';
import { Link } from './../Link';
import { MapParamsOptions } from './../interfaces';

export interface ChildProperties extends WidgetProperties {
	name: string;
}

export class About extends WidgetBase {
	render(): DNode {
		return v('div', [
			v('h2', [ 'About' ])
		]);
	}
}

export class Home extends WidgetBase {
	render(): DNode {
		return v('div', [
			v('h2', [ 'Home' ])
		]);
	}
}

export interface TopicsProperties extends WidgetProperties {
	showHeading: boolean;
}

export class Topics extends WidgetBase<TopicsProperties> {
	render(): DNode {
		const { showHeading } = this.properties;

		return v('div', [
			v('h2', [ 'Topics' ]),
			v('ul', [
				v('li', [
					w(Link, { key: 'rendering', to: 'topic', isOutlet: true, params: { topic: 'rendering' } }, [
						'Rendering with Dojo 2'
					])
				]),
				v('li', [
					w(Link, { key: 'widgets', to: 'topic', isOutlet: true, params: { topic: 'widgets' } }, [
						'Widgets'
					])
				]),
				v('li', [
					w(Link, { key: 'props', to: 'topic', isOutlet: true, params: { topic: 'props-v-state' } }, [
						'Props v State'
					])
				])
			]),
			showHeading ? v('h3', [ 'Please select a topic.' ]) : null,
			w(TopicOutlet, {})
		]);
	}
}

export interface TopicProperties extends WidgetProperties {
	topic: string;
}

export class Topic extends WidgetBase<TopicProperties> {
	render(): DNode {
		return v('div', [
			v('h3', [ this.properties.topic ])
		]);
	}
}

class ErrorWidget extends WidgetBase {
	render() {
		return v('div', [ 'ERROR 2' ]);
	}
}

export const AboutOutlet = Outlet(About, 'about');
export const HomeOutlet = Outlet({ index: Home }, 'home');
export const TopicsOutlet = Outlet(Topics, 'topics', ({ type, location }: MapParamsOptions) => {
	return { showHeading: type === MatchType.INDEX, location };
});
export const TopicOutlet = Outlet({ main: Topic, error: ErrorWidget }, 'topic', ({ params }) => {
	return { topic: params.topic };
});

export class App extends WidgetBase {
	render(): DNode {
		return v('div', [
			v('ul', [
				v('li', [
					w(Link, { key: 'home', to: 'home', isOutlet: true}, [ 'Home' ])
				]),
				v('li', [
					w(Link, { key: 'about', to: 'about', isOutlet: true}, [ 'About' ])
				]),
				v('li', [
					w(Link, { key: 'topics', to: 'topics', isOutlet: true}, [ 'Topics' ])
				])
			]),
			w(AboutOutlet, {}),
			w(HomeOutlet, {}),
			w(TopicsOutlet, {})
		]);
	}
}

export const BasicAppRouteConfig = {
	path: 'basic',
	outlet: 'basic',
	children: [
		{
			path: 'home',
			outlet: 'home'
		},
		{
			path: 'about',
			outlet: 'about'
		},
		{
			path: 'topics',
			outlet: 'topics',
			children: [
				{
					path: '{topic}',
					outlet: 'topic'
				}
			]
		}
	]
};

export const BasicAppOutlet = Outlet(App, 'basic');
