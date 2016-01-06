import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import DefaultRoute from 'src/DefaultRoute';
import Route from 'src/Route';
import RouteGroup from 'src/RouteGroup';

registerSuite({
	name: 'RouteGroup',

	'#match()'(): void {
		const defaultRoute = new DefaultRoute({
			enter() {}
		});
		const route = new Route({
			path: 'test/',
			enter() {}
		});
		const group = new RouteGroup({
			path: '/',
			routes: [ route ],
			defaultRoute: defaultRoute
		});

		assert.strictEqual(group.match('test').route, route);
		assert.strictEqual(group.match('/test/').route, route);
		assert.strictEqual(group.match('nonsense').route, defaultRoute);
	},

	'#removeRoute()': (function () {
		let childRoute: Route;
		let defaultRoute: DefaultRoute;
		let group: RouteGroup;
		let route: Route;
		let routeGroup: RouteGroup;

		return {
			beforeEach(): void {
				defaultRoute = new DefaultRoute({
					enter() {}
				});
				route = new Route({
					path: 'test/',
					enter() {}
				});
				childRoute = new Route({
					path: 'test/',
					enter() {}
				});
				routeGroup = new RouteGroup({
					path: 'other/',
					routes: [ childRoute ]
				});
				group = new RouteGroup({
					path: '/',
					routes: [
						routeGroup,
						route
					],
					defaultRoute: defaultRoute
				});
			},

			afterEach(): void {
				childRoute = group = route = routeGroup = null;
			},

			'when provided a string argument'(): void {
				group.removeRoute('test/');

				assert.strictEqual(group.match('test/').route, defaultRoute);
				assert.isNull(group.removeRoute('nada/'));

				group.removeRoute('other/test/');
				assert.strictEqual(group.match('other/test/').route, defaultRoute);
			},

			'when provided a `MatchableRoute` argument'(): void {
				group.removeRoute(route);
				assert.isNull(group.removeRoute(route));

				group.removeRoute(childRoute);

				assert.isNull(group.removeRoute(new Route({
					path: 'nada/',
					enter() {}
				})));
			}
		};
	})(),

	'#addRoute()'(): void {
		const group = new RouteGroup({
			path: '/',
			defaultRoute: new DefaultRoute({
				enter() {}
			})
		});
		const route = new Route({
			path: 'test/',
			enter() {}
		});

		assert.isNull(group.addRoute(route));
		assert.strictEqual(group.addRoute(new Route({
			path: 'test/',
			enter() {}
		})), route);
	},

	'#destroy()'(): void {
		const route = new Route({
			path: 'test/',
			enter() {}
		});
		const group = new RouteGroup({
			path: '/',
			routes: [ route ],
			defaultRoute: new DefaultRoute({
				enter() {}
			})
		});

		group.destroy();
		assert.isNull(group.match('test/'));
		assert.isNull(group.addRoute(route));
		assert.isNull(group.removeRoute('test/'));
	}
});
