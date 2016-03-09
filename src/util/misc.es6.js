function extractExpression(fn) {
	console.log(fn.toString());
	let match = fn.toString().match(/function\s*\(.*?\)\s*\{\s*return\s*(.*?)\s*?;\s*\}/);
	if (!match) { match = fn.toString().match(/function\s*\(.*?\)\s*\{\s*(.*?)\s*\}/) }
	if (!match) { return null }
	return match[1];
}

export function assert(a) {
	let result;
	try {
		result = a();
	} catch (e) {
		throw new Error(`Error while evaluating assertion "${extractExpression(a)}"!\n${event}`);
	}
	if (!result) {
		throw new Error(`Assertion "${extractExpression(a)}" failed!`);
	}
}

export function def(object, field, defaultValue) {
	if (typeof object[field] === 'undefined') {
		object[field] = defaultValue;
	}
	return object[field];
}

export const a = (object, field) => def(object, field, []);
export const o = (object, field) => def(object, field, {});

export function last(A) {
	return A[A.length-1];
}

export function or(...values) {
	for (let value of values) {
		if (typeof value !== 'undefined') {
			return value;
		}
	}
}

export function withoutDuplicates(arr) {
	return [...new Set(arr)];
}

export function chainIsDefined(obj, key0, ...otherKeys) {
	if (typeof key0 === 'undefined') { return true }
	return !!(key0 in obj) && chainIsDefined(obj[key0], ...otherKeys);
}

let uniqueCounter = 0;
export function uniqueId(prefix) {
	return `${prefix}${++uniqueCounter}`;
}

export const inputChecked = ({target: {checked: v}}) => v;
export const inputValue   = ({target: {value:   v}}) => v;

export const noWhitespaceBetweenTags = (strings, ...values) => {
	let N = strings.length;
	strings = [...strings];
	strings[0] = strings[0].replace(/^\s+(<\w+)/, '$1');
	for (let i = 0; i < N; ++i) {
		strings[i] = strings[i].replace(/(>)\s+(<\/?\w+)/g, '$1$2');
	}
	strings[N-1] = strings[N-1].replace(/(>)\s+$/, '$1');
	let result = [strings[0]];
	for (let i = 0; i < values.length; ++i) {
		result.push(values[i], strings[i+1]);
	}
	return result.join('');
};

export const sw = (val) => (map) => ( (val in map) ? map[val] : map.default );
