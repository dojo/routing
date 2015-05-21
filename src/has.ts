import global from 'dojo-core/global';
import { add } from 'dojo-core/has';

add('history', 'history' in global);

export { add, cache, default } from 'dojo-core/has';
