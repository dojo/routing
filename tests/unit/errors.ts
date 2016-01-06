import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import CancelNavigationError from 'src/errors/CancelNavigationError';
import MissingRouteError from 'src/errors/MissingRouteError';
import PathError from 'src/errors/PathError';

registerSuite({
	name: 'errors',

	'CancelNavigationError'(): void {
		let error = new CancelNavigationError('test');
		assert.strictEqual(error.name, 'CancelNavigationError');
		assert.strictEqual(error.message, 'test');

		error = new CancelNavigationError();
		assert.strictEqual(error.message, '');
	},

	'MissingRouteError'(): void {
		let error = new MissingRouteError('test');
		assert.strictEqual(error.name, 'MissingRouteError');
		assert.strictEqual(error.message, 'test');

		error = new MissingRouteError();
		assert.strictEqual(error.message, '');
	},

	'PathError'(): void {
		let error = new PathError('test');
		assert.strictEqual(error.name, 'PathError');
		assert.strictEqual(error.message, 'test');

		error = new PathError();
		assert.strictEqual(error.message, '');
	}
});
