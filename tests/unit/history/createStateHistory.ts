import compose from 'dojo-compose/compose';
import createEvented, { Evented } from 'dojo-compose/mixins/createEvented';
import { emit } from 'dojo-core/on';
import Promise from 'dojo-core/Promise';
import { afterEach, beforeEach, suite, test } from 'intern!tdd';
import * as assert from 'intern/chai!assert';

import createStateHistory from '../../../src/history/createStateHistory';

suite('createStateHistory', () => {
	// Mask the globals so tests are forced to explicitly reference the
	// correct window.
	/* tslint:disable */
	const history: void = null;
	const location: void = null;
	/* tslint:enable */

	let sandbox: HTMLIFrameElement;
	beforeEach(() => {
		sandbox = document.createElement('iframe');
		sandbox.src = '/tests/support/sandbox.html';
		document.body.appendChild(sandbox);
		return new Promise(resolve => {
			sandbox.addEventListener('load', resolve);
		});
	});

	afterEach(() => {
		document.body.removeChild(sandbox);
		sandbox = null;
	});

	test('initializes current path to current location', () => {
		sandbox.contentWindow.history.pushState({}, '', '/foo?bar');
		assert.equal(createStateHistory({ window: sandbox.contentWindow }).current, '/foo?bar');
	});

	test('location defers to the global object', () => {
		assert.equal(createStateHistory().current, window.location.pathname + window.location.search);
	});

	test('history defers to the global object', () => {
		assert.equal(createStateHistory()._history, window.history);
	});

	test('update path', () => {
		const history = createStateHistory({ window: sandbox.contentWindow });
		history.set('/foo');
		assert.equal(history.current, '/foo');
		assert.equal(sandbox.contentWindow.location.pathname, '/foo');
	});

	test('emits change when path is updated', () => {
		const history = createStateHistory({ window: sandbox.contentWindow });
		let emittedValue = '';
		history.on('change', ({ value }) => {
			emittedValue = value;
		});
		history.set('/foo');
		assert.equal(emittedValue, '/foo');
	});

	test('replace path', () => {
		const history = createStateHistory({ window: sandbox.contentWindow });
		history.replace('/foo');
		assert.equal(history.current, '/foo');
		assert.equal(sandbox.contentWindow.location.pathname, '/foo');
	});

	test('emits change when path is replaced', () => {
		const history = createStateHistory({ window: sandbox.contentWindow });
		let emittedValue = '';
		history.on('change', ({ value }) => {
			emittedValue = value;
		});
		history.replace('/foo');
		assert.equal(emittedValue, '/foo');
	});

	test('does not add a new history entry when path is replaced', () => {
		const { length } = sandbox.contentWindow.history;
		assert.isTrue(length < 49, 'Too many history entries to run this test. Please open a new browser window');

		const history = createStateHistory({ window: sandbox.contentWindow });
		history.replace('/baz');
		assert.equal(sandbox.contentWindow.history.length, length);
	});

	suite('popstate', () => {
		let window: Window & Evented;

		beforeEach(() => {
			const { history, location } = sandbox.contentWindow;
			const createFauxWindow = compose(<Window> { history, location }).mixin(createEvented);
			window = createFauxWindow();
		});

		test('handles popstate', () => {
			const history = createStateHistory({ window });

			let emittedValue = '';
			history.on('change', ({ value }) => {
				emittedValue = value;
			});

			sandbox.contentWindow.history.pushState({}, '', '/foo');
			emit(window, { type: 'popstate' });

			assert.equal(history.current, '/foo');
			assert.equal(emittedValue, '/foo');
		});

		test('ignores popstate for the current path', () => {
			const history = createStateHistory({ window });

			sandbox.contentWindow.history.pushState({}, '', '/foo');
			emit(window, { type: 'popstate' });

			history.on('change', () => {
				throw new Error('Should not emit change for popstate events for the current path');
			});
			emit(window, { type: 'popstate' });
		});

		test('stops listening to popstate when destroyed', () => {
			const history = createStateHistory({ window });
			assert.equal(history.current, '/tests/support/sandbox.html');

			history.destroy();
			sandbox.contentWindow.history.pushState({}, '', '/foo');
			emit(window, { type: 'popstate' });

			assert.equal(history.current, '/tests/support/sandbox.html');
		});
	});
});
