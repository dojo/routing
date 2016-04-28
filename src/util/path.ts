import UrlSearchParams from 'dojo-core/UrlSearchParams';

export interface Segment {
	literal?: string;
	name?: string;
}

export interface LiteralSegment extends Segment {
	literal: string;
}

export interface NamedSegment extends Segment {
	name: string;
}

export interface DeconstructedPath {
	expectedSegments: Segment[];
	parameters: string[];
	searchParameters: string[];
	trailingSlash: boolean;
}

export interface MatchResult {
	isMatch: boolean;
	hasRemaining: boolean;
	offset: number;
	values: string[];
}

function tokenizeParameterizedPathname (pathname: string): string[] {
	const tokens: string[] = pathname.split(/([/{}?&])/).filter(Boolean);
	return tokens[0] === '/' ? tokens.slice(1) : tokens;
}

function tokenizePath (path: string): { search: string, tokens: string[] } {
	const tokens: string[] = path.split(/([/?#])/).filter(Boolean);

	const searchStart = tokens.indexOf('?');
	const hashStart = tokens.indexOf('#');

	let end = tokens.length;
	let search = '';
	if (searchStart >= 0) {
		if (hashStart >= 0) {
			end = Math.min(searchStart, hashStart);
			search = tokens.slice(searchStart + 1, hashStart).join('');
		}
		else {
			end = searchStart;
			search = tokens.slice(searchStart + 1).join('');
		}
	}
	else if (hashStart >= 0) {
		end = hashStart;
	}

	const segmentStart = tokens[0] === '/' ? 1 : 0;
	return {
		search,
		tokens: tokens.slice(segmentStart, end)
	};
}

export function getSegments (path: string): { searchParams: UrlSearchParams, segments: string[], trailingSlash: boolean } {
	const { search, tokens } = tokenizePath(path);
	return {
		searchParams: new UrlSearchParams(search),
		segments: tokens.filter(t => t !== '/'),
		trailingSlash: tokens[tokens.length - 1] === '/'
	};
}

export function match ({ expectedSegments }: DeconstructedPath, segments: string[]): MatchResult {
	let isMatch = true;
	let hasRemaining = false;
	let offset = 0;
	let values: string[] = [];

	if (expectedSegments.length === 0) {
		hasRemaining = segments.length > 0;
		return { isMatch, hasRemaining, offset, values };
	}

	if (expectedSegments.length > segments.length) {
		isMatch = false;
		return { isMatch, hasRemaining, offset, values };
	}

	if (expectedSegments.length < segments.length) {
		hasRemaining = true;
		offset = expectedSegments.length;
	}

	for (let i = 0; isMatch && i < expectedSegments.length; i++) {
		const value = segments[i];
		const { literal, name } = expectedSegments[i];
		if (name) {
			values.push(value);
		}
		else if (literal !== value) {
			isMatch = false;
		}
	}

	return { isMatch, hasRemaining, offset, values };
}

export function deconstruct (path: string): DeconstructedPath {
	const tokens = tokenizeParameterizedPathname(path);
	const expectedSegments: Segment[] = [];
	const parameters: string[] = [];
	const searchParameters: string[] = [];
	let trailingSlash = false;

	let inSearchComponent = false;
	let i = 0;
	while (i < tokens.length) {
		const t = tokens[i++];

		switch (t) {
			case '{': {
				const name = tokens[i++]; // consume next
				if (!name || name === '}') {
					throw new TypeError('Parameter must have a name');
				}
				if (name === '{' || name === '&' || /:/.test(name)) {
					throw new TypeError('Parameter name must not contain \'{\', \'&\' or \':\'');
				}
				if (parameters.indexOf(name) !== -1) {
					throw new TypeError(`Parameter must have a unique name, got '${name}'`);
				}

				const closing = tokens[i++]; // consume next
				if (!closing || closing !== '}') {
					throw new TypeError(`Parameter name must be followed by '}', got '${closing}'`);
				}

				const separator = tokens[i]; // peek next
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
					const next = tokens[i]; // peek next
					if (!next || next === '?') {
						trailingSlash = true;
					}
				}

				break;

			case '&':
				if (!inSearchComponent) {
					throw new TypeError('Path segment must not contain \'&\'');
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
