import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import * as sinon from 'sinon';
import { CancelableNavigationArgs } from 'src/interfaces';
import Route from 'src/Route';

registerSuite({
	name: 'Route',

	'#constructor()'(): void {
		const route = new Route({
			path: '/path',
			enter: function (): void {}
		});
		assert.equal(route.path, 'path/');
	},

	'#destroy()'(): void {
		const enter = sinon.spy();
		const route = new Route(<any> {
			beforeEnter: function () {},
			beforeExit: function () {},
			enter: enter,
			exit: function () {},
			path: '/'
		});

		route.destroy();
		route.enter('/');

		assert.isNull(route.beforeEnter);
		assert.isNull(route.beforeExit);
		assert.isNull(route.change);
		assert.isNull(route.exit);
		assert.isFalse(enter.called);
	}
});
