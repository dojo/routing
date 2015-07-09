import DefaultRoute from 'src/DefaultRoute';
import { CancelableNavigationArgs, RouterSource } from 'src/interfaces';
import Route from 'src/Route';
import RouteGroup from 'src/RouteGroup';
import Router from 'src/Router';

interface PathEvent {
	entered: boolean;
	path: string;
}

const paths: PathEvent[] = [];
let isLoggedIn: boolean = false;

function loadRouter(source?: RouterSource): Router {
	const router = new Router({
		path: 'root',
		source: source,
		routes: [
			new RouteGroup({
				path: 'articles',
				routes: [
					new Route({
						path: '{id}',
						beforeEnter(event: CancelableNavigationArgs): void {
							if (isNaN(Number(event.state.id))) {
								paths.push({
									entered: false,
									matched: event.matched,
									path: event.path
								});
								event.preventDefault();
							}
						},
						enter(): void {
							paths.push({
								entered: true,
								matched: router.current.matched,
								path: router.current.path
							});
						}
					})
				],
				defaultRoute: new DefaultRoute({
					enter(): void {
						paths.push({
							entered: true,
							matched: router.current.matched,
							path: router.current.path
						});
					}
				})
			}),
			new Route({
				path: 'login',
				beforeEnter(event: CancelableNavigationArgs): void {
					if (isLoggedIn) {
						paths.push({
							entered: false,
							matched: router.current.matched,
							path: router.current.path
						});
						event.preventDefault();
					}
				},
				enter(): void {
					isLoggedIn = true;
					paths.push({
						entered: true,
						matched: router.current.matched,
						path: router.current.path
					});
					router.go(router.canceled.path);
				}
			})
		],
		defaultRoute: new DefaultRoute({
			enter(): void {
				paths.push({
					entered: true,
					matched: router.current.matched,
					path: router.current.path
				});
			}
		})
	});

	router.on('beforechange', function (event: CancelableNavigationArgs): void {
		if (!isLoggedIn && event.path !== 'login/') {
			event.preventDefault();
			router.go('login');
		}
	});

	return router;
}

export { loadRouter, paths };
