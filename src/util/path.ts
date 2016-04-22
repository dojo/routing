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

function tokenize (path: string): string[] {
	const tokens: string[] = path.split(/([/:?#])/).filter(Boolean);

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
	const tokens = tokenize(path);
	const segments: string[] = [];
	let last = -1;

	for (const t of tokens) {
		if (t === '/') {
			continue;
		}

		if (segments[last] === ':') {
			segments[last] += t;
		}
		else {
			last = segments.push(t);
		}
	}

	return segments;
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
	const tokens = tokenize(path);
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
				throw new Error('Expecting param to have a name');
			}
			if (next && next !== '/') {
				throw new Error(`Expecting param to be followed by /, got '${next}'`);
			}

			parameters.push(name);
			expectedSegments.push({ name });
		}
		else if (!next || next === '/') {
			expectedSegments.push({ value });
		}
	}

	return { parameters, expectedSegments };
}
