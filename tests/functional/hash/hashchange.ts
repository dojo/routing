import HashSource from 'src/HashSource';

interface HashEvent {
	hash: string;
	path: string;
}

const events: HashEvent[] = [];
function setHandler(source: HashSource): void {
	source.on('change', function (event: any): void {
		events.push({
			hash: event.hash,
			path: event.path
		});
	});
}

let source = new HashSource('!');
setHandler(source);
source.destroy();

location.hash = '!/noop/';
source.go('!/noop-again/');

setTimeout(function () {
	source = new HashSource();
	setHandler(source);

	location.hash = 'invalid';
	location.hash = '!/first/';
}, 100);

export { events };
