import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import * as Suite from 'intern/lib/Suite';
import * as Command from 'leadfoot/Command';
import has from 'src/has';
import HashSource from 'src/HashSource';

import pollUntil = require('intern/dojo/node!leadfoot/helpers/pollUntil');

function startTest(suite: Suite, path: string, timeout: number = 5000): Command<any> {
	return suite.remote
		.get((<any> require).toUrl(path))
		.then(pollUntil<any>(function () {
			const results: any = (<any> window).routerSourceResults;

			return results && results.events.length ? results : undefined;
		}, null, timeout), undefined);
}

registerSuite({
	name: 'HashSource',

	'on initialize'(): void {
		if (has('host-browser')) {
			this.skip('the following test is meant for non-browser environments.');
		}

		assert.throw(function () {
			new HashSource();
		});
	},

	'basic routing'() {
		return startTest(this, './hash/basicRouting.html')
			.then(function (results: any): void {
				const events: any[] = results.events;
				let event: any;

				event = events[0];
				assert.strictEqual(event.path, '/');
				assert.strictEqual(event.hash, '!/');
				assert.strictEqual(event.currentPath, event.hash);

				event = events[1];
				assert.strictEqual(event.path, '/first/');
				assert.strictEqual(event.hash, '!/first/');
				assert.strictEqual(event.currentPath, event.hash);

				event = events[2];
				assert.strictEqual(event.path, '/second/');
				assert.strictEqual(event.hash, '!/second/');
				assert.strictEqual(event.currentPath, event.hash);

				event = events[3];
				assert.strictEqual(event.path, '/third/');
				assert.strictEqual(event.hash, '/third/');
				assert.strictEqual(event.currentPath, event.hash);
			}, undefined);
	},

	'hashchange'() {
		return startTest(this, './hash/hashchange.html')
			.then(function (results: any): void {
				const event: any = results.events[0];

				assert.strictEqual(event.path, '/first/');
				assert.strictEqual(event.hash, '!/first/');
			}, undefined);
	}
});
