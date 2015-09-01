import Promise from 'dojo-core/Promise';
import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import * as sinon from 'sinon';
import DefaultRoute from 'src/DefaultRoute';
import { RouterSource } from 'src/interfaces';
import Route from 'src/Route';
import Router from 'src/Router';

let sourceDestroy: any;
let sourceGo: any;
function getSource(): RouterSource {
	sourceDestroy = sinon.spy();
	sourceGo = sinon.spy();

	return {
		currentPath: '/',

		destroy: sourceDestroy,
		go: sourceGo
	};
}

registerSuite({
	name: 'Router',

	'#constructor()'(): void {
		const route = new Route({
			path: '/path',
			enter: function () {}
		});
		const router = new Router({
			path: '/',
			routes: [ route ]
		});

		assert.equal(router.path, '/');
	},

	'#destroy()'(): void {
		const enter = sinon.spy();
		const source = getSource();
		const route = new Route({
			path: '/path',
			enter: enter
		});
		const router = new Router({
			path: '/',
			routes: [ route ],
			source: source
		});

		router.destroy();
		router.go('/path');

		assert.isFalse(enter.called);
		assert.isTrue(sourceDestroy.called);
	},

	'#go()': {
		'basic routing'(): Promise<void> {
			const change = sinon.spy();
			const enter1 = sinon.spy();
			const enter2 = sinon.spy();
			const exit = sinon.spy();
			const router = new Router({
				path: '/',
				source: getSource(),
				routes: [
					new Route({ path: '/some/{path}', enter: enter1, exit: exit }),
					new Route({ path: '/other/{path}', change: change, enter: enter2 })
				]
			});

			return router.go('/some/value')
				.then(function () {
					assert.isTrue(enter1.called);
					assert.isTrue(sourceGo.called);
				})
				.then(function () {
					sourceGo.reset();
					return router.go('/other/value');
				})
				.then(function () {
					assert.isTrue(exit.called);
					assert.isTrue(enter2.called);
					assert.isTrue(sourceGo.called);

					enter2.reset();
					sourceGo.reset();
					return router.go('/other/value');
				})
				.then(function () {
					assert.isFalse(enter2.called);
					assert.isFalse(sourceGo.called);

					return router.go('other/value2');
				})
				.then(function () {
					assert.isTrue(change.called);
					assert.isFalse(enter2.called);
				});
		},

		'default route'(): Promise<void> {
			const enter = sinon.spy();
			const router = new Router({
				path: '/',
				source: getSource(),
				defaultRoute: new DefaultRoute({
					enter: enter
				})
			});

			return router.go('/nonsensical')
				.then(function () {
					assert.isTrue(enter.called);
				});
		},

		'error handling'(): Promise<void> {
			const router = new Router({
				path: '/',
				source: getSource(),
				routes: [
					new Route({ path: '/some/{path}', enter() {} }),
				]
			});

			return router.go('/nonsensical')
				.then(undefined, function (error: any) {
					assert.strictEqual(error.name, 'MissingRouteError');
				});
		}
	},

	'canceling routing': {
		beforeEnter(): Promise<void> {
			const enter = sinon.spy();
			const router = new Router({
				path: '/',
				source: getSource(),
				routes: [
					new Route({
						path: '/some/{path}',
						enter: enter,
						beforeEnter: function (event: any): void {
							event.preventDefault();
						}
					})
				]
			});

			return router.go('/some/value').then(undefined, function (error: any) {
				assert.isFalse(enter.called);
				assert.isFalse(sourceGo.called);
				assert.strictEqual(error.name, 'CancelNavigationError');
			});
		},

		beforeExit(): Promise<void> {
			const beforeEnter = sinon.spy();
			const enter = sinon.spy();
			const exit = sinon.spy();
			const router = new Router({
				path: '/',
				routes: [
					new Route({
						path: '/some/{path}',
						enter: function () {},
						exit: exit,
						beforeExit: function (event: any): void {
							event.preventDefault();
						}
					}),

					new Route({
						path: '/other',
						beforeEnter: beforeEnter,
						enter: enter
					})
				],
				source: getSource()
			});

			return router.go('/some/value')
				.then(function () {
					return router.go('/other');
				})
				.then(undefined, function (error: any) {
					assert.isFalse(exit.called);
					assert.isFalse(beforeEnter.called);
					assert.isFalse(enter.called);
				});
		},

		'custom error'(): Promise<void> {
			const testError = new Error('test');
			const router = new Router({
				path: '/',
				source: getSource(),
				routes: [
					new Route({
						path: '/some/{path}',
						enter() {},
						beforeEnter(event: any): void {
							throw testError;
						}
					})
				]
			});

			return router.go('some/value/').catch(function (error: any): void {
				assert.strictEqual(error, testError);
			});
		}
	},

	events: {
		change(): void {
			const dfd = this.async();
			const router = new Router({
				path: '/',
				routes: [
					new Route({ path: '/path/{id}', enter: function () {} })
				],
				source: getSource()
			});

			router.on('change', dfd.callback(function (event: any): void {
				assert.strictEqual(event.path, 'path/42/');
				assert.strictEqual(Number(event.state.id), 42);
			}));
			router.go('/path/42');
		},

		beforechange(): void {
			const dfd = this.async();
			const enter = sinon.spy();
			const router = new Router({
				path: '/',
				routes: [
					new Route({ path: '/path', enter: enter })
				],
				source: getSource()
			});

			router.on('beforechange', function (event: any) {
				event.preventDefault();
			});
			router.go('/path');

			setTimeout(dfd.callback(function () {
				assert.isFalse(enter.called);
			}));
		},

		cancel(): void {
			const dfd = this.async();
			const enter = sinon.spy();
			const router = new Router({
				path: '/',
				routes: [
					new Route({
						path: '/path/{id}',
						enter: enter,
						beforeEnter(event: any) {
							event.preventDefault();
						}
					})
				],
				source: getSource()
			});

			router.on('cancel', dfd.callback(function (event: any): void {
				assert.strictEqual(event.path, 'path/42/');
				assert.strictEqual(Number(event.state.id), 42);
				assert.isFalse(enter.called);
			}));
			router.go('/path/42');
		},

		error(): void {
			const dfd = this.async();
			const testError = new Error('test');
			const router = new Router({
				path: '/',
				source: getSource(),
				routes: [
					new Route({
						path: '/some/{path}',
						enter() {},
						beforeEnter(event: any): void {
							throw testError;
						}
					})
				]
			});

			router.on('error', dfd.callback(function (event: any) {
				assert.strictEqual(event.error, testError);
			}));
			router.go('some/value/');
		}
	}
});
