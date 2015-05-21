import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import PathRule from 'src/PathRule';

registerSuite({
	name: 'PathRule',

	'.normalizePath()'(): void {
		assert.strictEqual(PathRule.normalizePath('/'), '/');
		assert.strictEqual(PathRule.normalizePath(''), '/');
		assert.strictEqual(PathRule.normalizePath('/path/child'), 'path/child/');
		assert.strictEqual(PathRule.normalizePath('/path/{id}'), 'path/{id}/');
	},

	'invalid path'(): void {
		assert.throws(function () {
			new PathRule('');
		});
		assert.throws(function () {
			new PathRule('/some/{path}/child/{path}');
		});
	},

	createPath: {
		'when the supplied object already has a path'(): void {
			const path = '/some/path';
			const rule = new PathRule(path);

			assert.strictEqual(rule.createPath(<any> {
				path: path
			}), 'some/path/');
		},

		'when path is a raw URL'(): void {
			const path = '/some/path';
			const rule = new PathRule(path);

			assert.strictEqual(rule.createPath(<any> {
				state: {
					value1: '1',
					value2: '2'
				}
			}), 'some/path/');
		},

		'when path contains parameters'(): void {
			const path = '/some/{value1}/{value2}';
			const rule = new PathRule(path);

			assert.strictEqual(rule.createPath(<any> {
				state: {
					value1: 'path',
					value2: 'child'
				}
			}), 'some/path/child/');
			assert.throws(function () {
				rule.createPath(<any> {});
			});
			assert.throws(function () {
				rule.createPath(<any> {
					state: {
						value1: 'path'
					}
				});
			});
		}
	},

	getChildPath: {
		'when path is a raw URL'(): void {
			const path = '/some/path';
			const rule = new PathRule(path);

			assert.strictEqual(rule.getChildPath('/some/path/child'), 'child/');
			assert.strictEqual(rule.getChildPath('/path/some'), 'path/some/');
		},

		'when path contains parameters'(): void {
			const path = '/some/{value1}';
			const rule = new PathRule(path);

			assert.strictEqual(rule.getChildPath('/some/child'), '/');
			assert.strictEqual(rule.getChildPath('/some/child/path'), 'path/');
			assert.strictEqual(rule.getChildPath('/path/some'), 'path/some/');
		}
	},

	parsePath: {
		'when path is a raw URL'(): void {
			const path = '/some/path';
			const rule = new PathRule(path);
			const parsed = rule.parsePath('/some/path/child');

			assert.strictEqual(parsed.rest, 'child/');
			assert.strictEqual(parsed.path, 'some/path/child/');
			assert.strictEqual(Object.keys(parsed).length, 3);
			assert.throws(function () {
				rule.parsePath('');
			});
		},

		'when path contains parameters'(): void {
			const path = '/some/{value}';
			const rule = new PathRule(path);
			const parsed = rule.parsePath('/some/child/path');

			assert.strictEqual(parsed.rest, 'path/');
			assert.strictEqual(parsed.path, 'some/child/path/');
			assert.strictEqual((<any> parsed.state).value, 'child');
			assert.throws(function () {
				rule.parsePath('');
			});

			assert.isNull(rule.parsePath('/some'));
		},

		'when path does not match'() {
			let rule = new PathRule('/some/{value}');
			assert.isNull(rule.parsePath('/other'));

			rule = new PathRule('/some');
			assert.isNull(rule.parsePath('/other'));
		}
	},

	test: {
		'when path is a raw URL'(): void {
			const path = '/some/path';
			const rule = new PathRule(path);

			assert.isTrue(rule.test('/some/path'));
			assert.isTrue(rule.test('/some/path/child'));
			assert.isTrue(rule.test(<any> { rest: 'some/path/', state: {} }));
			assert.isFalse(rule.test(''));
			assert.isFalse(rule.test(<any> { state: {} }));
			assert.isFalse(rule.test('/some/other/path'));
		},

		'when path contains parameters'(): void {
			const path = '/some/{value}';
			const rule = new PathRule(path);

			assert.isTrue(rule.test('/some/path'));
			assert.isTrue(rule.test('/some/path/child'));
			assert.isTrue(rule.test('/some/other/path'));
			assert.isFalse(rule.test(''));
			assert.isTrue(rule.test(<any> { rest: 'some/path/', state: {} }));
			assert.isTrue(rule.test(<any> { state: { value: 'path' } }));
			assert.isFalse(rule.test(<any> { state: {} }));
		},

		'when path is "/"'(): void {
			const rule = new PathRule('/');

			assert.isTrue(rule.test(''));
			assert.isTrue(rule.test('/'));
			assert.isTrue(rule.test('12345/asdg2@:'));
			assert.isTrue(rule.test('[[\]{}()|/\\^$.*+?]'));
		}
	}
});
