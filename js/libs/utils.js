export function bufferToStream(arrayBuffer) {
	return new ReadableStream({
		start(controller) {
			controller.enqueue(arrayBuffer);
			controller.close();
		}
	});
}

export function downloadArrayBuffer(arrayBuffer, fileName) {
	const blob = new Blob([arrayBuffer]);
	downloadBlob(blob, fileName);
}
export function downloadBlob(blob, fileName = "download.x"){
	const blobUrl = window.URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = blobUrl;
	link.setAttribute('download', fileName);
	link.click();
	window.URL.revokeObjectURL(blobUrl);
}

export async function streamToBlob(stream, type) {
	const reader = stream.getReader();
	let done = false;
	const data = [];

	while (!done) {
		const result = await reader.read();
		done = result.done;
		if (result.value) {
			data.push(result.value);
		}
	}

	return new Blob(data, { type });
}

export function unixTimestampToDate(timestamp){
	return new Date(timestamp * 1000);
}

export function readString(dataView, offset, length) {
	const str = [];
	for (let i = 0; i < length; i++) {
		str.push(String.fromCharCode(dataView.getUint8(offset + i)));
	}
	return str.join("");
}

export function readTerminatedString(dataView, offset) {
	const str = [];
	let val;
	let i = 0;

	while (val != 0) {
		val = dataView.getUint8(offset + i);
		if (val != 0) {
			str.push(String.fromCharCode(val));
		}
		i++
	}
	return str.join("");
}

export function readBytes(dataView, offset, length) {
	const bytes = [];
	for (let i = 0; i < length; i++) {
		bytes.push(dataView.getUint8(offset + i));
	}
	return bytes;
}

export function readFlags(dataView, offset, flagLabels) {
	const flags = {};

	for (let i = 0; i < flagLabels.length; i++) {
		const byte = dataView.getUint8(offset + Math.min(i / 8));
		flags[flagLabels[i]] = (((1 << i) & byte) >> i) === 1;
	}

	return flags;
}