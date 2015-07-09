import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import * as sinon from 'sinon';
import DefaultRoute from 'src/DefaultRoute';

registerSuite({
	name: 'DefaultRoute',

	'lifecycle methods'(): void {
		const enter = sinon.spy();
		const exit = sinon.spy();
		const beforeEnter = sinon.spy();
		const beforeExit = sinon.spy();
		const route = new DefaultRoute(<any> {
			beforeEnter: beforeEnter,
			beforeExit: beforeExit,
			enter: enter,
			exit: exit
		});

		route.beforeEnter(<any> {});
		route.enter('/');
		route.beforeExit(<any> {});
		route.exit();

		assert.isTrue(beforeEnter.called);
		assert.isTrue(enter.called);
		assert.isTrue(beforeExit.called);
		assert.isTrue(exit.called);
	},

	'#destroy()'(): void {
		const enter = sinon.spy();
		const route = new DefaultRoute(<any> {
			beforeEnter: function () {},
			beforeExit: function () {},
			enter: enter,
			exit: function () {}
		});

		route.destroy();
		route.enter('/');

		assert.isNull(route.beforeEnter);
		assert.isNull(route.beforeExit);
		assert.isNull(route.exit);
		assert.isFalse(enter.called);
	}
});
