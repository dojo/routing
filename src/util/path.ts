export interface Segment {
	value?: string;
	name?: string;
}

export interface LiteralSegment extends Segment {
	value: string;
}

export interface NamedSegment extends Segment {
	name: string;
}

export interface DeconstructedPath {
	parameters: string[];
	expectedSegments: Segment[];
}

export interface MatchResult {
	isMatch: boolean;
	hasRemaining: boolean;
	offset: number;
	values: string[];
}

function tokenizeParameterizedPathname (pathname: string): string[] {
	const tokens: string[] = pathname.split(/([/:])/).filter(Boolean);
	return tokens[0] === '/' ? tokens.slice(1) : tokens;
}

function tokenizePath (path: string): string[] {
	const tokens: string[] = path.split(/([/?#])/).filter(Boolean);

	const queryStart = tokens.indexOf('?');
	const hashStart = tokens.indexOf('#');

	let end = tokens.length;
	if (queryStart >= 0) {
		if (hashStart >= 0) {
			end = Math.min(queryStart, hashStart);
		}
		else {
			end = queryStart;
		}
	}
	else if (hashStart >= 0) {
		end = hashStart;
	}

	const segmentStart = tokens[0] === '/' ? 1 : 0;
	return tokens.slice(segmentStart, end);
}

export function getSegments (path: string): string[] {
	return tokenizePath(path).filter(t => t !== '/');
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
		const { value: expected, name } = expectedSegments[i];
		if (name) {
			values.push(value);
		} else if (value !== expected) {
			isMatch = false;
		}
	}

	return { isMatch, hasRemaining, offset, values };
}

export function deconstruct (path: string): DeconstructedPath {
	const tokens = tokenizeParameterizedPathname(path);
	const parameters: string[] = [];
	const expectedSegments: Segment[] = [];

	let i = 0;
	while (i < tokens.length) {
		const value = tokens[i++];
		let next = tokens[i++];

		if (value === ':') {
			const name = next;
			next = tokens[i++];
			if (!name || name === ':' || name === '/') {
				throw new TypeError('Expecting param to have a name');
			}
			if (next && next !== '/') {
				throw new TypeError(`Expecting param to be followed by /, got '${next}'`);
			}
			if (parameters.indexOf(name) !== -1) {
				throw new Error(`Expecting param to have a unique name, got '${name}'`);
			}

			parameters.push(name);
			expectedSegments.push({ name });
		}
		else {
			expectedSegments.push({ value });
		}
	}

	return { parameters, expectedSegments };
}
