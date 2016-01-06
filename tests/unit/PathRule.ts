import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import PathRule, { normalizePath } from 'src/PathRule';

registerSuite({
	name: 'PathRule',

	'.normalizePath()'(): void {
		assert.strictEqual(normalizePath('/'), '/');
		assert.strictEqual(normalizePath(''), '/');
		assert.strictEqual(normalizePath('/path/child'), 'path/child/');
		assert.strictEqual(normalizePath('/path/{id}'), 'path/{id}/');
	},

	'invalid path'(): void {
		assert.throws(function () {
			new PathRule('/some/{path}/child/{path}');
		});
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

			assert.strictEqual(parsed.matched, 'some/path/child/');
			assert.strictEqual(Object.keys(parsed.state).length, 0);
		},

		'when path contains parameters'(): void {
			const path = '/some/{value}';
			const rule = new PathRule(path);
			const parsed = rule.parsePath('/some/child/path');

			assert.strictEqual(parsed.matched, 'some/child/path/');
			assert.strictEqual((<any> parsed.state).value, 'child');
			assert.strictEqual(Object.keys(parsed.state).length, 1);

			assert.isNull(rule.parsePath('/some'));
		},

		'when path does not match'() {
			let rule = new PathRule('/some/{value}');
			assert.isNull(rule.parsePath('/other'));

			rule = new PathRule('/some');
			assert.isNull(rule.parsePath('/other'));
		}
	}
});
