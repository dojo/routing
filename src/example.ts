import createRoute, { Route, Parameters } from './createRoute';

try {
	missingOptions();
} catch (err) {
	console.error('missingOptions threw', err);
}

withPath();
withDefaultParameters();
withTypedParameters();

function missingOptions () {
	createRoute();
}

function withPath () {
	const route = createRoute({ pathname: '/foo' });
	if (route.match('/foo').matched) {
		console.log('/foo matched');
	}
	if (route.match('/bar').matched) {
		console.log('/bar matched, which is bad!');
	}
}

function withDefaultParameters () {
	const route = createRoute({
		pathname: '/posts/:category/:id',
		exec ({ params }) {
			console.log('withDefaultParameters', params['category'], params['id']);
		}
	});

	['/posts/answers/42', '/posts/answers/-42'].forEach(path => {
		const { matched, params } = route.match(path);
		if (matched) {
			route.exec({ params });
		}
	});
}

function withTypedParameters () {
	// FIXME: Can we use Number.isInteger instead?
	function isInteger (value: number): boolean {
		return isFinite(value) && Math.floor(value) === value;
	}

	interface PostParams extends Parameters {
		category: string;
		id: number;
	}
	const route: Route<PostParams> = createRoute({
		pathname: '/posts/:category/:id',
		params (category: string, id: string) {
			const numericId: number = parseFloat(id);
			if (!isInteger(numericId) || numericId <= 0) {
				return null;
			}
			return { category, id: numericId };
		},
		exec ({ params }) {
			console.log('withTypedParameters', params.category, params.id);
		}
	});

	['/posts/answers/42', '/posts/answers/-42'].forEach(path => {
		const { matched, params } = route.match(path);
		if (matched) {
			route.exec({ params });
		}
	});
}
