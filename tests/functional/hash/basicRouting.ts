import HashSource from 'src/HashSource';

interface HashEvent {
	currentPath: string;
	hash: string;
	path: string;
}

const events: HashEvent[] = [];
const source = new HashSource();

const queue: HashEvent[] = [];

source.on('change', function (event: any): void {
	queue.push({
		currentPath: source.currentPath,
		hash: event.hash,
		path: event.path
	});

	if (event.path === '/third/') {
		for (let item of queue) {
			events.push(item);
		}
	}
});

source.go('/');
// Using setTimeout allows time for `hashchange` to be fired.
setTimeout(function () {
	source.go('first/');

	setTimeout(function () {
		source.go('first/');

		setTimeout(function () {
			source.go('second/');

			setTimeout(function () {
				source.prefix = null;
				source.go('third/');
			});
		});
	});
});

export { events };
