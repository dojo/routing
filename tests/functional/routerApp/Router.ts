import DefaultRoute from 'src/DefaultRoute';
import Route from 'src/Route';
import RouteGroup from 'src/RouteGroup';
import Router from 'src/Router';
import { CancelableNavigationArgs, RouterSource } from 'src/routing';

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
									path: event.path,
									routerPath: event.routerPath
								});
								event.preventDefault();
							}
						},
						enter(): void {
							paths.push({
								entered: true,
								path: router.current.path,
								routerPath: router.current.routerPath
							});
						}
					})
				],
				defaultRoute: new DefaultRoute({
					enter(): void {
						paths.push({
							entered: true,
							path: router.current.path,
							routerPath: router.current.routerPath
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
							path: router.current.path,
							routerPath: router.current.routerPath
						});
						event.preventDefault();
					}
				},
				enter(): void {
					isLoggedIn = true;
					paths.push({
						entered: true,
						path: router.current.path,
						routerPath: router.current.routerPath
					});
					router.go(router.canceled.path);
				}
			})
		],
		defaultRoute: new DefaultRoute({
			enter(): void {
				paths.push({
					entered: true,
					path: router.current.path,
					routerPath: router.current.routerPath
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
