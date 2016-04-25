import createRoute, { DefaultParameters, Route } from './createRoute';
import createRouter from './createRouter';
import { Context, Parameters, Request } from './interfaces';

const context: Context = {};

defaultRoot();
withPath();
withDefaultParameters();
withTypedParameters();
nested();

function defaultRoot () {
	let path = '';
	const router = createRouter();
	router.append(createRoute({
		exec () {
			console.log('matched', path, 'should match /');
		}
	}));

	router.dispatch(context, path = '/');
	router.dispatch(context, path = '/foo');
}

function withPath () {
	let path = '';
	const router = createRouter();
	router.append(createRoute({
		path: '/foo',
		exec () {
			console.log('matched', path, 'should match /foo');
		}
	}));

	router.dispatch(context, path = '/foo');
	router.dispatch(context, path = '/bar');
}

function withDefaultParameters () {
	let path = '';
	const router = createRouter();
	router.append(createRoute({
		path: '/posts/:category/:id',
		exec ({ params }: Request<DefaultParameters>) {
			console.log('withDefaultParameters', params['category'], params['id']);
		}
	}));

	router.dispatch(context, path = '/posts/answers/42');
	router.dispatch(context, path = '/posts/answers/-42');
}

function withTypedParameters () {
	let path = '';
	const router = createRouter();

	// FIXME: Can we use Number.isInteger instead?
	function isInteger (value: number): boolean {
		return isFinite(value) && Math.floor(value) === value;
	}

	interface PostParams extends Parameters {
		category: string;
		id: number;
	}
	router.append(<Route<PostParams>> createRoute({
		path: '/posts/:category/:id',
		params (raw: string[]) {
			const [category, id] = raw;
			const numericId: number = parseFloat(id);
			if (!isInteger(numericId) || numericId <= 0) {
				return null;
			}
			return { category, id: numericId };
		},
		exec ({ params }) {
			console.log('withTypedParameters', params.category, params.id);
		}
	}));

	router.dispatch(context, path = '/posts/answers/42');
	router.dispatch(context, path = '/posts/answers/-42');
}

function nested () {
	const router = createRouter();
	const foo = createRoute({ path: '/foo' });
	const bar = createRoute({
		path: '/bar',
		exec () {
			console.log('/foo/bar yay!');
		}
	});
	foo.append(bar);
	router.append(foo);

	router.dispatch(context, '/foo/bar');
}
