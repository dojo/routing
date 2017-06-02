import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { v, w } from '@dojo/widget-core/d';
import { ProjectorMixin } from '@dojo/widget-core/mixins/Projector';

import { registerRouter, RouteConfig } from './../Routing';
import { BasicAppOutlet } from './basic';
import { UrlParametersAppOutlet } from './url-parameters';
import { AmbiguousMatchesOutlet } from './ambigious-matches';

const applicationRoutes: RouteConfig[] = [
	{
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
	},
	{
		path: 'url-parameters',
		outlet: 'url-parameters',
		children: [
			{
				path: '{id}',
				outlet: 'child'
			}
		]
	},
	{
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
	}
];

const router = registerRouter(applicationRoutes);

const linkStyles = { 'text-decoration': 'none', position: 'relative', display: 'block', 'line-height': '1.8', cursor: 'auto', color: 'inherit' };

class App extends WidgetBase {
	render() {
		return v('div', [
			v('div', {
				styles: {
					'font-size': '13px',
					background: '#eee',
					overflow: 'auto',
					position: 'fixed',
					height: '100vh',
					left: '0px',
					top: '0px',
					bottom: '0px',
					width: '250px',
					display: 'block'
				}
			}, [
				v('div', {
					styles: {
						'line-height': '1.8',
						padding: '10px',
						display: 'block'
					}
				}, [
					v('div', {
						styles: {
							'text-transform': 'uppercase',
							'font-weight': 'bold',
							color: 'hsl(0, 0%, 32%)',
							'margin-top': '20px',
							display: 'block'
						}
					},  [ 'Examples' ]),
					v('div', {
						styles: {
							'padding-left': '10px',
							display: 'block'
						}
					}, [
						v('a', { href: '#basic', styles: linkStyles }, [ 'Basic' ]),
						v('a', { href: '#url-parameters', styles: linkStyles }, [ 'Url Parameters' ]),
						v('a', { href: '#ambiguous-matches', styles: linkStyles }, [ 'Ambiguous Matches' ])
					])
				])
			]),
			v('div', { styles: {
				'margin-left': '250px',
				display: 'block'
			} }, [
				w(BasicAppOutlet, {}),
				w(UrlParametersAppOutlet, {}),
				w(AmbiguousMatchesOutlet, {})
			])
		]);
	}
}

const Projector = ProjectorMixin(App);
const projector = new Projector();
projector.append();
router.start();
