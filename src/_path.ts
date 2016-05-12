import UrlSearchParams from 'dojo-core/UrlSearchParams';

interface ParsedPath {
	/**
	 * Parameters extracted from the search component.
	 */
	searchParams: UrlSearchParams;

	/**
	 * Pathname segments.
	 */
	segments: string[];

	/**
	 * Whether the pathname ended with a trailing slash.
	 */
	trailingSlash: boolean;
}

/**
 * Parses a path
 * @param path The path to parse.
 * @return The search params, pathname segments, and whether it ended with a trailing slash.
 */
export function parse (path: string): ParsedPath {
	const tokens: string[] = path.split(/([/?#])/).filter(Boolean);

	let pathnameTokens = tokens;
	let searchParams: UrlSearchParams = null;

	const searchStart = tokens.indexOf('?');
	const hashStart = tokens.indexOf('#');
	if (searchStart >= 0) {
		if (hashStart >= 0) {
			// Either `/foo?bar#baz` or `/foo#bar?baz`
			pathnameTokens = tokens.slice(0, Math.min(searchStart, hashStart));
			searchParams = new UrlSearchParams(tokens.slice(searchStart + 1, hashStart).join(''));
		}
		else {
			// `/foo?bar`
			pathnameTokens = tokens.slice(0, searchStart);
			searchParams = new UrlSearchParams(tokens.slice(searchStart + 1).join(''));
		}
	}
	else {
		searchParams = new UrlSearchParams();
		if (hashStart >= 0) {
			// `/foo#bar`
			pathnameTokens = tokens.slice(0, hashStart);
		}
	}

	const segments = pathnameTokens.filter(t => t !== '/');
	const trailingSlash = pathnameTokens[pathnameTokens.length - 1] === '/' && segments.length > 0;

	return {
		searchParams,
		segments,
		trailingSlash
	};
}

interface MatchResult {
	/**
	 * Whether there are remaining segments that weren't matched.
	 */
	hasRemaining: boolean;

	/**
	 * Whether the leading segments matched.
	 */
	isMatch: boolean;

	/**
	 * Position in the segments array that the remaining unmatched segments start.
	 */
	offset?: number;

	/**
	 * Values for named segments.
	 */
	values?: string[];
}

/**
 * Determines whether a DeconstructedPath is a (partial) match for given pathname segments.
 * @param expectedSegments Part of a DeconstructedPath object.
 * @param segments Pathname segments as returned by `parse()`
 * @return A result object.
 */
export function match ({ expectedSegments }: DeconstructedPath, segments: string[]): MatchResult {
	if (expectedSegments.length === 0) {
		return {
			hasRemaining: segments.length > 0,
			isMatch: true,
			offset: 0
		};
	}

	if (expectedSegments.length > segments.length) {
		return {
			hasRemaining: false,
			isMatch: false
		};
	}

	let isMatch = true;
	const values: string[] = [];
	for (let i = 0; isMatch && i < expectedSegments.length; i++) {
		const value = segments[i];
		const expected = expectedSegments[i];
		if (isNamedSegment(expected)) {
			values.push(value);
		}
		else if (expected.literal !== value) {
			isMatch = false;
		}
	}

	return {
		hasRemaining: expectedSegments.length < segments.length,
		isMatch,
		offset: expectedSegments.length,
		values
	};
}

interface LiteralSegment {
	literal: string;
}

interface NamedSegment {
	name: string;
}

type Segment = LiteralSegment | NamedSegment;

function isNamedSegment(segment: Segment): segment is NamedSegment {
	return (<NamedSegment> segment).name !== undefined;
}

/**
 * Describes a route path, broken down into its constituent parts.
 */
export interface DeconstructedPath {
	/**
	 * Segments (literal and named) that are expected to be present when matching paths.
	 */
	expectedSegments: Segment[];

	/**
	 * Named path parameters, in the order that they occurred in the path.
	 */
	parameters: string[];

	/**
	 * Named query parameters, in the order that they occurred in the path.
	 */
	searchParameters: string[];

	/**
	 * Whether the pathname ended with a trailing slash.
	 */
	trailingSlash: boolean;
}

/**
 * Deconstruct a route path into its constituent parts.
 * @param path The path to deconstruct.
 * @return An object describing the path's constituent parts.
 */
export function deconstruct (path: string): DeconstructedPath {
	const expectedSegments: Segment[] = [];
	const parameters: string[] = [];
	const searchParameters: string[] = [];
	let trailingSlash = false;

	const tokens = path.split(/([/{}?&])/).filter(Boolean);

	let i = 0;
	const consume = () => tokens[i++];
	const peek = () => tokens[i];

	let inSearchComponent = false;
	while (i < tokens.length) {
		const t = consume();

		switch (t) {
			case '{': {
				const name = consume();
				if (!name || name === '}') {
					throw new TypeError('Parameter must have a name');
				}
				// Reserve : for future use, e.g. including type data in the parameter declaration.
				if (name === '{' || name === '&' || /:/.test(name)) {
					throw new TypeError('Parameter name must not contain \'{\', \'&\' or \':\'');
				}
				if (parameters.indexOf(name) !== -1 || searchParameters.indexOf(name) !== -1) {
					throw new TypeError(`Parameter must have a unique name, got '${name}'`);
				}

				const closing = consume();
				if (!closing || closing !== '}') {
					throw new TypeError(`Parameter name must be followed by '}', got '${closing}'`);
				}

				const separator = peek();
				if (separator) {
					if (inSearchComponent) {
						if (separator !== '&') {
							throw new TypeError(`Search parameter must be followed by '&', got '${separator}'`);
						}
					}
					else if (separator !== '/' && separator !== '?') {
						throw new TypeError(`Parameter must be followed by '/' or '?', got '${separator}'`);
					}
				}

				if (inSearchComponent) {
					searchParameters.push(name);
				} else {
					parameters.push(name);
					expectedSegments.push({ name });
				}

				break;
			}

			case '?':
			case '/':
				if (inSearchComponent) {
					throw new TypeError(`Expected parameter in search component, got '${t}'`);
				}

				if (t === '?') {
					inSearchComponent = true;
				}

				if (t === '/') {
					const next = peek();
					if (next === '/') {
						throw new TypeError('Path segment must not be empty');
					}
					if (expectedSegments.length > 0 && (!next || next === '?')) {
						trailingSlash = true;
					}
				}

				break;

			case '&':
				if (!inSearchComponent) {
					throw new TypeError('Path segment must not contain \'&\'');
				}

				const next = peek();
				if (next === '&') {
					throw new TypeError('Expected parameter in search component, got \'&\'');
				}

				break;

			default:
				if (inSearchComponent) {
					throw new TypeError(`Expected parameter in search component, got '${t}'`);
				}

				expectedSegments.push({ literal: t });
		}
	}

	return { expectedSegments, parameters, searchParameters, trailingSlash };
}
