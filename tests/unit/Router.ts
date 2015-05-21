import Promise from 'dojo-core/Promise';
import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import * as sinon from 'sinon';
import DefaultRoute from 'src/DefaultRoute';
import Route from 'src/Route';
import Router from 'src/Router';
import { NavigationArgs, RouterSource } from 'src/routing';

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
		assert.throw(function () {
			new Router({
				path: '/',
				routes: [],
				source: getSource()
			});
		});

		const route = new Route({
			path: '/path',
			enter: function () {}
		});
		const router = new Router({
			path: '/',
			routes: [ route ]
		});

		assert.equal(route.parent, router);
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
			const error = sinon.spy();
			const router = new Router({
				path: '/',
				error: error,
				source: getSource(),
				routes: [
					new Route({ path: '/some/{path}', enter: function () {} }),
				]
			});

			return router.go('/nonsensical')
				.then(function () {
					assert.isTrue(error.called);
				});
		}
	},

	'#run()': {
		'Router#path'(): Promise<void> {
			const enter = sinon.spy();
			const router = new Router({
				path: '/',
				source: getSource(),
				defaultRoute: new DefaultRoute({
					enter: enter
				})
			});

			return router.run()
				.then(function () {
					assert.isTrue(enter.called);

					enter.reset();
					return router.run();
				})
				.then(function () {
					assert.isFalse(enter.called);
				});
		},

		'Router#source#currentPath'(): Promise<void> {
			const enter = sinon.spy();
			const router = new Router({
				path: '/',
				source: getSource(),
				defaultRoute: new DefaultRoute({
					enter: enter
				})
			});

			return router.run(false)
				.then(function () {
					assert.isTrue(enter.called);
					assert.strictEqual(router.current.path, router.source.currentPath);
				});
		}
	},

	'canceling routing': {
		beforeEnter(): Promise<void> {
			const enter = sinon.spy();

			let errorName: string;
			const error = function (error: any): void {
				errorName = error.name;
			};
			const router = new Router({
				path: '/',
				error: error,
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

			return router.go('/some/value').then(function () {
				assert.isFalse(enter.called);
				assert.isFalse(sourceGo.called);
				assert.equal(errorName, 'CancelNavigationError');
			});
		},

		beforeExit(): Promise<void> {
			const beforeEnter = sinon.spy();
			const enter = sinon.spy();
			const exit = sinon.spy();
			const error = sinon.spy();
			const router = new Router({
				path: '/',
				error: error,
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
				.then(function () {
					assert.isFalse(exit.called);
					assert.isFalse(beforeEnter.called);
					assert.isFalse(enter.called);
					assert.isTrue(error.called);
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
		}
	}
});
