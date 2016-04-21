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

export interface PathSegments {
	names: string[];
	segments: Segment[];
}

export interface MatchResult {
	matched: boolean;
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

export function match (segments: PathSegments, path: string): MatchResult {
	let matched = true;
	let values: string[] = [];

	// FIXME: Tokenizing the path here isn't very useful when matching a hierarchy.
	const tokens = tokenize(path).filter(t => t !== '/');
	for (let i = 0; matched && i < tokens.length; i++) {
		if (i === segments.segments.length) {
			matched = false;
		}
		else {
			const value = tokens[i];
			const { value: expected, name } = segments.segments[i];
			if (name) {
				values.push(value);
			}
			else if (value !== expected) {
				matched = false;
			}
		}
	}

	return { matched, values };
}

export function parse (path: string): PathSegments {
	const tokens = tokenize(path);
	const names: string[] = [];
	const segments: Segment[] = [];

	let i = 0;
	while (i < tokens.length) {
		const value = tokens[i++];
		let next = tokens[i++];

		if (value === ':') {
			const name = next;
			next = tokens[i++];
			if (!name) {
				throw new Error('Expecting param to have a name');
			}
			if (next && next !== '/') {
				throw new Error(`Expecting param to be followed by /, got '${next}'`);
			}

			names.push(name);
			segments.push({ name });
		}
		else if (!next || next === '/') {
			segments.push({ value });
		}
	}

	return { names, segments };
}
