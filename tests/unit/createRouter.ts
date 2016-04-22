import { suite, test } from 'intern!tdd';
import * as assert from 'intern/chai!assert';

import createRoute from '../../src/createRoute';
import createRouter from '../../src/createRouter';
import { Context as C, Request, Parameters } from '../../src/interfaces';

interface R extends Request<Parameters> {};

suite('createRouter', () => {
	test('dispatch returns false if no route was executed', () => {
		assert.isFalse(createRouter().dispatch({} as C, '/'));
	});

	test('dispatch returns true if a route was executed', () => {
		const router = createRouter();
		router.append(createRoute());
		assert.isTrue(router.dispatch({} as C, '/'));
	});

	test('dispatch executes selected routes, providing context and extracted parameters', () => {
		const execs: { context: C, params: Parameters }[] = [];

		const context = {} as C;
		const router = createRouter();
		const root = createRoute({
			path: '/:foo',
			exec ({ context, params }) {
				execs.push({ context, params });
			}
		});
		const deep = createRoute({
			path: '/:bar',
			exec ({ context, params }) {
				execs.push({ context, params });
			}
		});
		router.append(root);
		root.append(deep);

		router.dispatch(context, '/root/deep');

		assert.lengthOf(execs, 2);
		assert.strictEqual(execs[0].context, context);
		assert.strictEqual(execs[1].context, context);
		assert.deepEqual(execs[0].params, { foo: 'root' });
		assert.deepEqual(execs[1].params, { bar: 'deep' });
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

		router.dispatch({} as C, '/foo');
		assert.deepEqual(order, ['first', 'second']);
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

		router.dispatch({} as C, '/foo');
		assert.deepEqual(order, ['first', 'second']);
	});

	test('leading slashes are irrelevant', () => {
		const router = createRouter();
		const root = createRoute({ path: '/foo' });
		const deep = createRoute({ path: 'bar' });
		const deeper = createRoute({ path: 'baz' });
		root.append(deep);
		deep.append(deeper);
		router.append(root);

		assert.isTrue(router.dispatch({} as C, 'foo/bar/baz'));
	});

	test('trailing slashes are irrelevant', () => {
		const router = createRouter();
		const root = createRoute({ path: 'foo' });
		const deep = createRoute({ path: 'bar' });
		const deeper = createRoute({ path: 'baz' });
		root.append(deep);
		deep.append(deeper);
		router.append(root);

		assert.isTrue(router.dispatch({} as C, 'foo/bar/baz/'));
	});

	test('search components are ignored', () => {
		const router = createRouter();
		router.append(createRoute({ path: '/foo' }));

		assert.isTrue(router.dispatch({} as C, '/foo?bar'));
	});

	test('hash components are ignored', () => {
		const router = createRouter();
		router.append(createRoute({ path: '/foo' }));

		assert.isTrue(router.dispatch({} as C, '/foo#bar'));
	});

	test('query & hash components are ignored', () => {
		const router = createRouter();
		router.append(createRoute({ path: '/foo' }));

		assert.isTrue(router.dispatch({} as C, '/foo?bar#baz'));
	});
});
