import { bufferToStream, streamToBlob, unixTimestampToDate, readBytes, readString, readTerminatedString, readFlags } from "./utils.js";

export class GZip {
	#dataView;
	#index = 0;
	#crc16;

	header;
	fileName;
	comment;

	constructor(arrayBuffer) {
		this.#dataView = new DataView(arrayBuffer);
		this.read();
	}
	read(){
		this.header = {
			signature: readString(this.#dataView, 0, 2), //should be xf8b
			compressionMethod: this.#dataView.getUint8(1), //should be 0x08
			flags: readFlags(this.#dataView, 3, ["ftext", "fhcrc", "fextra", "fname", "fcomment", "reserved1", "reserved2", "reserved3"]), //need to figure out if we read extra data in stream
			modificationTime: unixTimestampToDate(this.#dataView.getUint32(4, true)),
			extraFlags: this.#dataView.getUint8(8), //not important but is either 2 (best compression) or 4 (fast)
			os: this.#dataView.getUint8(9), //not useful but usually 0 on windows, 3 Unix, 7 mac
		};
		this.#index = 10;

		if(this.header.flags.fextra){
			const extraLength = this.#dataView.getUint16(this.#index, true);
			this.extra = readBytes(this.#dataView, this.#index + 2, extraLength);
			this.#index += extraLength + 2;
		} else {
			this.extra = [];
		}

		if(this.header.flags.fname){
			this.fileName = readTerminatedString(this.#dataView, this.#index);
			this.#index += this.fileName.length + 1; //+1 for null terminator
		} else {
			this.fileName = "";
		}

		if(this.header.flags.fcomment){
			this.comment = readTerminatedString(this.#dataView, this.#index);
			this.#index += this.comment.length + 1; //+1 for null terminator
		} else {
			this.comment = "";
		}

		if(this.header.flags.fhcrc){
			this.#crc16 = this.#dataView.getUint16(this.#index, true);
			this.#index += 2;
		} else {
			this.#crc16 = null;
		}
		
		//footer
		this.footer = {
			crc: this.#dataView.getUint32(this.#dataView.byteLength - 8, true),
			uncompressedSize: this.#dataView.getUint32(this.#dataView.byteLength - 4, true),
		}
	}
	extract(){
		//If you don't care about the file data just do this:
		//return streamToBlob(bufferToStream(this.#dataView.buffer).pipeThrough(new DecompressionStream("gzip")));
		//Otherwise slice where the data starts to the last 8 bytes
		return streamToBlob(bufferToStream(this.#dataView.buffer.slice(this.#index, this.#dataView.byteLength - 8)).pipeThrough(new DecompressionStream("deflate-raw")));
	}
}