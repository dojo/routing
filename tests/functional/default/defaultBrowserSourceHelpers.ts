export function replacePath(previous: string, next: string): string {
	return location.href.replace(location.origin, '').replace(previous, next);
}
