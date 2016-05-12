import UrlSearchParams from 'dojo-core/UrlSearchParams';

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

interface MatchResult {
	isMatch: boolean;
	hasRemaining: boolean;
	offset: number;
	values: string[];
}

export interface DeconstructedPath {
	expectedSegments: Segment[];
	parameters: string[];
	searchParameters: string[];
	trailingSlash: boolean;
}

function tokenizeParameterizedPathname (pathname: string): string[] {
	return pathname.split(/([/{}?&])/).filter(Boolean);
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

	return {
		search,
		tokens: tokens.slice(0, end)
	};
}

export function getSegments (path: string): { searchParams: UrlSearchParams, segments: string[], trailingSlash: boolean } {
	const { search, tokens } = tokenizePath(path);
	const segments = tokens.filter(t => t !== '/');

	return {
		searchParams: new UrlSearchParams(search),
		segments,
		trailingSlash: tokens[tokens.length - 1] === '/' && segments.length > 0
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
		const expected = expectedSegments[i];
		if (isNamedSegment(expected)) {
			values.push(value);
		}
		else if (expected.literal !== value) {
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
					if (next === '/') {
						throw new TypeError('Path segment must not be empty');
					}
					if (!next || next === '?') {
						trailingSlash = expectedSegments.length > 0;
					}
				}

				break;

			case '&':
				if (!inSearchComponent) {
					throw new TypeError('Path segment must not contain \'&\'');
				}

				const next = tokens[i]; // peek next
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
