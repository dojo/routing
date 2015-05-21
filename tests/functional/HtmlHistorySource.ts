import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import * as Suite from 'intern/lib/Suite';
import * as Command from 'leadfoot/Command';
import has from 'src/has';
import HtmlHistorySource from 'src/HtmlHistorySource';

import pollUntil = require('intern/dojo/node!leadfoot/helpers/pollUntil');

function startTest(suite: Suite, path: string, timeout: number = 5000): Command<any> {
	return suite.remote
		.get((<any> require).toUrl(path))
		.then(pollUntil<any>(function () {
			const results: any = (<any> window).routerSourceResults;

			return results.events && results.events.length ? results : undefined;
		}, null, timeout), undefined);
}

function stripPathBase(path: string): string {
	return path.replace('/_build/tests/functional/history/', '').replace('/', '');
}

registerSuite({
	name: 'HtmlHistorySource',

	'on initialize'(): void {
		if (has('history')) {
			this.skip('the following test requires an environment without HTML History support.');
		}

		assert.throw(function () {
			new HtmlHistorySource();
		});
	},

	'basic routing'() {
		return startTest(this, './history/basicRouting.html')
			.then(function (results: any): void {
				const events: any[] = results.events;
				const initialLength = results.initialHistoryLength;

				assert.strictEqual(events.length, 3);

				let event: any;
				event = events[0];
				assert.strictEqual(event.path, '/');
				assert.strictEqual(event.currentPath, event.path);
				assert.strictEqual(event.total, initialLength + 1);
				assert.isNull(event.state);

				event = events[1];
				assert.strictEqual(event.path, '/first/');
				assert.strictEqual(event.currentPath, event.path);
				assert.strictEqual(event.total, initialLength + 2);
				assert.deepEqual(event.state, { name: 'first' });

				event = events[2];
				assert.strictEqual(event.path, '/second/');
				assert.strictEqual(event.currentPath, event.path);
				assert.strictEqual(event.total, initialLength + 3);
				assert.deepEqual(event.state, { name: 'second' });
			}, undefined);
	},

	'popstate'() {
		return startTest(this, './history/popstate.html')
			.then(function (results: any): void {
				const path: any = results.events[0];

				assert.strictEqual(stripPathBase(path), 'noop-again');
			}, undefined);
	}
});
