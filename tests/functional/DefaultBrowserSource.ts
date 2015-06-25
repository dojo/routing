import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import * as Suite from 'intern/lib/Suite';
import * as Command from 'leadfoot/Command';
import DefaultBrowserSource from 'src/DefaultBrowserSource';

import pollUntil = require('intern/dojo/node!leadfoot/helpers/pollUntil');

function testEndsWith(path: string, ending: string, message?: string): void {
	assert.strictEqual(path.indexOf(ending), path.length - ending.length, message);
}

registerSuite({
	name: 'DefaultBrowserSource',

	'basic routing'(): Command<void> {
		return this.remote
			.get((<any> require).toUrl('./default/first.html'))
			.then(pollUntil<any>(function () {
				return (<any> window).defaultBrowserSource.currentPath;
			}, null, 5000), undefined)
			.then(function (path: string): void {
				const message = 'DefaultBrowserSource#currentPath should be location.pathname by default.';
				testEndsWith(path, 'first.html', message);
			})
			.setFindTimeout(5000)
			.findById('second')
			.click()
			.execute(function () {
				return window.location.pathname;
			})
			.then(function (path: string): void {
				testEndsWith(path, 'second.html');
			})
			.then(pollUntil<any>(function () {
				return (<any> window).routerSourceResults;
			}, null, 5000), undefined)
			.then(function (event: any): void {
				testEndsWith(event.path, 'second.html');
				assert.strictEqual(event.currentPath, event.path);
			});
	}
});
