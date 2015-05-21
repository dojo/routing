export default class PathRuleError implements Error {
	message: string;

	get name(): string {
		return 'PathRuleError';
	}

	constructor(message: string = '') {
		this.message = message;
	}
}
