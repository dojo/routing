import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import * as sinon from 'sinon';
import DefaultRoute from 'src/DefaultRoute';
import { CancelableNavigationArgs } from 'src/routing';

registerSuite({
	name: 'DefaultRoute',

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
	},

	'#exit()'(): void {
		const exit = sinon.spy();
		const route = new DefaultRoute(<any> {
			enter: function () {},
			exit: exit
		});

		route.exit();
		assert.isTrue(exit.called);
	},

	'#match()'(): void {
		const enter = sinon.spy();
		const route = new DefaultRoute(<any> {
			enter: enter
		});

		assert.isNotNull(route.match('/'));
		assert.isNotNull(route.match('/asd/123/asg'));
		assert.isNotNull(route.match('/asdg-klhasdg'));
	}
});
