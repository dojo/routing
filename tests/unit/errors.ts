import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import * as sinon from 'sinon';
import CancelNavigationError from 'src/errors/CancelNavigationError';
import PathRuleError from 'src/errors/PathRuleError';

registerSuite({
	name: 'errors',

	'CancelNavigationError'(): void {
		let error = new CancelNavigationError('test');
		assert.strictEqual(error.name, 'CancelNavigationError');
		assert.strictEqual(error.message, 'test');

		error = new CancelNavigationError();
		assert.strictEqual(error.message, '');
	},

	'PathRuleError'(): void {
		let error = new PathRuleError('test');
		assert.strictEqual(error.name, 'PathRuleError');
		assert.strictEqual(error.message, 'test');

		error = new PathRuleError();
		assert.strictEqual(error.message, '');
	}
});
