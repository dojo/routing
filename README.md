# @dojo/routing

[![Build Status](https://travis-ci.org/dojo/routing.svg?branch=master)](https://travis-ci.org/dojo/routing)
[![codecov.io](https://codecov.io/github/dojo/routing/coverage.svg?branch=master)](https://codecov.io/github/dojo/routing?branch=master)
[![npm version](https://badge.fury.io/js/%40dojo%2Frouting.svg)](https://badge.fury.io/js/%40dojo%2Frouting)

A routing library for Dojo 2 applications.

**WARNING** This is _beta_ software. While we do not anticipate significant changes to the API at this stage, we may feel the need to do so. This is not yet production ready, so you should use at your own risk.

This routing library lets you construct route hierarchies that are matched against URLs. Each selected route can tell the application to materialize a different set of widgets and influence the state of those widgets.

History managers are included. The recommended manager uses `pushState()` and `replaceState()` to [add or modify history entries](https://developer.mozilla.org/en-US/docs/Web/API/History_API#Adding_and_modifying_history_entries). This requires server-side support to work well. The hash-based manager uses the fragment identifier, so can work for static HTML pages. A memory-backed manager is provided for debugging purposes.

 - [Features](#features)
   - [Outlets](#outlets)
   - [Outlet Component Types](#outlet-component-types)
   - [Map Params](#maps-params)
   - [Global Error Outlet](#global-error-outlet)
   - [Route Registration](#route-registration)
   - [Router Context Injection](#router-context-injection)
   - [Link Component](#link-component)
   - [Sample Routing Application](#sample-routing-application)

## Usage

To use `@dojo/routing`, install the package along with its required peer dependencies:

```bash
npm install @dojo/routing

# peer dependencies
npm install @dojo/core
npm install @dojo/has
npm install @dojo/shim
```

## Features

The examples below are provided in TypeScript syntax. The package does work under JavaScript, but for clarity, the examples will only include one syntax.

### Widget Routing

Widgets are a fundamental concept for any Dojo 2 application and as such Dojo 2 Routing provides a collection of components that integrate directly with existing widgets within an application.

These components enable widgets to be registered against a route _without_ requiring any knowledge of the `Router` or `Routes`.

#### Outlets

The primary concept for the routing integration is an `outlet`, a unique identifier associated with the registered application route. Dojo 2 Widgets can then be configured with these outlet identifiers using the `Outlet` higher order component. `Outlet` returns a "new" Widget that can be used like any other widget within a `render` method, e.g. `w(MyFooOutlet, { })`.

Properties can be passed to an `Outlet` widget in the same way as if the original widget was being used. However, all properties are made optional to allow the properties to be injected using the [mapParams](#mapParams) function described below.

The number of widgets that can be mapped to a single outlet identifier is not restricted. All configured widgets for a single outlet will be rendered when the route associated to the outlet is matched by the `router` and the `outlet`s are part of the current widget hierarchy.

The following example configures a stateless widget with an outlet called `foo`. The resulting `FooOutlet` can be used in a widgets `render` in the same way as any other Dojo 2 Widget.

```ts
import { Outlet } from '@dojo/routing/Outlet';
import { MyViewWidget } from './MyViewWidget';

const FooOutlet = Outlet(MyViewWidget, 'foo');
```

Example usage of `FooOutlet`, where the widget will only be rendered when the route registered against outlet `foo` is matched.

```ts
class App extends WidgetBase {
	protected render(): DNode {
		return v('div', [
			w(FooOutlet, {})
		]);
	}
}
```

#### Outlet Component Types

When registering an outlet a different widget can be configure for each `MatchType` of a route:

| Type              | Description |
| ----------------- | ---------------------------------------------------- |
|`MatchType.INDEX`  | This is an exact match for the registered route. E.g. Navigating to `foo/bar` with a registered route `foo/bar`.   |
|`MatchType.PARTIAL`| Any match other than an exact match, for example `foo/bar` would partially match `foo/bar/qux` but only if `foo/bar/qux` was also a registered route. Otherwise it would be an `ERROR` match. |
|`MatchType.ERROR`  | When a partial match occurs but there is no match for the next section of the route. |

To register a different widget for a specific `MatchType` use a `OutletComponents` object can be passed in place of the widget that specifies each of the components to be used per `MatchType`.

```ts
import { MyViewWidget, MyErrorWidget } from './MyWidgets';

const fooWidgets: OutletComponents = {
	main: MyViewWidget,
	error: MyErrorWidget
};

const FooOutlet = Outlet(fooWidgets, 'foo');
```

It is important to note that a widget registered against `MatchType.ERROR` will not be used if the outlet also has a widget registered for `MatchType.INDEX`

#### Map Params

When a widget is configured for an outlet it is possible to provide a callback function that is used to inject properties that will be available during render lifecycle of the widget.

```
mapParams(type: MatchType, location: string, params: {[key: string]: any}, router: Router<any>)
```


| Argument | Description                                                            |
| -------- | ---------------------------------------------------------------------- |
| type     | The `MatchType` that caused the outlet to render                        |
| location | The location of the route that was matched                             |
| params   | Key/Value object of the params that were parsed from the matched route |
| router   | The router instance that can be used to provide functions that go to other routes/outlets|

The following example uses `mapParams` to inject an `onClose` function that will go to the route registered against the `other-outlet` route and `id` property extracted from `params` in the `MyViewWidget` properties:

```ts
const FooOutlet = Outlet(MyViewWidget, 'foo', (options: MapParamsOptions) {
	const { type, location, params, router } = options;

	return {
		onClose() {
			// This creates a link for another outlet and sets the path
			router.setPath(route.link('other-outlet'));
		},
		id: params.id
	}
});
```


When there are multiple matching outlets, the callback function receives all matching parameters merged into a single object.

##### Global Error Outlet

Whenever a `MatchType.ERROR` occurs a global outlet is automatically added to the matched outlets called `errorOutlet`. This outlet can be used to render a widget for any unknown routes.

```ts
const ErrorOutlet = Outlet(ErrorWidget, 'errorOutlet');
```

#### Route Registration

Routes are registered using `RouteConfig`, which defines a route's `path`, the associated `outlet` and nested child `RouteConfig`s. The full routes are recursively constructed from the nested route structure.

Example routing configuration:

```ts
const config: RouteConfig[] = [
	{
		path: 'foo',
		outlet: 'root',
		children: [
			{
				path: 'bar',
				outlet: 'bar'
			},
			{
				path: 'baz',
				children: [
					{
						path: 'qux'
					}
				]
			}
		]
	}
]
```

That would register the following routes and outlets:

| Route        | Outlet |
| ------------ | ------ |
|`/foo`        | `root` |
|`/foo/bar`    | `bar`  |
|`/foo/baz`    | `baz`  |
|`/foo/baz/qux`| `qux`  |

**Note:** If an `outlet` is not explicitly specified the `path` will be used.

To actually register the configuration with a Dojo 2 router, simply pass the `config` object in the `constructor` options:

```ts
const router = new Router({ config });
```

For routes that have either path parameters or query parameters, it is possible to specify default parameters. These parameters are used as a fallback when generating a link from an outlet without specifying parameters, or when parameters do not exist in the current route.

```ts
const config = [
	{
		path: 'foo/{foo}',
		outlet: 'foo',
		defaultParams: {
			foo: 'bar'
		}
	}
];

// Using router.link to generate a link for an outlet 'foo'; will use the default 'bar' value
router.link('foo')
```

A default route can be specified using the optional configuration property `defaultRoute`, which will be used if the current route does not match a registered route. Note there can only be one default route configured otherwise an error will be thrown.

In the case that multiple outlets match, for example where a nested path has an exact match, and a parent path has a partial match, the deepest registered outlet is returned.

#### Registering Additional Routes

Additional routing configuration can be registered with a router instance, either from the root or by specifying an existing outlet name.

```ts
const additionalRouteConfig = [
	{
		path: 'extra',
		outlet: 'extra'
	}
];

// Will register the extra routes from the route
router.register(additionalRouteConfig);

// Will register the extra routes from `foo` outlet
router.register(additionalRouteConfig, 'foo');
```

If the outlet is not found then an error is thrown.

#### Router Context Injection

To make the `router` instance available to the created outlets and other routing components (such as [`Link`](#link)), Routing leverages a Dojo 2 widget-core concept of [Injecting State](https://github.com/dojo/widget-core/blob/master/README.md#injecting-state). The custom injector `RouterInjector` needs to be defined in a `registry` available to the components for an known `key`.

All routing components by default use the exported `RouterInjector#routerKey` as the key for the injected `router` context.

```ts
import { registry } from '@dojo/widget-core/d'
import { RouterInjector, routerKey } from '@dojo/routing/RouterInjector';

registry.define(routerKey, Injector(RouterInjector, router));
```

The `RouterInjector` module exports a helper function, `registerRouterInjector`,  that combines the instantiation of a `Router` instance, registering route configuration and defining the `RouterInjector`. The `router` instance is returned.

```ts
import { registerRouterInjector } from '@dojo/routing/RoutingInjector';

const router = registerRouterInjector(config);
```

The defaults can be overridden using the `registry`, `history` and `key` arguments:

```ts
import { WidgetRegistry } from '@dojo/widget-core';
import { registerRouterInjector } from '@dojo/routing/RoutingInjector';
import MemoryHistory from './history/MemoryHistory';

const customRegistry = new WidgetRegistry();
const history = new MemoryHistory();

const router = registerRouterInjector(config, customRegistry, history, 'custom-router-key');
```

The final thing to do is call `router.start()` to start the `router` instance.

#### Link Component

The `Link` component is a wrapper around an `a` DOM element that enables consumers to specify an `outlet` to create a link to. It is also possible to use a static route by setting the `isOutlet` property to `false`.

If the generated link requires specific path or query parameters that are not in the route then they can be passed via the `params` property.

```ts
import { Link } from '@dojo/routing/Link';

render() {
	return v('div', [
		w(Link, { to: 'foo', params: { foo: 'bar' }}, [ 'Link Text' ]),
		w(Link, { to: '#/static-route', isOutlet: false, [ 'Other Link Text' ])
	]);
}
```

All the standard `VirtualDomProperties` are available for the `Link` component as they would be creating an `a` DOM Element using `v()` with `@dojo/widget-core`.

#### Sample Routing Application

```ts
// main.ts
import { registerRouterInjector } from '@dojo/routing/RouterInjector';
import { RouteConfig } from '@dojo/routing/interfaces';
import { ProjectorMixin } from '@dojo/widget-core/mixins/Projector';

import { App } from './App';

const config = [
	{
		path: '/',
		outlet: 'home'
	},
	{
		path: 'profiles',
		outlet: 'profiles',
		children: [
			{
				path: '{profile}',
				outlet: 'profile'
			}
		]
	}
];

const router = registerRouterInjector(config);
const AppProjector = ProjectorMixin(App);
const projector = new AppProjector();

projector.append();
router.start();
```

```ts
// Home.ts
import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { DNode } from '@dojo/widget-core/interfaces';

export class Home extends WidgetBase {
	protected render(): DNode {
		return 'Home';
	}
}
```

```ts
import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { w, v } from '@dojo/widget-core/d';
import { DNode, WidgetProperties } from '@dojo/widget-core/interfaces';
import { Link } from '@dojo/routing/Link';

import { ProfileOutlet } from './ProfileOutlet';

export interface ProfilesProperties extends WidgetProperties {
	showHeader: boolean;
}

export class Profiles extends WidgetBase<ProfilesProperties> {
	protected render(): DNode {
		return [
			v('div', [
				w(Link, { to: 'profile', params: { profile: 'Tess' } }, [ 'Tess ']),
				w(Link, { to: 'profile', params: { profile: 'Jess' } }, [ 'Jess ']),
				w(Link, { to: 'profile', params: { profile: 'Bess' } }, [ 'Bess '])
			]),
			v('div', [
				this.properties.showHeader ? 'Please select a profile' : null,
				w(ProfileOutlet, {})
			])
		];
	}
}
```

```ts
// Profile.ts
import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { DNode, WidgetProperties } from '@dojo/widget-core/interfaces';

export interface ProfileProperties extends WidgetProperties {
	name: string;
}

export class Profile extends WidgetBase<ProfileProperties> {
	protected render(): DNode {
		return `Hello, ${this.properties.name}`;
	}
}
```

```ts
// HomeOutlet.ts
import { Outlet } from '@dojo/routing/Outlet';

import { Home } from './Home';

export const HomeOutlet = Outlet(Home, 'home');
```

```ts
// ProfilesOutlet.ts
import { Outlet } from '@dojo/routing/Outlet';
import { MatchType } from '@dojo/routing/Route';

import { Profiles } from './Profiles';

export const ProfilesOutlet = Outlet(Profiles, 'profiles', ({ type }: MapParamsOptions) => {
	return { showHeader: type === MatchType.INDEX };
});
```

```ts
// ProfileOutlet.ts
import { Outlet } from '@dojo/routing/Outlet';

import { Profile } from './Profile';

export const ProfileOutlet = Outlet(Profile, 'profile', ({ params }: MapParamsOptions) => {
	return { name: params.profile };
});
```

```ts
// App.ts
import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { w, v } from '@dojo/widget-core/d';
import { DNode } from '@dojo/widget-core/interfaces';
import { Link } from '@dojo/routing/Link';

import { ProfileOutlet } from './ProfileOutlet';
import { HomeOutlet } from './HomeOutlet';

export class App extends WidgetBase {
	protected render(): DNode {
		return [
			v('div', [
				v('ul', [
					v('li', [
						w(Link, { to: 'home' }, [ 'Home'])
					]),
					v('li', [
						w(Link, { to: 'profiles' }, [ 'Profiles'])
					])
				])
			]),
			w(HomeOutlet, {}),
			w(ProfilesOutlet, {})
		];
	}
}
```

**More examples are located in the examples directory.**

## How do I contribute?

We appreciate your interest!  Please see the [Dojo 2 Meta Repository](https://github.com/dojo/meta#readme) for the Contributing Guidelines.

### Code Style

This repository uses [`prettier`](https://prettier.io/) for code styling rules and formatting. A pre-commit hook is installed automatically and configured to run `prettier` against all staged files as per the configuration in the projects `package.json`.

An additional npm script to run `prettier` (with write set to `true`) against all `src` and `test` project files is available by running:

```bash
npm run prettier
```

### Installation

To start working with this package, clone the repository and run `npm install`.

In order to build the project run `grunt dev` or `grunt dist`.

### Testing

Test cases MUST be written using [Intern](https://theintern.github.io) using the Object test interface and Assert assertion interface.

90% branch coverage MUST be provided for all code submitted to this repository, as reported by istanbul’s combined coverage results for all supported platforms.

To test locally in node run:

`grunt test`

To test against browsers with a local selenium server run:

`grunt test:local`

To test against BrowserStack or Sauce Labs run:

`grunt test:browserstack`

or

`grunt test:saucelabs`

## Licensing information

© 2004–2017 [JS Foundation](https://js.foundation/) & contributors. [New BSD](http://opensource.org/licenses/BSD-3-Clause) license.
