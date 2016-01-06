import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import PathRegistry from 'src/PathRegistry';
import Route from 'src/Route';
import RouteGroup from 'src/RouteGroup';

registerSuite({
	name: 'PathRegistry',

	'testing paths'(): void {
		const edit = new Route({
			path: 'edit/',
			enter: function () {}
		});
		const articles = new RouteGroup({
			path: 'articles/{articleId}/',
			routes: [ edit ]
		});
		const site = new RouteGroup({
			path: 'sites/{siteId}/',
			routes: [ articles ]
		});

		const registry = new PathRegistry(null);
		registry.register(site.rule, site);
		registry.register(function (path) {
			return path === 'edit/';
		}, edit);

		let args = registry.match('sites/12345/articles/67890/');
		assert.isNull(args);

		args = registry.match('sites/12345/articles/67890/edit');
		assert.strictEqual(args.state.siteId, '12345');
		assert.strictEqual(args.state.articleId, '67890');
		assert.strictEqual(args.matched, 'edit/');
		assert.strictEqual(args.route, edit);

		args = registry.match('edit/');
		assert.strictEqual(Object.keys(args.state).length, 0);
		assert.strictEqual(args.matched, 'edit/');
		assert.strictEqual(args.route, edit);
	},

	'register handles'(): void {
		const registry = new PathRegistry(null);
		const route = new Route({ path: 'test/', enter: function () {} });

		const handle = registry.register(route.rule, route);
		assert.strictEqual(handle.route, route);

		handle.destroy();
		assert.isNull(handle.route);
		assert.isNull(registry.match('test/'));
	}
});
