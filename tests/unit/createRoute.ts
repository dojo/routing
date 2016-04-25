import { suite, test } from 'intern!tdd';
import * as assert from 'intern/chai!assert';

import createRoute, { DefaultParameters, Route } from '../../src/createRoute';
import { Context as C, Request, Parameters } from '../../src/interfaces';

interface R extends Request<Parameters> {};

suite('createRoute', () => {
	test('can create route without options', () => {
		assert.doesNotThrow(() => {
			createRoute();
		});
	});

	test('exec() can be customized', () => {
		let wasCustomized = false;
		createRoute({
			exec (request: R) {
				wasCustomized = true;
			}
		}).exec({} as R);
		assert.isTrue(wasCustomized);
	});

	test('if not customized, exec() is a noop', () => {
		assert.doesNotThrow(() => {
			createRoute().exec({} as R);
		});
	});

	test('index() can be specified', () => {
		assert.isUndefined(createRoute().index);
		const index = () => {};
		assert.strictEqual(createRoute({ index }).index, index);
	});

	test('guard() can be customized', () => {
		let wasCustomized = false;
		createRoute({
			guard (request: R) {
				return wasCustomized = true;
			}
		}).guard({} as R);
		assert.isTrue(wasCustomized);
	});

	test('if not customized, guard() returns true', () => {
		assert.isTrue(createRoute().guard({} as R));
	});

	test('a route is not matched if guard() returns false', () => {
		const route = createRoute({
			guard () {
				return false;
			}
		});

		const selections = route.select({} as C, []);
		assert.lengthOf(selections, 0);
	});

	test('guard() receives the context', () => {
		const context: C = {};
		let received: C;
		const route = createRoute({
			guard ({ context }: R) {
				received = context;
				return true;
			}
		});

		route.select(context, []);
		assert.strictEqual(received, context);
	});

	test('path must not contain ? or #', () => {
		assert.throws(() => {
			createRoute({ path: '/foo?bar' });
		}, TypeError, 'path must not contain ? or #');

		assert.throws(() => {
			createRoute({ path: '/foo#' });
		}, TypeError, 'path must not contain ? or #');
	});

	test('path parameters are extracted', () => {
		const route = <Route<DefaultParameters>> createRoute({
			path: '/:foo/:bar'
		});
		const [{ params }] = route.select({} as C, ['baz', 'qux']);
		assert.deepEqual(params, {
			foo: 'baz',
			bar: 'qux'
		});
	});

	test('path parameters cannot be named :', () => {
		assert.throws(() => {
			createRoute({ path: '/::' });
		}, TypeError, 'Expecting param to have a name');
	});

	test('path parameters must be named :', () => {
		assert.throws(() => {
			createRoute({ path: '/:/' });
		}, TypeError, 'Expecting param to have a name');
	});

	test('path parameters must be separated by /', () => {
		assert.throws(() => {
			createRoute({ path: '/:foo:bar' });
		}, TypeError, 'Expecting param to be followed by /, got \':\'');
	});

	test('guard() receives the extracted parameters', () => {
		let received: Parameters;
		const route = <Route<DefaultParameters>> createRoute({
			path: '/:foo/:bar',
			guard ({ params }: R) {
				received = params;
				return true;
			}
		});
		route.select({} as C, ['baz', 'qux']);
		assert.deepEqual(received, {
			foo: 'baz',
			bar: 'qux'
		});
	});

	test('parameter extraction can be customized', () => {
		interface Customized {
			upper: string;
			barIsQux: boolean;
		}
		const route = <Route<Customized>> createRoute({
			path: '/:foo/:bar',
			params (foo, bar) {
				return {
					upper: foo.toUpperCase(),
					barIsQux: bar === 'qux'
				};
			}
		});
		const [{ params }] = route.select({} as C, ['baz', 'qux']);
		assert.deepEqual(params, {
			upper: 'BAZ',
			barIsQux: true
		});
	});

	test('parameter extraction cannot be customized if the path doesn\'t contain parameters', () => {
		assert.throws(() => {
			createRoute({
				path: '/foo/bar',
				params (foo, bar) {
					return {};
				}
			});
		}, TypeError, 'Can\'t specify params() if path doesn\'t contain any');
	});

	test('parameter extraction can cause a route not to match', () => {
		const route = createRoute({
			path: '/:foo',
			params () {
				return null;
			}
		});

		const selections = route.select({} as C, ['foo']);
		assert.lengthOf(selections, 0);
	});

	test('without a path, is selected for zero segments', () => {
		const route = createRoute();
		const selections = route.select({} as C, []);
		assert.lengthOf(selections, 1);
		assert.strictEqual(selections[0].route, route);
	});

	test('without a path or nested routes, is not selected for segments', () => {
		const route = createRoute();
		const selections = route.select({} as C, ['foo']);
		assert.lengthOf(selections, 0);
	});

	test('with a path, is selected if segments match', () => {
		const route = createRoute({ path: '/foo/bar' });
		const selections = route.select({} as C, ['foo', 'bar']);
		assert.lengthOf(selections, 1);
		assert.strictEqual(selections[0].route, route);
	});

	test('with a path, is not selected if segments do not match', () => {
		{
			const route = createRoute({ path: '/foo/bar' });
			const selections = route.select({} as C, ['baz', 'qux']);
			assert.lengthOf(selections, 0);
		}

		{
			const route = createRoute({ path: '/foo/bar' });
			const selections = route.select({} as C, ['foo']);
			assert.lengthOf(selections, 0);
		}
	});

	test('selects nested routes', () => {
		const root = createRoute({ path: '/foo' });
		const deep = createRoute({ path: '/bar' });
		const deeper = createRoute({ path: '/baz' });
		root.append(deep);
		deep.append(deeper);

		const selections = root.select({} as C, ['foo', 'bar', 'baz']);
		assert.lengthOf(selections, 3);
		const [{ route: first }, { route: second }, { route: third }] = selections;
		assert.strictEqual(first, root);
		assert.strictEqual(second, deep);
		assert.strictEqual(third, deeper);
	});

	test('selects nested routes in order of registration', () => {
		{
			const root = createRoute({ path: '/foo' });
			const deep = createRoute({ path: '/bar' });
			const altDeep = createRoute({ path: '/bar/baz' });
			const deeper = createRoute({ path: '/baz' });
			root.append(deep);
			root.append(altDeep);
			deep.append(deeper);

			const selections = root.select({} as C, ['foo', 'bar', 'baz']);
			assert.lengthOf(selections, 3);
		}

		{
			const root = createRoute({ path: '/foo' });
			const deep = createRoute({ path: '/bar' });
			const altDeep = createRoute({ path: '/bar/baz' });
			const deeper = createRoute({ path: '/baz' });
			root.append(altDeep);
			root.append(deep);
			deep.append(deeper);

			const selections = root.select({} as C, ['foo', 'bar', 'baz']);
			assert.lengthOf(selections, 2);
		}
	});

	test('leading slashes are irrelevant', () => {
		const root = createRoute({ path: 'foo' });
		const deep = createRoute({ path: '/bar' });
		const deeper = createRoute({ path: 'baz' });
		root.append(deep);
		deep.append(deeper);

		const selections = root.select({} as C, ['foo', 'bar', 'baz']);
		assert.lengthOf(selections, 3);
	});

	test('trailing slashes are irrelevant', () => {
		const root = createRoute({ path: '/foo/' });
		const deep = createRoute({ path: '/bar/' });
		const deeper = createRoute({ path: '/baz/' });
		root.append(deep);
		deep.append(deeper);

		const selections = root.select({} as C, ['foo', 'bar', 'baz']);
		assert.lengthOf(selections, 3);
	});

	test('all segments must match for a route hierarchy to be selected', () => {
		const root = createRoute({ path: 'foo' });
		const deep = createRoute({ path: '/bar' });
		root.append(deep);

		const selections = root.select({} as C, ['foo', 'bar', 'baz']);
		assert.lengthOf(selections, 0);
	});

	test('extracts path parameters for each nested route', () => {
		const root = createRoute({ path: '/foo/:param' });
		const deep = createRoute({ path: '/bar/:param' });
		const deeper = createRoute({ path: '/baz/:param' });
		root.append(deep);
		deep.append(deeper);

		const selections = root.select({} as C, ['foo', 'root', 'bar', 'deep', 'baz', 'deeper']);
		assert.lengthOf(selections, 3);
		const [{ params: first }, { params: second }, { params: third }] = selections;
		assert.deepEqual(first, { param: 'root' });
		assert.deepEqual(second, { param: 'deep' });
		assert.deepEqual(third, { param: 'deeper' });
	});

	test('can append several routes at once', () => {
		const root = createRoute({ path: '/foo' });
		const deep = createRoute({ path: '/bar' });
		const altDeep = createRoute({ path: '/bar/baz' });
		root.append([altDeep, deep]);

		const selections = root.select({} as C, ['foo', 'bar', 'baz']);
		assert.lengthOf(selections, 2);
	});
});
