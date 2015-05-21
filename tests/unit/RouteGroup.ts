import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import DefaultRoute from 'src/DefaultRoute';
import Route from 'src/Route';
import RouteGroup from 'src/RouteGroup';
import { NavigationArgs } from 'src/routing';

registerSuite({
	name: 'RouteGroup',

	'#match()'(): void {
		const group = new RouteGroup({
			path: 'path/{id}/',
			routes: [
				new Route({
					path: 'edit/',
					enter() {}
				})
			],
			defaultRoute: new DefaultRoute({
				enter() {}
			})
		});
		let args: NavigationArgs;

		assert.isNull(group.match('other/'));

		args = group.match('path/123/');
		assert.isNotNull(args);
		assert.strictEqual(args.route, group.defaultRoute);

		args = group.match('path/123/edit');
		assert.isNotNull(args);
		assert.strictEqual(args.route, group.routes[0]);
	}
});
