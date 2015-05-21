import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import DefaultRoute from 'src/DefaultRoute';
import Route from 'src/Route';
import RouteGroup from 'src/RouteGroup';
import RouteManager from 'src/RouteManager';

registerSuite({
	name: 'RouteManager',

	'#constructor()'(): void {
		assert.throw(function () {
			new RouteManager({
				path: '/',
				routes: []
			});
		});

		const manager = new RouteManager({
			path: '/',
			routes: [
				new Route({
					path: 'test/',
					enter() {}
				})
			],
			defaultRoute: new DefaultRoute({
				enter() {}
			})
		});

		assert.strictEqual(manager.defaultRoute.parent, manager);
		assert.strictEqual(manager.routes[0].parent, manager);
	},

	'#removeRoute()': (function () {
		let childRoute: Route;
		let manager: RouteManager;
		let route: Route;
		let routeGroup: RouteGroup;

		return {
			beforeEach(): void {
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
				manager = new RouteManager({
					path: '/',
					routes: [
						// NOTE: Ordering here is important for the test, since `RouteManager#removeRoute('other/test/')`
						// should remove the `RouteGroup` child route, but `RouteManager#removeRoute('test/')` should not.
						routeGroup,
						route
					],
					defaultRoute: new DefaultRoute({
						enter() {}
					})
				});
			},

			afterEach(): void {
				childRoute = manager = route = routeGroup = null;
			},

			'when provided a string argument'(): void {
				manager.removeRoute('test/');
				assert.strictEqual(routeGroup.routes.length, 1);
				assert.strictEqual(manager.routes.length, 1);

				manager.removeRoute('other/test/');
				assert.strictEqual(routeGroup.routes.length, 0);

				assert.isNull(manager.removeRoute('nada/'));
			},

			'when provided a `MatchableRoute` argument'(): void {
				manager.removeRoute(route);
				assert.strictEqual(routeGroup.routes.length, 1);
				assert.strictEqual(manager.routes.length, 1);
				assert.isNull(manager.removeRoute(route));

				manager.removeRoute(childRoute);
				assert.strictEqual(routeGroup.routes.length, 0);

				assert.isNull(manager.removeRoute(new Route({
					path: 'nada/',
					enter() {}
				})));
			}
		};
	})(),

	'#addRoute()'(): void {
		const manager = new RouteManager({
			path: '/',
			defaultRoute: new DefaultRoute({
				enter() {}
			})
		});
		const route = new Route({
			path: 'test/',
			enter() {}
		});

		assert.isNull(manager.addRoute(route));
		assert.strictEqual(manager.routes.length, 1);

		assert.strictEqual(manager.addRoute(new Route({
			path: 'test/',
			enter() {}
		})), route);
		assert.strictEqual(manager.routes.length, 1);
	}
});
