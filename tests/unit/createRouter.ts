import Promise from 'dojo-shim/Promise';
import { suite, test } from 'intern!tdd';
import * as assert from 'intern/chai!assert';
import { stub } from 'sinon';

import createRoute from '../../src/createRoute';
import createRouter, { NavigationStartEvent } from '../../src/createRouter';
import createMemoryHistory from '../../src/history/createMemoryHistory';
import { DefaultParameters, Context as C, Request, Parameters } from '../../src/interfaces';

interface R extends Request<Parameters> {};

suite('createRouter', () => {
	test('dispatch resolves to false if no route was executed', () => {
		return createRouter().dispatch({} as C, '/').then(d => {
			assert.isFalse(d);
		});
	});

	test('dispatch resolves to true if a route was executed', () => {
		const router = createRouter();
		router.append(createRoute());
		return router.dispatch({} as C, '/').then(d => {
			assert.isTrue(d);
		});
	});

	test('dispatch rejects when errors occur', () => {
		const err = {};
		const router = createRouter();
		router.append(createRoute({ exec () { throw err; }}));
		return router.dispatch({} as C, '/').then(() => {
			assert.fail('Should not be called');
		}, actual => {
			assert.strictEqual(actual, err);
		});
	});

	test('dispatch executes selected routes, providing context and extracted parameters', () => {
		const execs: { context: C, params: Parameters }[] = [];

		const context = {} as C;
		const router = createRouter();
		const root = createRoute({
			path: '/{foo}',
			exec ({ context, params }) {
				execs.push({ context, params });
			}
		});
		const deep = createRoute({
			path: '/{bar}',
			exec ({ context, params }) {
				execs.push({ context, params });
			}
		});
		router.append(root);
		root.append(deep);

		return router.dispatch(context, '/root/deep').then(() => {
			assert.lengthOf(execs, 2);
			assert.strictEqual(execs[0].context, context);
			assert.strictEqual(execs[1].context, context);
			assert.deepEqual(execs[0].params, { foo: 'root' });
			assert.deepEqual(execs[1].params, { bar: 'deep' });
		});
	});

	test('dispatch calls index() on the final selected route, providing context and extracted parameters', () => {
		const calls: { method: string, context: C, params: Parameters }[] = [];

		const context = {} as C;
		const router = createRouter();
		const root = createRoute({
			path: '/{foo}',
			exec ({ context, params }) {
				calls.push({ method: 'exec', context, params });
			}
		});
		const deep = createRoute({
			path: '/{bar}',
			exec ({ context, params }) {
				calls.push({ method: 'exec', context, params });
			},
			index ({ context, params }) {
				calls.push({ method: 'index', context, params });
			}
		});
		router.append(root);
		root.append(deep);

		return router.dispatch(context, '/root/deep').then(() => {
			assert.lengthOf(calls, 2);
			assert.strictEqual(calls[0].method, 'exec');
			assert.strictEqual(calls[1].method, 'index');
			assert.strictEqual(calls[0].context, context);
			assert.strictEqual(calls[1].context, context);
			assert.deepEqual(calls[0].params, { foo: 'root' });
			assert.deepEqual(calls[1].params, { bar: 'deep' });
		});
	});

	test('dispatch calls fallback() on the deepest matching route, providing context and extracted parameters', () => {
		const calls: { method: string, context: C, params: Parameters }[] = [];

		const context = {} as C;
		const router = createRouter();
		const root = createRoute({
			path: '/{foo}',
			exec ({ context, params }) {
				calls.push({ method: 'exec', context, params });
			},
			fallback ({ context, params }) {
				calls.push({ method: 'fallback', context, params });
			}
		});
		router.append(root);

		return router.dispatch(context, '/root/deep').then(() => {
			assert.lengthOf(calls, 1);
			assert.strictEqual(calls[0].method, 'fallback');
			assert.strictEqual(calls[0].context, context);
			assert.deepEqual(calls[0].params, { foo: 'root' });
		});
	});

	test('dispatch selects routes in order of registration', () => {
		const order: string[] = [];

		const router = createRouter();
		router.append(createRoute({
			path: '/foo',
			guard () {
				order.push('first');
				return false;
			}
		}));
		router.append(createRoute({
			path: '/foo',
			exec () {
				order.push('second');
			}
		}));

		return router.dispatch({} as C, '/foo').then(() => {
			assert.deepEqual(order, ['first', 'second']);
		});
	});

	test('dispatch emits navstart event', () => {
		const router = createRouter();

		let received: NavigationStartEvent = null!;
		router.on('navstart', event => {
			received = event;
		});

		router.dispatch({} as C, '/foo');
		assert.equal(received.path, '/foo');
		assert.isNull(received.target);
	});

	test('navstart listeners can synchronously cancel routing', () => {
		const router = createRouter();
		router.append(createRoute({ path: '/foo' }));
		router.on('navstart', event => {
			event.cancel();
		});

		return router.dispatch({} as C, '/foo').then(d => {
			assert.isFalse(d);
		});
	});

	test('navstart listeners can asynchronously cancel routing', () => {
		const router = createRouter();
		router.append(createRoute({ path: '/foo' }));
		router.on('navstart', event => {
			const { cancel } = event.defer();
			Promise.resolve().then(cancel);
		});

		return router.dispatch({} as C, '/foo').then(d => {
			assert.isFalse(d);
		});
	});

	test('navstart listeners can asynchronously resume routing', () => {
		const router = createRouter();
		router.append(createRoute({ path: '/foo' }));
		router.on('navstart', event => {
			const { resume } = event.defer();
			Promise.resolve().then(resume);
		});

		return router.dispatch({} as C, '/foo').then(d => {
			assert.isTrue(d);
		});
	});

	test('all deferring navstart listeners must resume before routing continues', () => {
		const router = createRouter();
		router.append(createRoute({ path: '/foo' }));

		const resumers: {(): void}[] = [];
		router.on('navstart', event => {
			const { resume } = event.defer();
			resumers.push(resume);
		});
		router.on('navstart', event => {
			const { resume } = event.defer();
			resumers.push(resume);
		});

		let dispatched: boolean | undefined = false;
		router.dispatch({} as C, '/foo').then(d => {
			dispatched = d;
		});

		const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

		return Promise.resolve().then(() => {
			assert.isFalse(dispatched);
			(<any> resumers.shift())();
			return delay(10);
		}).then(() => {
			assert.isFalse(dispatched);
			(<any> resumers.shift())();
			return delay(10);
		}).then(() => {
			assert.isTrue(dispatched);
		});
	});

	test('dispatch can be canceled', () => {
		const router = createRouter();

		let executed = false;
		router.append(createRoute({
			path: '/foo',
			exec () { executed = true; }
		}));

		let resume: () => void = <any> undefined;
		router.on('navstart', event => {
			resume = event.defer().resume;
		});

		const task = router.dispatch({} as C, '/foo');
		task.cancel();
		resume();

		return new Promise(resolve => setTimeout(resolve, 10)).then(() => {
			assert.isFalse(executed);
		});
	});

	test('router can be created with a fallback route', () => {
		let received: R;

		const router = createRouter({
			fallback (request) {
				received = request;
			}
		});

		const context = {} as C;
		return router.dispatch(context, '/foo').then(d => {
			assert.isTrue(d);
			assert.ok(received);
			assert.strictEqual(received.context, context);
			assert.deepEqual(received.params, {});
		});
	});

	test('can append several routes at once', () => {
		const order: string[] = [];

		const router = createRouter();
		router.append([
			createRoute({
				path: '/foo',
				guard () {
					order.push('first');
					return false;
				}
			}),
			createRoute({
				path: '/foo',
				exec () {
					order.push('second');
				}
			})
		]);

		return router.dispatch({} as C, '/foo').then(() => {
			assert.deepEqual(order, ['first', 'second']);
		});
	});

	test('leading slashes are irrelevant', () => {
		const router = createRouter();
		const root = createRoute({ path: '/foo' });
		const deep = createRoute({ path: 'bar' });
		const deeper = createRoute({ path: 'baz' });
		root.append(deep);
		deep.append(deeper);
		router.append(root);

		return router.dispatch({} as C, 'foo/bar/baz').then(d => {
			assert.isTrue(d);
		});
	});

	test('if present in route, there must be a trailing slash when selecting', () => {
		return Promise.all([true, false].map(withSlash => {
			const router = createRouter();
			const root = createRoute({ path: '/foo/' });
			const deep = createRoute({ path: '/bar/' });
			const deeper = createRoute({ path: '/baz/' });
			root.append(deep);
			deep.append(deeper);
			router.append(root);

			return router.dispatch({} as C, `foo/bar/baz${withSlash ? '/' : ''}`).then(d => {
				assert.isTrue(d === withSlash, `there is ${withSlash ? 'a' : 'no'} trailing slash`);
			});
		}));
	});

	test('if not present in route, there must not be a trailing slash when selecting', () => {
		return Promise.all([true, false].map(withSlash => {
			const router = createRouter();
			const root = createRoute({ path: '/foo/' });
			const deep = createRoute({ path: '/bar/' });
			const deeper = createRoute({ path: '/baz' });
			root.append(deep);
			deep.append(deeper);
			router.append(root);

			return router.dispatch({} as C, `foo/bar/baz${withSlash ? '/' : ''}`).then(d => {
				assert.isTrue(d !== withSlash, `there is ${withSlash ? 'a' : 'no'} trailing slash`);
			});
		}));
	});

	test('routes can be configured to ignore trailing slash discrepancies', () => {
		return Promise.all([true, false].map(withSlash => {
			const router = createRouter();
			const root = createRoute({ path: '/foo/' });
			const deep = createRoute({ path: '/bar/' });
			const deeper = createRoute({
				path: `/baz${withSlash ? '' : '/'}`,
				trailingSlashMustMatch: false
			});
			root.append(deep);
			deep.append(deeper);
			router.append(root);

			return router.dispatch({} as C, `foo/bar/baz${withSlash ? '/' : ''}`).then(d => {
				assert.isTrue(d, `there is ${withSlash ? 'a' : 'no'} trailing slash`);
			});
		}));
	});

	test('search components are ignored', () => {
		const router = createRouter();
		router.append(createRoute({ path: '/foo' }));

		return router.dispatch({} as C, '/foo?bar').then(d => {
			assert.isTrue(d);
		});
	});

	test('hash components are ignored', () => {
		const router = createRouter();
		router.append(createRoute({ path: '/foo' }));

		return router.dispatch({} as C, '/foo#bar').then(d => {
			assert.isTrue(d);
		});
	});

	test('query & hash components are ignored', () => {
		const router = createRouter();
		router.append(createRoute({ path: '/foo' }));

		return router.dispatch({} as C, '/foo?bar#baz').then(d => {
			assert.isTrue(d, '/foo?bar#baz');

			return router.dispatch({} as C, '/foo#bar?baz');
		}).then(d => {
			assert.isTrue(d);
		});
	});

	test('repeated slashes have no effect', () => {
		const router = createRouter();
		router.append(createRoute({ path: '/foo/bar' }));

		return router.dispatch({} as C, '//foo///bar').then(d => {
			assert.isTrue(d);
		});
	});

	test('query parameters are extracted', () => {
		const router = createRouter();

		let extracted: DefaultParameters = {};
		router.append(createRoute({
			path: '/foo?{bar}&{baz}',
			exec ({ params }) {
				extracted = <DefaultParameters> params;
			}
		}));

		return router.dispatch({} as C, '/foo?bar=1&baz=2').then(d => {
			assert.deepEqual(extracted, {bar: '1', baz: '2'});

			extracted = {};
			return router.dispatch({} as C, '/foo?bar=3#baz=4');
		}).then(d => {
			assert.deepEqual(extracted, {bar: '3'});

			extracted = {};
			return router.dispatch({} as C, '/foo#bar=5?baz=6');
		}).then(d => {
			assert.deepEqual(extracted, {});
		});
	});

	test('#start is a noop if the router was created without a history manager', () => {
		assert.doesNotThrow(() => {
			const listener = createRouter().start();
			listener.pause();
			listener.resume();
			listener.destroy();
		});
	});

	test('#start wires dispatch to a history change event', () => {
		const history = createMemoryHistory();
		const router = createRouter({ history });
		const dispatch = stub(router, 'dispatch');

		router.start({ dispatchCurrent: false });
		history.set('/foo');
		assert.isTrue(dispatch.calledWith({}, '/foo'));
	});

	test('#start returns a pausable handler', () => {
		const history = createMemoryHistory();
		const router = createRouter({ history });
		const dispatch = stub(router, 'dispatch');

		const listener = router.start({ dispatchCurrent: false });
		listener.pause();
		history.set('/foo');
		assert.isFalse(dispatch.called);

		listener.resume();
		history.set('/bar');
		assert.isTrue(dispatch.calledWith({}, '/bar'));
	});

	test('#start can immediately dispatch for the current history value', () => {
		const history = createMemoryHistory({ path: '/foo' });
		const router = createRouter({ history });
		const dispatch = stub(router, 'dispatch');

		router.start({ dispatchCurrent: true });
		assert.isTrue(dispatch.calledWith({}, '/foo'));
	});

	test('#start can be configured not to immediately dispatch for the current history value', () => {
		const history = createMemoryHistory({ path: '/foo' });
		const router = createRouter({ history });
		const dispatch = stub(router, 'dispatch');

		router.start({ dispatchCurrent: false });
		assert.isTrue(dispatch.notCalled);
	});

	test('#start dispatches immediately by default', () => {
		const history = createMemoryHistory({ path: '/foo' });
		const router = createRouter({ history });
		const dispatch = stub(router, 'dispatch');

		router.start();
		assert.isTrue(dispatch.calledOnce);
	});

	test('#start throws if already called', () => {
		const history = createMemoryHistory();
		const router = createRouter({ history });

		function start() {
			router.start();
		};

		start();

		assert.throws(start, /start can only be called once/);
	});

	test('without a provided context, #start dispatches with an empty object as the context', () => {
		const history = createMemoryHistory({ path: '/foo' });
		const router = createRouter({ history });
		const dispatch = stub(router, 'dispatch');

		router.start();
		const { args: [ initialContext ] } = dispatch.firstCall;
		assert.deepEqual(initialContext, {});

		history.set('/bar');
		const { args: [ nextContext ] } = dispatch.secondCall;
		assert.notStrictEqual(nextContext, initialContext);
		assert.deepEqual(nextContext, {});
	});

	test('with a provided context, #start dispatches with that object as the context', () => {
		const context = {};
		const history = createMemoryHistory({ path: '/foo' });
		const router = createRouter({ context, history });
		const dispatch = stub(router, 'dispatch');

		router.start();
		const { args: [ initialContext ] } = dispatch.firstCall;
		assert.strictEqual(initialContext, context);

		history.set('/bar');
		const { args: [ nextContext ] } = dispatch.secondCall;
		assert.strictEqual(nextContext, context);
	});

	test('with a provided context factory, #start dispatches with factory\'s value as the context', () => {
		const contexts = [ { first: true }, { second: true } ];
		const context = () => contexts.shift();
		const history = createMemoryHistory({ path: '/foo' });
		const router = createRouter({ context, history });
		const dispatch = stub(router, 'dispatch');

		router.start();
		const { args: [ initialContext ] } = dispatch.firstCall;
		assert.deepEqual(initialContext, { first: true });

		history.set('/bar');
		const { args: [ nextContext ] } = dispatch.secondCall;
		assert.deepEqual(nextContext, { second: true });
	});
});
