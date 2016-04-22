import createRoute, { Route } from './createRoute';
import createRouter from './createRouter';
import { Context, Parameters } from './interfaces';

const context: Context = {};

defaultRoot();
withPath();
withDefaultParameters();
withTypedParameters();

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
		pathname: '/foo',
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
		pathname: '/posts/:category/:id',
		exec ({ params }) {
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
	}));

	router.dispatch(context, path = '/posts/answers/42');
	router.dispatch(context, path = '/posts/answers/-42');
}
