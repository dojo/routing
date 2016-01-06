import HtmlHistorySource from 'src/HtmlHistorySource';

const initialHistoryLength: number = window.history.length;
const events: string[] = [];

function setHandler(source: HtmlHistorySource): void {
	source.on('change', function (event: any): void {
		if (event.path !== '/first/') {
			events.push(event.path);
		}
	});
}

let source = new HtmlHistorySource();
setHandler(source);
source.destroy();

source.go('noop/');
window.history.pushState({}, null, 'noop-again/');

setTimeout(function () {
	let source = new HtmlHistorySource();
	setHandler(source);

	source.go('first/', { name: 'first' });
	window.history.back();
}, 100);

export { events, initialHistoryLength };
