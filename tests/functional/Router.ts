import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import * as Suite from 'intern/lib/Suite';
import * as Command from 'leadfoot/Command';

import pollUntil = require('intern/dojo/node!leadfoot/helpers/pollUntil');

function startTest(suite: Suite, path: string, timeout: number = 5000): Command<any> {
	return suite.remote
		.get((<any> require).toUrl(path))
		.then(pollUntil<any>(function () {
			return (<any> window).routerSourceResults;
		}, null, timeout), undefined);
}

function testPaths(events: any): void {
	if (events === 'skip') {
		return;
	}

	let event: any = events[0];
	assert.strictEqual(event.matched, 'login/');
	assert.strictEqual(event.path, 'login/');
	assert.isTrue(event.entered);

	event = events[1];
	assert.strictEqual(event.matched, '/');
	assert.strictEqual(event.path, '/');
	assert.isTrue(event.entered);

	event = events[2];
	assert.strictEqual(event.matched, '/');
	assert.strictEqual(event.path, 'articles/');
	assert.isTrue(event.entered);

	event = events[3];
	assert.strictEqual(event.matched, 'article/');
	assert.strictEqual(event.path, 'articles/article/');
	assert.isFalse(event.entered);

	event = events[4];
	assert.strictEqual(event.matched, '12345/');
	assert.strictEqual(event.path, 'articles/12345/');
	assert.isTrue(event.entered);
}

registerSuite({
	name: 'Router',

	'history routing'() {
		return startTest(this, './routerApp/HtmlHistoryRouter.html')
			.then(testPaths, undefined);
	},

	'hash routing'() {
		return startTest(this, './routerApp/HashRouter.html')
			.then(testPaths, undefined);
	}
});
