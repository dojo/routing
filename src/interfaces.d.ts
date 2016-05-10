export interface Context {
	// TODO: Does specifiying an indexer make sense here?
}

export interface Parameters {
	// TODO: Does specifying an indexer make sense here?
}

export interface Request<PP extends Parameters> {
	context: Context;
	params: PP;
}
