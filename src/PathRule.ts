import PathRuleError from './errors/PathRuleError';
import { NavigationArgs } from './routing';
import { escapeRegExp } from 'dojo-core/string';

const afterPattern = /\\}/g;
const beforePattern = /\\{/g;
const partPattern = /\(([^\)]+)\)/g;
const pathSeparatorPattern = /\/+/g;
const validPathPatternString = '[a-z\\d\\-\\._~:\\[\\]%@\!\$\'\\(\\)\\*\\+,;]+';

export default class PathRule {
	static join(...parts: string[]): string {
		return parts.map(function (part: string): string {
			return PathRule.normalizePath(part);
		}).join('/').replace(pathSeparatorPattern, '/');
	}

	static normalizePath(path: string): string {
		if (!path || path === '/') {
			return '/';
		}

		let normalized: string = path;

		if (normalized.charAt(0) === '/') {
			normalized = normalized.slice(1);
		}

		if (normalized.charAt(normalized.length - 1) !== '/') {
			normalized += '/';
		}

		return normalized;
	}

	protected _normalizePath: (path: string) => string;
	protected _parameters: { [key: string]: string };
	protected _parameterCount: number;
	protected _path: string;
	protected _rule: RegExp;

	/**
	 * Creates a new PathRule instance.
	 *
	 * PathRule accepts either a raw URL path (e.g., "/some/path") or a parameterized path in which
	 * each parameter is in the format `{name}` (e.g., "/some/{path}"). PathRule parses its path and
	 * exposes methods that can be used to determine whether another path matches the original template.
	 *
	 * Since the rule object is inherently tied to its path, each PathRule can only have one rule.
	 * If the rule needs to change, then a new instance should be created.
	 *
	 * @constructor
	 * @param path Either a raw path or a parameterized path.
	 */
	constructor(path: string) {
		if (!path.length) {
			throw new PathRuleError('PathRule expects a non-empty path.');
		}

		this._normalizePath = (<any> this.constructor).normalizePath;
		this._path = this._normalizePath(path);
		this._parameterize();
	}

	/**
	 * Converts a path into both a regular expression and an object of replaceable properties.
	 */
	private _parameterize(): void {
		const added = Object.create(null);
		const params = Object.create(null);

		let index: number = 0;
		const regExpString = escapeRegExp(this._path)
			.replace(beforePattern, '(')
			.replace(afterPattern, ')')
			.replace(partPattern, function (matched: string, name: string): string {
				if (name in added) {
					throw new PathRuleError('PathRule path parameter names must be unique.');
				}

				added[name] = 1;
				params[index++] = name;

				// TODO: Should we allow for custom RegExp patterns in `name`?
				// For example, `{name:\\d+}`
				return '(' + validPathPatternString + ')';
			});

		this._parameters = params;
		this._parameterCount = index;
		this._rule = new RegExp('^' + regExpString);
	}

	/**
	 * Attempts to generate a path that matches the template path from an object of parameters.
	 *
	 * If the template path is a raw URL path with no parameters, then that raw path is returned.
	 * For example, `new PathRule('/some/path').createPath({}); // '/some/path'`
	 * Otherwise, the parameters in the passed-in object are mapped to their counterparts on the
	 * template string. For example,
	 * `new PathRule('/some/{path}').createPath({ path: 'path' }); // '/some/path'`
	 *
	 * Note that all parameters present on the template must be included in the passed-in object,
	 * otherwise an error is thrown.
	 *
	 * @param kwArgs A key-value object of parameters.
	 * @returns The built path.
	 */
	createPath(kwArgs: NavigationArgs): string {
		const parameters = this._parameters;

		if (kwArgs.path) {
			return this._normalizePath(kwArgs.path);
		}
		else if (!this._parameterCount) {
			return this._path;
		}

		const state = kwArgs.state;
		return Object.keys(parameters).reduce(function (path: string, index: string): string {
			const parameter: string = parameters[index];
			const value: string = (<any> state)[parameter];

			if (!value) {
				throw new PathRuleError('The object passed to PathRoute#createPath is missing a value for "' +
					parameter + '".');
			}

			return path.replace('{' + parameter + '}', value);
		}, this._path);
	}

	/**
	 * Removes the portion representing the template path from the start of the passed-in path.
	 * Note that the returned value always begins with "/".
	 *
	 * This allows different rules to be tested sequentially from a single path. For example,
	 * `new PathRule('/some/{path}').getChildRoute('/some/path/child'); // '/child'`.
	 *
	 * If the provided path does not begin with the template, then it is assumed to be relative
	 * to the end of the template and returned as is. For example,
	 * `new PathRule('/some/path').getChildRoute('/other/path'); // '/other/path'`.
	 *
	 * @param path The URL path.
	 * @returns The child path.
	 */
	getChildPath(path: string): string {
		const normalized = this._normalizePath(path);
		let childPath: string;

		if (this._parameterCount === 0) {
			childPath = (normalized.indexOf(this._path) === 0) ? normalized.slice(this._path.length) : normalized;
		}
		else {
			childPath = normalized.replace(this._rule, '');
		}

		return this._normalizePath(childPath);
	}

	/**
	 * Converts a string path into a NavigationArgs object, using the rule's path as a template.
	 *
	 * Example: `new PathRule('/some/{path}').parsePath('/some/path'); // { path: 'path' }`
	 *
	 * @param path The path to convert.
	 * @return A key-value object that matches the rule's parameter names.
	 */
	parsePath(path: string): NavigationArgs {
		if (!path) {
			throw new PathRuleError('PathRule#parsePath requires a non-empty path.');
		}

		const normalized = this._normalizePath(path);

		if (!this.test(normalized)) {
			return null;
		}

		const args: NavigationArgs = Object.create(null, {
			path: {
				enumerable: true,
				value: normalized
			},
			rest: {
				enumerable: true,
				value: this.getChildPath(normalized)
			},
			state: {
				enumerable: true,
				value: Object.create(null)
			}
		});

		if (!this._parameterCount) {
			return args;
		}

		const parameters = this._parameters;
		const values = this._rule.exec(normalized);

		if (values) {
			const state = args.state;
			values.slice(1).forEach(function (value: string, i: number): void {
				const parameter: string = parameters[i];

				Object.defineProperty(state, parameter, {
					enumerable: true,
					value: value
				});
			});
		}

		return args;
	}

	/**
	 * Determines whether the provided path matches the rule.
	 *
	 * Examples:
	 * `new PathRule('/some/path').test('/some/path/child'); // true`
	 * `new PathRule('/some/{path}').test('/some/random/child'); // true`
	 * `new PathRule('/some/path').test('/some/random/child'); // false`
	 *
	 * @param path The path data.
	 * @returns Whether or not the provided path is a match for the template rule.
	 */
	test(path: string | NavigationArgs): boolean {
		const candidate: string = (typeof path === 'string') ? this._normalizePath(path) : path.rest;
		const rawPath = this._path;

		if (this._parameterCount === 0) {
			// If the provided path is a NavigationArgs object without a `rest` value, and
			// `this._path` has no parameters, then there is no way to determine whether the provided
			// parameters match `this._path`, so `false` is returned.
			return rawPath === '/' || (candidate ? candidate.indexOf(rawPath) === 0 : false);
		}
		else if (typeof candidate === 'string') {
			return this._rule.test(candidate);
		}

		const parameters = this._parameters;
		const state = (<NavigationArgs> path).state;
		return Object.keys(parameters).every(function (index: string): boolean {
			const parameter: string = parameters[index];

			return Boolean((<any> state)[parameter]);
		});
	}
}
