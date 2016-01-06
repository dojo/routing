import HtmlHistorySource from 'src/HtmlHistorySource';

interface HistoryEvent {
	path: string;
	total: number;
	state: any;
}

const initialHistoryLength: number = window.history.length;
const events: HistoryEvent[] = [];
const source = new HtmlHistorySource();

source.on('change', function (event: any): void {
	events.push({
		currentPath: source.currentPath,
		path: event.path,
		state: window.history.state,
		total: window.history.length
	});
});

// 1. Begin routing, but pushState should not be called.
source.go('/');

// 2. Navigate to "/first". pushState should be called.
source.go('first/', { name: 'first' });

// 3. Navigate again to "/first", but this time nothing should happen.
source.go('first/', { name: 'first' });

// 4. Navigate to "/second". pushState should be called.
source.go('second/', { name: 'second' });

export { events, initialHistoryLength };
