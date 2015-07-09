import { assign } from 'dojo-core/lang';
import { escapeRegExp } from 'dojo-core/string';
import PathError from './errors/PathError';
import { NavigationArgs } from './interfaces';

const afterPattern = /\\}/g;
const beforePattern = /\\{/g;
const partPattern = /\(([^\)]+)\)/g;
const pathSeparatorPattern = /\/+/g;
const validPathPatternString = '[a-z\\d\\-\\._~:\\[\\]%@\!\$\'\\(\\)\\*\\+,;]+';

function getNavigationArgPropertyDescriptor(value: any) {
	return { enumerable: true, value: value };
}

/**
 * Combines any number of path parts into a single, normalized path.
 */
export function joinPath(...parts: string[]): string {
	return parts.map(function (part: string): string {
		return normalizePath(part);
	}).join('/').replace(pathSeparatorPattern, '/');
}

/**
 * Combines any number of `NavigationArgs` objects into a new, single object, working from left to right.
 * The `state` objects are also combined into a single object, so that the final object contains
 * all of the properties from each `NavigationArgs` object.
 */
export function mergeRouteArgs(...argsArray: NavigationArgs[]): NavigationArgs {
	return argsArray.reduce(function (merged: NavigationArgs, args: NavigationArgs): NavigationArgs {
		return Object.keys(args).reduce(function (merged: NavigationArgs, key: string): NavigationArgs {
			if (key === 'state') {
				merged.state = merged.state || Object.create(null);
				assign(merged.state, args.state);
			}
			else {
				(<any> merged)[key] = (<any> args)[key];
			}

			return merged;
		}, merged);
	}, Object.create(null));
}

/**
 * Normalizes the specified path by stripping the leading "/" and adding a trailing "/".
 * If the path is an empty string or `null`, then "/" is returned.
 */
export function normalizePath(path: string): string {
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

/**
 * Converts a string path template into a regular expression that can be used to match and parse paths.
 */
export default class PathRule {
	protected _parameters: { [key: string]: string };
	protected _path: string;
	protected _rule: RegExp;

	/**
	 * The regular expression generated from the string path template.
	 */
	get rule(): RegExp {
		return this._rule;
	}

	/**
	 * Creates a new path rule.
	 *
	 * @param path The path template that will be used as the basis for testing other paths.
	 * @param matchAll Whether or not the path expression should match the beginning of paths (false)
	 * 		or should match paths exactly (true). Defaults to `false`.
	 */
	constructor(path: string, matchAll: boolean = false) {
		this._path = normalizePath(path);
		this._parameters = null;
		this._parameterize(matchAll);
	}

	private _parameterize(matchAll: boolean): void {
		const added = Object.create(null);
		const parameters = Object.create(null);
		let total = 0;

		if (this._path === '/') {
			this._rule = /\/$/;
			return;
		}

		const regExpString = escapeRegExp(this._path)
			.replace(beforePattern, '(')
			.replace(afterPattern, ')')
			.replace(partPattern, function (matched: string, name: string): string {
				if (name in added) {
					throw new PathError('Path parameter names must be unique.');
				}

				added[name] = 1;
				parameters[total++] = name;

				return '(' + validPathPatternString + ')';
			});

		this._rule = new RegExp('^' + regExpString + (matchAll ? '$' : ''), 'i');

		if (total > 0) {
			this._parameters = parameters;
		}
	}

	/**
	 * Removes the portion representing the template path from the start of the passed-in path.
	 *
	 * This allows different rules to be tested sequentially from a single path. For example,
	 * `new PathRule('some/{path}/').getChildRoute('some/path/child/'); // 'child/'`.
	 *
	 * If the provided path does not begin with the template, then it is assumed to be relative
	 * to the end of the template and returned as is. For example,
	 * `new PathRule('some/path/').getChildRoute('other/path/'); // 'other/path/'`.
	 *
	 * @param path The URL path.
	 * @returns The child path.
	 */
	getChildPath(path: string): string {
		const normalized = normalizePath(path);
		const childPath = normalized.length > 1 ? normalized.replace(this._rule, '') : normalized;

		return normalizePath(childPath);
	}

	/**
	 * Converts a string path into a NavigationArgs object, using the rule's path as a template.
	 *
	 * Example: `new PathRule('some/{path}/').parsePath('some/path/'); // { path: 'path' }`
	 *
	 * @param path The path to convert.
	 * @return A key-value object that matches the rule's parameter names.
	 */
	parsePath(path: string): NavigationArgs {
		const normalized = normalizePath(path);
		const values = this._rule.exec(normalized);
		let args: NavigationArgs = null;

		if (values) {
			const state = Object.create(null);
			args = Object.create(null, {
				matched: getNavigationArgPropertyDescriptor(normalized),
				state: getNavigationArgPropertyDescriptor(state)
			});

			const parameters = this._parameters;
			if (parameters) {
				values.slice(1).forEach(function (value: string, i: number): void {
					Object.defineProperty(state, parameters[i], getNavigationArgPropertyDescriptor(value));
				});
			}
		}

		return args;
	}
}
